'use client'

import React from 'react'
import {
  X,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Building,
  User,
  Calendar,
  Layers,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { SupplyRequestApprovalItem } from './SupplyApprovalInbox'

interface SupplyRequestDetailModalProps {
  open: boolean
  onClose: () => void
  request: SupplyRequestApprovalItem | null
  canApprove?: boolean
  canFulfill?: boolean
  onApprove?: (requestId: string) => void
  onReject?: (request: SupplyRequestApprovalItem) => void
  onFulfill?: (request: SupplyRequestApprovalItem) => void
}

export function SupplyRequestDetailModal({
  open,
  onClose,
  request,
  canApprove = false,
  canFulfill = false,
  onApprove,
  onReject,
  onFulfill,
}: SupplyRequestDetailModalProps) {
  if (!open || !request) return null

  const classroomName = request.classroom?.name || 'Classroom'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-overlay)] backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--surface-card)] rounded-2xl [box-shadow:var(--shadow-3)] border border-[var(--border-default)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4 bg-[var(--surface-subtle)] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-[var(--text-inverse)] [box-shadow:var(--shadow-1)]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  Request {request.requestNumber}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success-surface)] text-[var(--color-success-text)] border border-[var(--color-success-border)] font-bold">
                  {request.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Submitted for {classroomName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Classroom</span>
              <span className="font-bold text-[var(--text-primary)]">{classroomName}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Requester</span>
              <span className="font-bold text-[var(--text-primary)]">{request.requestedByName}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Needed Date</span>
              <span className="font-bold text-[var(--text-primary)]">
                {new Date(request.requiredDate).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Priority</span>
              <span className="font-bold text-[var(--text-primary)]">{request.priority}</span>
            </div>
          </div>

          {/* Purpose / Remarks */}
          {request.reason && (
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-0.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Teacher Remarks / Purpose</span>
              <p className="text-[var(--text-primary)] font-medium">{request.reason}</p>
            </div>
          )}

          {/* Decision Notes */}
          {request.status === 'REJECTED' && request.rejectionReason && (
            <div className="p-3 rounded-xl bg-[var(--color-danger-surface)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-[var(--color-danger-base)]">Rejection Reason</span>
              <p className="font-semibold">{request.rejectionReason}</p>
              {request.rejectedByName && (
                <span className="text-[10px] text-[var(--color-danger-base)] block pt-0.5">Reviewed by {request.rejectedByName} on {request.rejectedAt ? new Date(request.rejectedAt).toLocaleDateString('en-IN') : 'recently'}</span>
              )}
            </div>
          )}

          {request.status === 'APPROVED' && request.approvedByName && (
            <div className="p-3 rounded-xl bg-[var(--color-success-surface)] border border-[var(--color-success-border)] text-[var(--color-success-text)]">
              <span className="font-bold">Approved by {request.approvedByName}</span> on {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('en-IN') : 'recently'}. Ready for warehouse stock disbursement.
            </div>
          )}

          {/* Requested Items Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-[var(--text-primary)]">
              Requested Materials ({request.items.length})
            </h4>

            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                  <tr>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5 text-center">Requested</th>
                    <th className="p-2.5 text-center">Approved</th>
                    <th className="p-2.5 text-center">Issued</th>
                    <th className="p-2.5 text-right">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {request.items.map((line) => (
                    <tr key={line.id} className="hover:bg-[var(--surface-subtle)]">
                      <td className="p-2.5 font-bold text-[var(--text-primary)]">
                        <div>{line.item?.name}</div>
                        <div className="font-mono text-[10px] text-[var(--text-muted)] font-normal">{line.item?.sku}</div>
                      </td>
                      <td className="p-2.5 text-center font-bold text-[var(--text-secondary)]">
                        {Number(line.requestedQuantity)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-[var(--color-success-base)]">
                        {line.approvedQuantity !== null && line.approvedQuantity !== undefined
                          ? Number(line.approvedQuantity)
                          : '—'}
                      </td>
                      <td className="p-2.5 text-center font-bold text-[var(--color-brand-primary)]">
                        {Number(line.issuedQuantity)}
                      </td>
                      <td className="p-2.5 text-right text-[var(--text-muted)] font-medium">
                        {line.item?.unit?.symbol || line.item?.unit?.name || 'Pack'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border-default)] p-4 bg-[var(--surface-subtle)] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-card)] rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {request.status === 'PENDING' && canApprove && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onReject?.(request)
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-[var(--color-danger-text)] bg-[var(--color-danger-surface)] hover:bg-[var(--color-danger-border)] border border-[var(--color-danger-border)] rounded-lg transition-colors"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onApprove?.(request.id)
                  }}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-inverse)] bg-[var(--color-success-base)] hover:opacity-90 rounded-lg [box-shadow:var(--shadow-1)] transition-colors flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve Request</span>
                </button>
              </>
            )}

            {(request.status === 'APPROVED' || request.status === 'PARTIALLY_ISSUED') && canFulfill && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onFulfill?.(request)
                }}
                className="px-4 py-2 text-xs font-bold text-[var(--text-inverse)] bg-[var(--color-success-base)] hover:opacity-90 rounded-lg [box-shadow:var(--shadow-1)] transition-colors flex items-center gap-1.5"
              >
                <Truck className="h-4 w-4" />
                <span>Issue Supplies Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
