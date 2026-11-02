import { db } from '../src/lib/db'
import { FeeService } from '../src/lib/fees/fee-service'
import { PaymentRecoveryService } from '../src/lib/fees/payment-recovery-service'
import { parsePaymentMetadata } from '../src/lib/fees/payment-status-types'
import crypto from 'crypto'

async function testDatabaseIntegrityAndRollbacks() {
  console.log('========================================================================')
  console.log(' PREONE — DATABASE FINANCIAL INTEGRITY, CONSTRAINTS & ROLLBACK AUDIT ')
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
    data: { tenantId, branchId: branch.id, firstName: 'Rohan', admissionNo: `ROH-${Date.now().toString().slice(-4)}` },
  }))

  const actorCtx = {
    tenantId,
    actorId: 'db-audit-actor',
    actorName: 'DB Audit Actor',
    actorRole: 'ADMIN',
  }

  // -------------------------------------------------------------------------
  // TEST 1: ATOMIC ROLLBACK ON MID-TRANSACTION CRASH
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: ATOMIC ROLLBACK ON MID-TRANSACTION FAILURE ---')
  const inv1 = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-ROLLBACK-${Date.now()}`,
      subtotalCents: 500000,
      totalCents: 500000,
      paidCents: 0,
      balanceCents: 500000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  const pay1 = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: inv1.id,
      paymentNumber: `PAY-ROLLBACK-${Date.now().toString().slice(-4)}`,
      amountCents: 500000,
      method: 'ONLINE',
      transactionRef: `TXN-ROLLBACK-${Date.now()}`,
      status: 'PENDING',
    },
  })

  let caughtError = false
  try {
    await db.$transaction(async (tx) => {
      // 1. Update payment to SUCCESS
      await tx.payment.update({
        where: { id: pay1.id },
        data: { status: 'SUCCESS' },
      })
      // 2. Reduce invoice balance
      await tx.invoice.update({
        where: { id: inv1.id },
        data: { paidCents: 500000, balanceCents: 0 },
      })
      // 3. Deliberately throw error before receipt creation to simulate crash
      throw new Error('SIMULATED_CRASH_BEFORE_RECEIPT')
    })
  } catch (err: any) {
    if (err.message.includes('SIMULATED_CRASH_BEFORE_RECEIPT')) {
      caughtError = true
    }
  }

  // Verify database state: both payment and invoice MUST be restored to original PENDING state
  const checkPay1 = await db.payment.findUnique({ where: { id: pay1.id } })
  const checkInv1 = await db.invoice.findUnique({ where: { id: inv1.id } })

  const rollbackPassed =
    caughtError &&
    checkPay1?.status === 'PENDING' &&
    checkInv1?.paidCents === 0 &&
    checkInv1?.balanceCents === 500000

  console.log(`[ROLLBACK-01] Atomic Rollback Verified: ${rollbackPassed ? 'PASS' : 'FAIL'}`)
  console.log(`  State post-rollback: Payment=${checkPay1?.status}, InvoicePaid=${checkInv1?.paidCents}, Balance=${checkInv1?.balanceCents}`)

  // -------------------------------------------------------------------------
  // TEST 2: DATABASE UNIQUE CONSTRAINT ON RECEIPT NUMBERS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: DATABASE UNIQUE CONSTRAINT ON RECEIPT NUMBERS ---')
  const rNum = `REC-UNIQ-${Date.now()}`
  const rec1 = await db.receipt.create({
    data: {
      tenantId,
      paymentId: pay1.id,
      receiptNumber: rNum,
      amountCents: 500000,
    },
  })

  let duplicateBlocked = false
  try {
    // Attempt duplicate receipt creation with same receiptNumber
    await db.receipt.create({
      data: {
        tenantId,
        paymentId: pay1.id,
        receiptNumber: rNum,
        amountCents: 500000,
      },
    })
  } catch (err: any) {
    // P2002 is Prisma unique constraint violation code
    if (err.code === 'P2002' || err.message.includes('Unique constraint')) {
      duplicateBlocked = true
    }
  }

  console.log(`[CONSTRAINT-01] Database Unique Receipt Constraint: ${duplicateBlocked ? 'PASS' : 'FAIL'}`)

  // -------------------------------------------------------------------------
  // TEST 3: MULTIPLE PARTIAL REFUNDS ACCOUNTING & OVER-REFUND LOCKOUT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: MULTIPLE PARTIAL REFUNDS ACCOUNTING & LIMIT ENFORCEMENT ---')
  const inv3 = await db.invoice.create({
    data: {
      tenantId,
      branchId: branch.id,
      studentId: student.id,
      invoiceNumber: `INV-REF-MULTI-${Date.now()}`,
      subtotalCents: 1000000,
      totalCents: 1000000,
      paidCents: 0,
      balanceCents: 1000000,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000),
    },
  })

  const pay3 = await db.payment.create({
    data: {
      tenantId,
      studentId: student.id,
      invoiceId: inv3.id,
      paymentNumber: `PAY-REF-MULTI-${Date.now().toString().slice(-4)}`,
      amountCents: 1000000, // ₹10,000.00
      method: 'ONLINE',
      transactionRef: `TXN-REF-MULTI-${Date.now()}`,
      status: 'PENDING',
    },
  })

  // Settle payment first
  await FeeService.verifyPayment(actorCtx, {
    paymentId: pay3.id,
    gatewayStatus: 'SUCCESS',
  })

  // Partial Refund 1: ₹3,000.00
  const ref1 = await FeeService.refundPayment(actorCtx, {
    paymentId: pay3.id,
    amountCents: 300000,
    reason: 'First partial refund: transport opting out',
  })

  const checkAfterRef1 = await db.payment.findUnique({ where: { id: pay3.id }, include: { invoice: true } })
  const metaRef1 = parsePaymentMetadata(checkAfterRef1!)
  console.log(`  After Refund 1 (₹3,000): PaymentStatus=${checkAfterRef1?.status}, InvoiceBalance=₹${(checkAfterRef1?.invoice?.balanceCents ?? 0) / 100}`)

  // Partial Refund 2: ₹2,000.00
  const ref2 = await FeeService.refundPayment(actorCtx, {
    paymentId: pay3.id,
    amountCents: 200000,
    reason: 'Second partial refund: activity fee reduction',
  })

  const checkAfterRef2 = await db.payment.findUnique({ where: { id: pay3.id }, include: { invoice: true } })
  const metaRef2 = parsePaymentMetadata(checkAfterRef2!)
  console.log(`  After Refund 2 (₹2,000): PaymentStatus=${checkAfterRef2?.status}, InternalStatus=${metaRef2.internalPaymentStatus}, InvoiceBalance=₹${(checkAfterRef2?.invoice?.balanceCents ?? 0) / 100}`)

  // Over-Refund Attempt: Attempting ₹6,000.00 (Total would be ₹11,000 which exceeds ₹10,000 payment)
  let overRefundBlocked = false
  try {
    await FeeService.refundPayment(actorCtx, {
      paymentId: pay3.id,
      amountCents: 600000,
      reason: 'Illegal excessive refund attempt',
    })
  } catch (err: any) {
    if (err.message.includes('exceeds') || err.message.includes('remaining') || err.message.includes('INVALID')) {
      overRefundBlocked = true
      console.log(`  Over-refund rejected with expected business error: "${err.message}"`)
    }
  }

  const multiRefundPassed =
    Boolean(ref1.payment) &&
    Boolean(ref2.payment) &&
    overRefundBlocked &&
    metaRef2.internalPaymentStatus === 'PARTIALLY_REFUNDED' &&
    checkAfterRef2.invoice?.balanceCents === 500000 // ₹3,000 + ₹2,000 = ₹5,000 refunded, ₹5,000 invoice balance restored

  console.log(`[REFUND-MULTI-01] Multiple Partial Refunds & Limit Enforcement: ${multiRefundPassed ? 'PASS' : 'FAIL'}`)

  console.log('\n========================================================================')
  console.log(' ALL DATABASE INTEGRITY, CONSTRAINT & ACCOUNTING AUDITS COMPLETED ')
  console.log('========================================================================\n')

  return {
    rollbackPassed,
    duplicateBlocked,
    multiRefundPassed,
  }
}

testDatabaseIntegrityAndRollbacks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
