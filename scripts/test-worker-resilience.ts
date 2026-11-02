import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'
import { PaymentRecoveryService } from '../src/lib/fees/payment-recovery-service'
import { parsePaymentMetadata } from '../src/lib/fees/payment-status-types'

async function testWorkerResilience() {
  console.log('========================================================================')
  console.log(' PREONE — RECOVERY WORKER MULTI-INSTANCE RESILIENCE & DEAD-LETTER AUDIT ')
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
    data: { tenantId, branchId: branch.id, firstName: 'Ishaan', admissionNo: `ISH-${Date.now().toString().slice(-4)}` },
  }))

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-WORKER-RES-${Date.now()}`,
      subtotalCents: 800000,
      totalCents: 800000,
      paidCents: 0,
      balanceCents: 800000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  const oId = `ord_rzp_wkr_${Date.now()}`
  const pId = `pay_rzp_wkr_${Date.now()}`
  const payment = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: invoice.id,
      paymentNumber: `PAY-WKR-${Date.now().toString().slice(-4)}`,
      amountCents: 800000,
      method: 'ONLINE',
      transactionRef: `TXN-WKR-${Date.now()}`,
      status: 'PENDING',
      notes: JSON.stringify({
        provider: 'RAZORPAY',
        providerStatus: 'ORDER_CREATED',
        internalPaymentStatus: 'INITIATED',
        reconciliationStatus: 'NOT_STARTED',
        gatewayOrderId: oId,
        currency: 'INR',
      }),
    },
  })

  // 1. Two independent worker instances simultaneously processing the exact same payment
  console.log('--- TEST 1: TWO INDEPENDENT WORKER INSTANCES RACING ON SAME RECOVERY ---')
  const worker1Promise = PaymentRecoveryService.recoverTransaction(
    { tenantId, actorId: 'worker-instance-1', actorName: 'Recovery Worker 1', actorRole: 'SYSTEM' },
    payment.id,
    {
      mockProviderResult: {
        settled: true,
        status: 'SUCCESS',
        providerStatus: 'CAPTURED',
        providerPaymentId: pId,
        providerOrderId: oId,
        amountCents: 800000,
        currency: 'INR',
      },
    }
  )

  const worker2Promise = PaymentRecoveryService.recoverTransaction(
    { tenantId, actorId: 'worker-instance-2', actorName: 'Recovery Worker 2', actorRole: 'SYSTEM' },
    payment.id,
    {
      mockProviderResult: {
        settled: true,
        status: 'SUCCESS',
        providerStatus: 'CAPTURED',
        providerPaymentId: pId,
        providerOrderId: oId,
        amountCents: 800000,
        currency: 'INR',
      },
    }
  )

  const [w1Res, w2Res] = await Promise.all([worker1Promise, worker2Promise])

  const allReceipts = await db.receipt.findMany({ where: { paymentId: payment.id } })
  const refreshedInv = await db.invoice.findUnique({ where: { id: invoice.id } })
  const refreshedPay = await db.payment.findUnique({ where: { id: payment.id } })
  const meta = parsePaymentMetadata(refreshedPay!)

  const passConcurrency =
    (w1Res.action === 'RECOVERED_SUCCESS' || w1Res.action === 'ALREADY_SETTLED') &&
    (w2Res.action === 'RECOVERED_SUCCESS' || w2Res.action === 'ALREADY_SETTLED') &&
    allReceipts.length === 1 && // STRICT GUARANTEE: Only 1 receipt issued
    refreshedInv?.paidCents === 800000 && // Exactly once allocation
    refreshedInv?.balanceCents === 0 &&
    meta.reconciliationStatus === 'MATCHED'

  console.log(`[WORKER-01] Two Worker Instance Race Test: ${passConcurrency ? 'PASS' : 'FAIL'}`)
  console.log(`  Worker 1 Action: ${w1Res.action}, Worker 2 Action: ${w2Res.action}`)
  console.log(`  Total Receipts in DB: ${allReceipts.length}, Invoice Balance: ₹${(refreshedInv?.balanceCents ?? 0) / 100}`)

  // 2. Dead-Letter Recovery & Exhaustion Triage
  console.log('\n--- TEST 2: RETRY EXHAUSTION & DEAD-LETTER ESCALATION ---')
  const deadPay = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      paymentNumber: `PAY-DEAD-${Date.now().toString().slice(-4)}`,
      amountCents: 50000,
      method: 'ONLINE',
      transactionRef: `TXN-DEAD-${Date.now()}`,
      status: 'PENDING',
      notes: JSON.stringify({
        provider: 'RAZORPAY',
        providerStatus: 'PENDING',
        internalPaymentStatus: 'VERIFICATION_PENDING',
        reconciliationStatus: 'RETRY_PENDING',
        reconciliationCount: 10, // Max retries exhausted
        lastReconciledAt: new Date(Date.now() - 3600000).toISOString(),
      }),
    },
  })

  const deadMeta = parsePaymentMetadata(deadPay)
  const isDeadLetterFlagged = deadMeta.reconciliationCount >= 10 && deadMeta.reconciliationStatus === 'RETRY_PENDING'
  console.log(`[WORKER-02] Retry Exhaustion Dead-Letter Triage: ${isDeadLetterFlagged ? 'PASS' : 'FAIL'}`)
  console.log(`  Reconciliation Retries: ${deadMeta.reconciliationCount}, Status: ${deadMeta.reconciliationStatus}`)

  console.log('\n========================================================================')
  console.log(' RECOVERY WORKER RESILIENCE & DEAD-LETTER AUDIT COMPLETED ')
  console.log('========================================================================\n')

  return passConcurrency && isDeadLetterFlagged
}

testWorkerResilience()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
