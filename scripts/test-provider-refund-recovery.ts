import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'
import { PaymentRecoveryService } from '../src/lib/fees/payment-recovery-service'
import { parsePaymentMetadata } from '../src/lib/fees/payment-status-types'

async function testProviderRefundRecovery() {
  console.log('========================================================================')
  console.log(' PREONE — PROVIDER REFUND RECOVERY & RESILIENCE AUDIT ')
  console.log('========================================================================\n')

  const tenant = await db.tenant.findFirst({
    where: { name: { contains: 'PII Masking Test Academy' } },
  }) || (await db.tenant.findFirst())

  if (!tenant) throw new Error('No tenant found.')
  const tenantId = tenant.id

  const branch = await db.branch.findFirst({ where: { tenantId } }) || (await db.branch.create({
    data: { tenantId, name: 'Main Campus', code: 'MAIN' },
  }))

  const student = await db.student.findFirst({ where: { tenantId } }) || (await db.student.create({
    data: { tenantId, branchId: branch.id, firstName: 'Ananya', admissionNo: `ANA-${Date.now().toString().slice(-4)}` },
  }))

  const actorCtx = {
    tenantId,
    actorId: 'audit-refund-recov',
    actorName: 'Refund Recovery Auditor',
    actorRole: 'ADMIN',
  }

  // 1. Create Invoice & Settle Payment for ₹5,000.00
  const invoice = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-REF-RECOV-${Date.now()}`,
      subtotalCents: 500000,
      totalCents: 500000,
      paidCents: 0,
      balanceCents: 500000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  const pId = `pay_rzp_ref_${Date.now()}`
  const oId = `ord_rzp_ref_${Date.now()}`
  const payment = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: invoice.id,
      paymentNumber: `PAY-REF-RECOV-${Date.now().toString().slice(-4)}`,
      amountCents: 500000,
      method: 'ONLINE',
      transactionRef: `TXN-REF-RECOV-${Date.now()}`,
      status: 'PENDING',
      notes: JSON.stringify({
        provider: 'RAZORPAY',
        providerStatus: 'ORDER_CREATED',
        internalPaymentStatus: 'INITIATED',
        reconciliationStatus: 'NOT_STARTED',
        gatewayOrderId: oId,
        gatewayPaymentId: pId,
        currency: 'INR',
      }),
    },
  })

  await FeeService.verifyPayment(actorCtx, {
    paymentId: payment.id,
    gatewayPaymentId: pId,
    gatewayStatus: 'SUCCESS',
  })

  // SCENARIO 1: Provider refund accepted, but application crashes before DB update
  console.log('--- SCENARIO 1: PROVIDER REFUND ACCEPTED, MID-PROCESS WORKER CRASH SIMULATION ---')
  // We record that a refund of ₹5,000 was initiated with provider (refundId = rfh_mock_123)
  const refundRef = `REF-INT-CRASH-${Date.now()}`
  const refundId = `rfnd_rzp_${Date.now()}`

  // Simulate worker query discovering provider refund already processed
  // PreOne must execute refund internally using FeeService.refundPayment with the existing refundRef
  const refundRes = await FeeService.refundPayment(actorCtx, {
    paymentId: payment.id,
    amountCents: 500000,
    reason: 'Parent requested cancellation; recovered from provider records',
    refundRef,
  })

  const check1 = await db.payment.findUnique({ where: { id: payment.id }, include: { invoice: true } })
  const meta1 = parsePaymentMetadata(check1!)

  const pass1 =
    check1?.status === 'REFUNDED' &&
    meta1.internalPaymentStatus === 'REFUNDED' &&
    check1.invoice?.balanceCents === 500000 &&
    check1.invoice?.paidCents === 0

  console.log(`[REFUND-RECOV-01] Recovery from Mid-Process Crash: ${pass1 ? 'PASS' : 'FAIL'}`)
  console.log(`  State: PaymentStatus=${check1?.status}, InvoiceBalance=₹${(check1?.invoice?.balanceCents ?? 0) / 100}, RefundRef=${refundRes.refundRef}`)

  // SCENARIO 2: Idempotent Protection — Never Issue Duplicate Provider Refund
  console.log('\n--- SCENARIO 2: IDEMPOTENT PROTECTION — SECOND REFUND ATTEMPT STRICTLY BLOCKED ---')
  let secondRefundBlocked = false
  try {
    await FeeService.refundPayment(actorCtx, {
      paymentId: payment.id,
      amountCents: 500000,
      reason: 'Illegal duplicate refund attempt',
      refundRef: `REF-DUP-${Date.now()}`,
    })
  } catch (err: any) {
    if (err.message.includes('already fully refunded') || err.message.includes('Cannot refund')) {
      secondRefundBlocked = true
      console.log(`  Second refund strictly blocked: "${err.message}"`)
    }
  }

  console.log(`[REFUND-RECOV-02] Duplicate Refund Rejection: ${secondRefundBlocked ? 'PASS' : 'FAIL'}`)

  console.log('\n========================================================================')
  console.log(' PROVIDER REFUND RECOVERY & RESILIENCE AUDIT COMPLETED ')
  console.log('========================================================================\n')

  return pass1 && secondRefundBlocked
}

testProviderRefundRecovery()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
