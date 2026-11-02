import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'
import { parsePaymentMetadata } from '../src/lib/fees/payment-status-types'

async function testConcurrentRefunds() {
  console.log('========================================================================')
  console.log(' PREONE — CONCURRENT REFUND SAFETY AUDIT (₹4,000 x 3 on ₹10,000 PAYMENT) ')
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
    data: { tenantId, branchId: branch.id, firstName: 'Aarav', admissionNo: `AAR-${Date.now().toString().slice(-4)}` },
  }))

  const actorCtx = {
    tenantId,
    actorId: 'audit-concurrent-refund',
    actorName: 'Concurrent Refund Auditor',
    actorRole: 'ADMIN',
  }

  // 1. Create Invoice for ₹10,000.00
  const invoice = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-CONC-REF-${Date.now()}`,
      subtotalCents: 1000000,
      totalCents: 1000000,
      paidCents: 0,
      balanceCents: 1000000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  // 2. Create and settle Payment for ₹10,000.00
  const payment = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: invoice.id,
      paymentNumber: `PAY-CONC-REF-${Date.now().toString().slice(-4)}`,
      amountCents: 1000000, // ₹10,000.00
      method: 'ONLINE',
      transactionRef: `TXN-CONC-REF-${Date.now()}`,
      status: 'PENDING',
    },
  })

  await FeeService.verifyPayment(actorCtx, {
    paymentId: payment.id,
    gatewayStatus: 'SUCCESS',
  })

  const invAfterPay = await db.invoice.findUnique({ where: { id: invoice.id } })
  console.log(`Payment settled: Paid=₹${(invAfterPay?.paidCents ?? 0) / 100}, Balance=₹${(invAfterPay?.balanceCents ?? 0) / 100}, Status=${invAfterPay?.status}`)

  // 3. Launch 3 Simultaneous Concurrent Refunds of ₹4,000.00 each
  console.log('\n[LAUNCH] Firing 3 simultaneous concurrent refund requests (Refund A, B, C = ₹4,000 each; Total = ₹12,000)...')
  const refundReqs = [
    { label: 'Refund A', amount: 400000 },
    { label: 'Refund B', amount: 400000 },
    { label: 'Refund C', amount: 400000 },
  ]

  const outcomes = await Promise.all(
    refundReqs.map(async (r) => {
      try {
        const res = await FeeService.refundPayment(actorCtx, {
          paymentId: payment.id,
          amountCents: r.amount,
          reason: `Concurrent test ${r.label}`,
          refundRef: `REF-${r.label.replace(' ', '')}-${Date.now()}`,
        })
        return { label: r.label, success: true, refundRef: res.refundRef }
      } catch (err: any) {
        return { label: r.label, success: false, error: err.message }
      }
    })
  )

  console.log('\n--- Concurrent Refund Execution Outcomes ---')
  for (const o of outcomes) {
    if (o.success) {
      console.log(`✅ ${o.label}: SUCCESS (Reference: ${o.refundRef})`)
    } else {
      console.log(`🛑 ${o.label}: BLOCKED WITH ERROR: "${o.error}"`)
    }
  }

  // 4. Database Invariant Verifications
  const successfulCount = outcomes.filter((o) => o.success).length
  const blockedCount = outcomes.filter((o) => !o.success).length

  const refreshedPay = await db.payment.findUnique({ where: { id: payment.id } })
  const refreshedInv = await db.invoice.findUnique({ where: { id: invoice.id } })
  const meta = parsePaymentMetadata(refreshedPay!)

  const totalRefundedInNotes = Number(meta.totalRefundedCents || 0)
  const expectedRefunded = successfulCount * 400000 // should be ₹8,000 (800000 cents)

  console.log('\n--- Post-Execution Database Verification ---')
  console.log(`Successful refunds count: ${successfulCount}`)
  console.log(`Blocked refunds count: ${blockedCount}`)
  console.log(`Payment Status in DB: ${refreshedPay?.status}`)
  console.log(`Internal Payment Status: ${meta.internalPaymentStatus}`)
  console.log(`Total Refunded (cents): ${totalRefundedInNotes} (₹${totalRefundedInNotes / 100})`)
  console.log(`Invoice Paid Balance: ₹${(refreshedInv?.paidCents ?? 0) / 100}`)
  console.log(`Invoice Restored Balance: ₹${(refreshedInv?.balanceCents ?? 0) / 100}`)

  const pass =
    successfulCount === 2 && // Exactly 2 succeeded
    blockedCount === 1 && // Exactly 1 rejected
    totalRefundedInNotes === 800000 && // Exactly ₹8,000 refunded
    totalRefundedInNotes <= payment.amountCents && // NEVER exceeds ₹10,000
    refreshedInv?.paidCents === 200000 && // Invoice paid reduced to ₹2,000
    refreshedInv?.balanceCents === 800000 // Invoice balance restored to ₹8,000

  console.log(`\n[CONCURRENCY-AUDIT-RESULT] Concurrent Refund Safety: ${pass ? 'PASS' : 'FAIL'}`)

  if (!pass) {
    process.exit(1)
  }
}

testConcurrentRefunds()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
