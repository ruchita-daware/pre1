import { withApi } from '@/lib/with-api'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'
import { FeeService } from '@/lib/fees/fee-service'
import { nextNumber } from '@/lib/sequence'
import crypto from 'crypto'

/**
 * POST /api/v1/parent/fees/checkout
 * Dedicated parent portal endpoint to initiate a secure online fee payment.
 * Authenticates guardian-student link, recalculates payable amounts strictly server-side,
 * and generates gateway order parameters.
 */
async function _POST(req: NextRequest) {
  const session = await requireApi(req)
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const body = await req.json()
    const { studentId, invoiceId, feeScheduleId, currency = 'INR', retryOfPaymentId, previousPaymentId } = body

    if (currency && currency.toUpperCase() !== 'INR') {
      return Errors.validation(`Unsupported currency "${currency}". Only INR is supported.`)
    }

    if (!studentId && !invoiceId && !feeScheduleId) {
      return Errors.validation('studentId, invoiceId, or feeScheduleId is required')
    }

    const tenantId = session.tenantId

    // 0. Retry relationship tracking
    const retryId = retryOfPaymentId || previousPaymentId
    let previousPayment: any = null
    if (retryId) {
      previousPayment = await db.payment.findFirst({
        where: { id: retryId, tenantId },
      })
    }

    // 1. Authoritative lookup of target student
    let targetStudentId = studentId
    let invoice: any = null
    let feeSchedule: any = null
    let payableCents = 0

    if (invoiceId) {
      invoice = await db.invoice.findFirst({
        where: { id: invoiceId, tenantId, deletedAt: null },
        include: { student: true },
      })
      if (!invoice) return Errors.notFound('Invoice')
      if (['CANCELLED', 'WRITTEN_OFF', 'PAID'].includes(invoice.status)) {
        return Errors.validation(`Invoice is not payable (status: ${invoice.status})`)
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
        return Errors.validation('This installment is already paid in full')
      }
      targetStudentId = feeSchedule.studentId
      payableCents = feeSchedule.remainingAmountCents
    } else if (studentId) {
      // Find oldest pending fee schedule or unpaid invoice for this student
      const pendingSchedule = await db.studentFeeSchedule.findFirst({
        where: {
          studentId,
          tenantId,
          status: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] },
        },
        include: { student: true, feeItem: true },
        orderBy: { dueDate: 'asc' },
      })

      if (pendingSchedule) {
        feeSchedule = pendingSchedule
        targetStudentId = studentId
        payableCents = pendingSchedule.remainingAmountCents
      } else {
        const unpaidInvoice = await db.invoice.findFirst({
          where: {
            studentId,
            tenantId,
            status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
            deletedAt: null,
          },
          include: { student: true },
          orderBy: { dueDate: 'asc' },
        })
        if (!unpaidInvoice) {
          return Errors.validation('No outstanding fee dues found for this student')
        }
        invoice = unpaidInvoice
        targetStudentId = studentId
        payableCents = Math.max(0, unpaidInvoice.totalCents - unpaidInvoice.paidCents)
      }
    }

    if (payableCents <= 0) {
      return Errors.validation('No outstanding balance remaining to pay')
    }

    // 2. Validate Parent / Guardian Authorization
    if (session.role === 'PARENT') {
      const isLinked = await db.studentGuardian.findFirst({
        where: {
          studentId: targetStudentId,
          guardian: { userId: session.uid },
        },
      })
      if (!isLinked) {
        return Errors.forbidden('Access denied: You are not authorized to make fee payments for this student')
      }
    }

    const student = invoice?.student || feeSchedule?.student || (await db.student.findUnique({ where: { id: targetStudentId } }))
    if (!student) return Errors.notFound('Student')

    // 3. Gateway Configuration Verification
    const gwConfig = await FeeService.getPaymentGatewayConfig(tenantId)
    if (!gwConfig.enabled) {
      return Errors.validation('Online payment facility is currently unavailable. Please contact the school office.')
    }

    // 4. Generate unique transaction references
    const now = Date.now()
    const txRef = `TXN-${now}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const paymentNumber = await nextNumber('payment', tenantId)

    // 5. Gateway Order ID
    let gatewayOrderId = `ord_${gwConfig.provider.toLowerCase()}_${now}`
    const secrets = await FeeService.getDecryptedGatewaySecrets(tenantId)
    if (secrets.provider === 'RAZORPAY' && secrets.keyId && secrets.keySecret) {
      try {
        const auth = Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString('base64')
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
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
              payerUserId: session.uid,
            },
          }),
        })
        if (rzpRes.ok) {
          const rzpData = await rzpRes.json()
          gatewayOrderId = rzpData.id
        }
      } catch (err) {
        console.warn('Parent checkout: Razorpay order fallback:', err)
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
        console.warn('Parent checkout: Cashfree order fallback:', err)
      }
    } else if (secrets.provider === 'PAYU' && secrets.keyId && secrets.keySecret) {
      gatewayOrderId = `payu_${txRef.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    }

    // 6. Record Payment Session with Initial Timeline
    const timeline = [
      {
        previousStatus: null,
        newStatus: 'PENDING',
        event: 'INITIATED',
        source: 'API',
        at: new Date().toISOString(),
        by: session.name || 'Parent Guardian',
        diagnostics: previousPayment
          ? `Retry attempt for prior transaction ${previousPayment.paymentNumber}`
          : 'Parent fee checkout session initiated',
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
          checkoutMode: gwConfig.mode,
          currency: 'INR',
          initiatedByRole: session.role,
          retryOfPaymentId: previousPayment?.id || null,
          previousAttemptRef: previousPayment?.transactionRef || null,
          branchId: student.branchId || invoice?.branchId || null,
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
      mode: gwConfig.mode,
      amountCents: payableCents,
      amountRupees: (payableCents / 100).toFixed(2),
      currency: 'INR',
      studentName: `${student.firstName} ${student.lastName || ''}`.trim(),
      admissionNo: student.admissionNo,
      schoolName: school?.name || 'PreOne Preschool',
      invoiceNumber: invoice?.invoiceNumber || feeSchedule?.period || 'Fee Installment',
      supportedMethods: gwConfig.supportedMethods,
    })
  } catch (e: any) {
    return Errors.system(e)
  }
}

export const POST = withApi(_POST)
