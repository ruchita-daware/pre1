import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'
import { PaymentRecoveryService } from '../src/lib/fees/payment-recovery-service'
import { parsePaymentMetadata } from '../src/lib/fees/payment-status-types'

async function testThreeDimensionalStatusAndExceptions() {
  console.log('========================================================================')
  console.log(' PREONE — THREE-DIMENSIONAL STATUS & FINANCE EXCEPTIONS RECOVERY AUDIT ')
  console.log('========================================================================\n')

  const tenant = await db.tenant.findFirst({
    where: { name: { contains: 'PII Masking Test Academy' } },
  }) || (await db.tenant.findFirst())

  if (!tenant) throw new Error('No tenant found.')
  const tenantId = tenant.id

  const branch = await db.branch.findFirst({ where: { tenantId } }) || (await db.branch.create({
    data: { tenantId, name: 'Main Branch', code: 'MAIN' },
  }))

  const student = await db.student.findFirst({ where: { tenantId } }) || (await db.student.create({
    data: { tenantId, branchId: branch.id, firstName: 'Kavya', admissionNo: `KAV-${Date.now().toString().slice(-4)}` },
  }))

  const actorCtx = {
    tenantId,
    actorId: 'audit-3d-actor',
    actorName: '3D Audit Actor',
    actorRole: 'ADMIN',
  }

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-3D-${Date.now()}`,
      subtotalCents: 450000,
      totalCents: 450000,
      paidCents: 0,
      balanceCents: 450000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  const oId = `ord_rzp_3d_${Date.now()}`
  const pId = `pay_rzp_3d_${Date.now()}`

  // Step 1: Create transaction in PROVIDER CAPTURED + INTERNAL PENDING state
  const payment = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: invoice.id,
      paymentNumber: `PAY-3D-${Date.now().toString().slice(-4)}`,
      amountCents: 450000,
      method: 'ONLINE',
      transactionRef: `TXN-3D-${Date.now()}`,
      status: 'PENDING',
      notes: JSON.stringify({
        provider: 'RAZORPAY',
        providerStatus: 'CAPTURED', // Captured by bank!
        internalPaymentStatus: 'PENDING', // PreOne pending!
        reconciliationStatus: 'PENDING',
        gatewayOrderId: oId,
        currency: 'INR',
        timeline: [],
      }),
    },
  })

  console.log(`Created test payment ${payment.id}: providerStatus=CAPTURED, internalPaymentStatus=PENDING`)

  // Step 2: Verify it is detected as an exception
  const metaBefore = parsePaymentMetadata(payment)
  const isException = metaBefore.providerStatus === 'CAPTURED' && metaBefore.internalPaymentStatus !== 'SUCCESS'
  console.log(`[EXCEPTION-CHECK] Discovered as PROVIDER_CAPTURED_INTERNAL_PENDING exception: ${isException ? 'YES' : 'NO'}`)

  // Step 3: Trigger server-to-server authoritative recovery
  const recoveryRes = await PaymentRecoveryService.recoverTransaction(actorCtx, payment.id, {
    mockProviderResult: {
      settled: true,
      status: 'SUCCESS',
      providerStatus: 'CAPTURED',
      providerPaymentId: pId,
      providerOrderId: oId,
      amountCents: 450000,
      currency: 'INR',
    },
  })

  // Step 4: Verify post-recovery state
  const refreshed = await db.payment.findUnique({
    where: { id: payment.id },
    include: { receipt: true, invoice: true },
  })
  const metaAfter = parsePaymentMetadata(refreshed!)

  const passRecovery =
    recoveryRes.success &&
    metaAfter.providerStatus === 'CAPTURED' &&
    metaAfter.internalPaymentStatus === 'SUCCESS' &&
    metaAfter.reconciliationStatus === 'MATCHED' &&
    refreshed?.receipt !== null &&
    refreshed?.invoice?.balanceCents === 0

  console.log(`[3D-RECOVERY-01] Captured+Pending Exception Recovery: ${passRecovery ? 'PASS' : 'FAIL'}`)
  console.log(`  State after recovery: providerStatus=${metaAfter.providerStatus}, internalStatus=${metaAfter.internalPaymentStatus}, reconciliationStatus=${metaAfter.reconciliationStatus}`)
  console.log(`  Receipt Issued: ${refreshed?.receipt?.receiptNumber}, Invoice Balance: ₹${(refreshed?.invoice?.balanceCents ?? 0) / 100}`)

  // Step 5: Verify idempotent repeated run does not initiate new charge or duplicate receipt
  const repeatRes = await PaymentRecoveryService.recoverTransaction(actorCtx, payment.id, {
    mockProviderResult: {
      settled: true,
      status: 'SUCCESS',
      providerStatus: 'CAPTURED',
      providerPaymentId: pId,
      providerOrderId: oId,
      amountCents: 450000,
      currency: 'INR',
    },
  })

  const allReceipts = await db.receipt.findMany({ where: { paymentId: payment.id } })
  const passIdempotent = repeatRes.action === 'ALREADY_SETTLED' && allReceipts.length === 1

  console.log(`[3D-IDEMPOTENCY-01] Repeated Recovery Re-execution: ${passIdempotent ? 'PASS' : 'FAIL'}`)
  console.log(`  Repeat Action: ${repeatRes.action}, Total Receipts in DB: ${allReceipts.length}`)

  console.log('\n========================================================================')
  console.log(' THREE-DIMENSIONAL STATUS & RECOVERY AUDIT COMPLETED ')
  console.log('========================================================================\n')

  return passRecovery && passIdempotent
}

testThreeDimensionalStatusAndExceptions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
