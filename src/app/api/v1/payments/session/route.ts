import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { FeeService } from '@/lib/fees/fee-service'
import { nextNumber } from '@/lib/sequence'
import crypto from 'crypto'

/**
 * POST /api/v1/payments/session
 * Creates an authoritative online payment session / gateway order.
 * Payable amounts are recalculated strictly server-side from the database.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req)
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { invoiceId, feeScheduleId, studentId, currency = 'INR', retryOfPaymentId, previousPaymentId } = body

    if (currency && currency.toUpperCase() !== 'INR') {
      return Errors.validation(`Unsupported currency "${currency}". Only INR is supported.`)
    }

    if (!invoiceId && !feeScheduleId) {
      return Errors.validation('Either invoiceId or feeScheduleId is required to start a payment session')
    }

    const tenantId = session.tenantId

    // 1. Check for retry relationship to previous attempts
    const retryId = retryOfPaymentId || previousPaymentId
    let previousPayment: any = null
    if (retryId) {
      previousPayment = await db.payment.findFirst({
        where: { id: retryId, tenantId },
      })
    }

    // 2. Authoritative lookup of student & balance
    let targetStudentId = studentId
    let invoice: any = null
    let feeSchedule: any = null
    let payableCents = 0

    if (invoiceId) {
      invoice = await db.invoice.findFirst({
        where: { id: invoiceId, tenantId, deletedAt: null },
        include: { student: true, tenant: true },
      })
      if (!invoice) return Errors.notFound('Invoice')
      if (['CANCELLED', 'WRITTEN_OFF', 'PAID'].includes(invoice.status)) {
        return Errors.validation(`Cannot initiate payment on invoice with status ${invoice.status}`)
      }
      targetStudentId = invoice.studentId
      payableCents = Math.max(0, invoice.totalCents - invoice.paidCents)
    } else if (feeScheduleId) {
      feeSchedule = await db.studentFeeSchedule.findFirst({
        where: { id: feeScheduleId, tenantId },
        include: { student: true, feeItem: true },
      })
      if (!feeSchedule) return Errors.notFound('Fee Schedule')
      if (feeSchedule.status === 'PAID') {
        return Errors.validation('This fee schedule installment has already been paid in full')
      }
      targetStudentId = feeSchedule.studentId
      payableCents = feeSchedule.remainingAmountCents
    }

    if (payableCents <= 0) {
      return Errors.validation('No outstanding payable balance remaining on this record')
    }

    // 2. Validate Student & Parent Relationship
    if (session.role === 'PARENT') {
      const isLinked = await db.studentGuardian.findFirst({
        where: {
          studentId: targetStudentId,
          guardian: { userId: session.uid },
        },
      })
      if (!isLinked) {
        return Errors.forbidden('Access denied: You are not authorized to make payments for this student')
      }
    }

    const student = invoice?.student || feeSchedule?.student
    if (!student) return Errors.notFound('Student')

    // 3. Fetch Tenant Payment Gateway Configuration
    const gwConfig = await FeeService.getPaymentGatewayConfig(tenantId)
    if (!gwConfig.enabled) {
      return Errors.validation('Online payment gateway is currently disabled. Please contact school administration.')
    }

    // 4. Generate unique internal transaction reference
    const now = Date.now()
    const txRef = `TXN-${now}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const paymentNumber = await nextNumber('payment', tenantId)

    // 5. Server-side Order / Session ID creation
    let gatewayOrderId = `ord_${gwConfig.provider.toLowerCase()}_${now}`
    let checkoutMode = gwConfig.mode

    // If live/sandbox provider keys are configured, create real order with provider
    const secrets = await FeeService.getDecryptedGatewaySecrets(tenantId)
    if (secrets.provider === 'RAZORPAY' && secrets.keyId && secrets.keySecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString('base64')
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: payableCents,
            currency: 'INR',
            receipt: txRef,
            notes: {
              tenantId,
              studentId: targetStudentId,
              admissionNo: student.admissionNo,
              invoiceId: invoice?.id,
              feeScheduleId: feeSchedule?.id,
            },
          }),
        })

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json()
          gatewayOrderId = rzpData.id
        }
      } catch (err) {
        console.warn('Fallback to local order ID due to Razorpay order creation issue:', err)
      }
    } else if (secrets.provider === 'CASHFREE' && secrets.keyId && secrets.keySecret) {
      try {
        const isLive = (gwConfig.mode || 'SANDBOX').toUpperCase() === 'PRODUCTION' || (gwConfig.mode || 'SANDBOX').toUpperCase() === 'LIVE'
        const cfUrl = isLive ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders'
        const cfRes = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            'x-client-id': secrets.keyId,
            'x-client-secret': secrets.keySecret,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: txRef.replace(/[^a-zA-Z0-9_-]/g, '_'),
            order_amount: payableCents / 100,
            order_currency: 'INR',
            customer_details: {
              customer_id: student.admissionNo?.replace(/[^a-zA-Z0-9_-]/g, '_') || targetStudentId,
              customer_email: 'finance@preone.app',
              customer_phone: '9999999999',
            },
            order_meta: {
              return_url: `https://preone.app/api/v1/payments/verify?order_id={order_id}`,
            },
          }),
        })
        if (cfRes.ok) {
          const cfData = await cfRes.json()
          gatewayOrderId = cfData.payment_session_id || cfData.order_id || gatewayOrderId
        }
      } catch (err) {
        console.warn('Fallback to local order ID due to Cashfree order creation issue:', err)
      }
    } else if (secrets.provider === 'PAYU' && secrets.keyId && secrets.keySecret) {
      gatewayOrderId = `payu_${txRef.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    }

    // 6. Persist Payment attempt record with INITIATED / PENDING status and structured event timeline
    const timeline = [
      {
        previousStatus: null,
        newStatus: 'PENDING',
        event: 'INITIATED',
        source: 'API',
        at: new Date().toISOString(),
        by: session.name || session.uid,
        diagnostics: previousPayment
          ? `Retry attempt following previous attempt ${previousPayment.paymentNumber}`
          : 'Initial payment session creation',
      },
      {
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        event: 'ORDER_CREATED',
        source: 'API',
        provider: gwConfig.provider,
        orderId: gatewayOrderId,
        at: new Date().toISOString(),
      },
    ]

    const paymentRecord = await db.payment.create({
      data: {
        tenantId,
        invoiceId: invoice?.id || null,
        feeScheduleId: feeSchedule?.id || null,
        studentId: targetStudentId,
        paymentNumber,
        amountCents: payableCents,
        method: 'ONLINE',
        transactionRef: txRef,
        status: 'PENDING',
        receivedById: session.uid,
        notes: JSON.stringify({
          provider: gwConfig.provider,
          gatewayOrderId,
          checkoutMode,
          currency: 'INR',
          branchId: invoice?.branchId || student.branchId || null,
          retryOfPaymentId: previousPayment?.id || null,
          previousAttemptRef: previousPayment?.transactionRef || null,
          timeline,
        }),
      },
    })

    const school = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, phone: true },
    })

    return ok({
      paymentId: paymentRecord.id,
      transactionRef: txRef,
      paymentNumber,
      orderId: gatewayOrderId,
      keyId: gwConfig.keyId,
      provider: gwConfig.provider,
      mode: checkoutMode,
      amountCents: payableCents,
      amountRupees: (payableCents / 100).toFixed(2),
      currency: 'INR',
      studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
      admissionNo: student.admissionNo,
      schoolName: school?.name || 'PreOne Academy',
      invoiceNumber: invoice?.invoiceNumber || feeSchedule?.period || 'Fee Installment',
      supportedMethods: gwConfig.supportedMethods,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
