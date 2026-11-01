import { NextRequest } from 'next/server'
import { withApi } from '@/lib/with-api'
import { db } from '@/lib/db'
import { ok, Errors } from '@/lib/api'
import { requireApi, isResponse } from '@/lib/auth-api'

/**
 * GET /api/v1/parent/inventory
 * Fetches items and learning materials assigned to a parent's linked student(s).
 *
 * Security & Data Privacy Rules:
 * - Scoped strictly to the authenticated guardian's linked students in the current tenant.
 * - Rejects any studentId not belonging to the guardian (403 Forbidden).
 * - Excludes warehouse stock balances, purchase order references, item unit costs, and vendor data.
 */
async function _GET(req: NextRequest) {
  const session = await requireApi(req, 'inventory:read-linked')
  if (isResponse(session)) return session
  if (!session.tenantId) return Errors.forbidden('No tenant context')

  try {
    const tenantId = session.tenantId
    const url = new URL(req.url)
    const filterStudentId = url.searchParams.get('studentId')

    // 1. Authorize: Discover all linked students for this logged-in parent
    const guardians = await db.guardian.findMany({
      where: {
        userId: session.uid,
        tenantId,
        deletedAt: null,
      },
      include: {
        studentLinks: {
          select: {
            studentId: true,
          },
        },
      },
    })

    const linkedStudentIds = Array.from(
      new Set(guardians.flatMap((g) => g.studentLinks.map((l) => l.studentId)))
    )

    if (linkedStudentIds.length === 0) {
      return ok({
        items: [],
        summary: { totalAssigned: 0, pendingReturns: 0, kitsIssued: 0 },
      })
    }

    // 2. Strict IDOR defense: Verify requested studentId is linked
    if (filterStudentId && !linkedStudentIds.includes(filterStudentId)) {
      return Errors.forbidden('You are not authorized to view inventory for this student')
    }

    const targetStudentIds = filterStudentId ? [filterStudentId] : linkedStudentIds

    // 3. Query stock issues assigned to the student(s)
    const stockIssues = await db.stockIssue.findMany({
      where: {
        tenantId,
        studentId: { in: targetStudentIds },
        status: { not: 'CANCELLED' },
      },
      orderBy: { issueDate: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNo: true,
            currentClassroom: { select: { id: true, name: true } },
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: { select: { id: true, name: true } },
                description: true,
              },
            },
          },
        },
        kitIssuance: {
          select: {
            id: true,
            kitNumber: true,
            bundleName: true,
            createdAt: true,
            notes: true,
          },
        },
      },
    })

    // 4. Transform into parent-safe assigned items
    const items: any[] = []
    let totalAssigned = 0
    let pendingReturns = 0
    const kitsSet = new Set<string>()

    for (const issue of stockIssues) {
      if (issue.kitIssuance?.kitNumber) {
        kitsSet.add(issue.kitIssuance.kitNumber)
      }

      for (const line of issue.items) {
        const qtyIssued = Number(line.quantity || 0)
        const qtyReturned = Number(line.returnedQuantity || 0)
        const pendingQty = Math.max(0, qtyIssued - qtyReturned)

        totalAssigned += qtyIssued
        if (pendingQty > 0) {
          pendingReturns += pendingQty
        }

        let returnStatus = 'ISSUED'
        if (qtyReturned >= qtyIssued && qtyIssued > 0) {
          returnStatus = 'RETURNED'
        } else if (qtyReturned > 0) {
          returnStatus = 'PARTIALLY_RETURNED'
        }

        items.push({
          id: line.id,
          issueNumber: issue.issueNumber,
          issueDate: issue.issueDate.toISOString(),
          studentId: issue.student?.id || '',
          studentName: `${issue.student?.firstName || ''} ${issue.student?.lastName || ''}`.trim(),
          admissionNo: issue.student?.admissionNo || '',
          classroomName: issue.student?.currentClassroom?.name || null,
          itemName: line.item.name,
          sku: line.item.sku,
          category: line.item.category?.name || 'General',
          description: line.item.description || null,
          kitNumber: issue.kitIssuance?.kitNumber || null,
          bundleName: issue.kitIssuance?.bundleName || null,
          quantityIssued: qtyIssued,
          quantityReturned: qtyReturned,
          pendingQuantity: pendingQty,
          status: returnStatus,
          notes: issue.notes || null,
        })
      }
    }

    return ok({
      items,
      summary: {
        totalAssigned,
        pendingReturns,
        kitsIssued: kitsSet.size,
      },
    })
  } catch (err: any) {
    return Errors.system(err)
  }
}

export const GET = withApi(_GET)
