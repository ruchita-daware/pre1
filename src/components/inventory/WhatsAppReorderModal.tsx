'use client'

import React, { useState, useEffect, useMemo, useId } from 'react'
import {
  X,
  MessageSquare,
  Copy,
  Check,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Calendar,
  Building,
  Phone,
  User,
  Package,
  Trash2,
  RefreshCw,
  Plus,
  Send,
  CheckCircle2,
  Truck,
} from 'lucide-react'
import { useToast } from '@/components/preone/Toast'
import {
  normalizeWhatsAppNumber,
  generateVendorOrderMessage,
  buildWhatsAppClickToChatUrl,
} from '@/lib/inventory/whatsapp-reorder-utils'

export interface WhatsAppReorderItem {
  id: string
  name: string
  sku?: string
  availableQuantity?: number
  suggestedReorderQuantity?: number
  requestedQuantity?: number
  unit?: string
  defaultVendor?: {
    id?: string
    name?: string
    code?: string
    phone?: string | null
    alternatePhone?: string | null
    contactPerson?: string | null
  } | null
  defaultVendorId?: string | null
  costPriceCents?: number | null
}

export interface WhatsAppVendor {
  id: string
  name: string
  code?: string
  phone?: string | null
  alternatePhone?: string | null
  contactPerson?: string | null
}

export interface WhatsAppReorderModalProps {
  open: boolean
  onClose: () => void
  initialItems: WhatsAppReorderItem[]
  vendors: WhatsAppVendor[]
  schoolName?: string
  branchName?: string | null
  onSuccess?: () => void
}

interface DraftItem {
  id: string
  name: string
  sku: string
  unit: string
  availableQuantity: number
  suggestedQuantity: number
  requestedQuantity: number
  vendorId: string | null
}

export function WhatsAppReorderModal({
  open,
  onClose,
  initialItems = [],
  vendors = [],
  schoolName = 'Sunshine Preschool',
  branchName,
  onSuccess,
}: WhatsAppReorderModalProps) {
  const toast = useToast()
  const titleId = useId()

  // State: editable items list
  const [items, setItems] = useState<DraftItem[]>([])

  // State: vendor override phone numbers (vendorId -> phone)
  const [vendorPhoneOverrides, setVendorPhoneOverrides] = useState<Record<string, string>>({})

  // State: selected active vendor tab
  const [activeVendorId, setActiveVendorId] = useState<string>('ALL')

  // State: optional delivery parameters
  const [deliveryDate, setDeliveryDate] = useState<string>('')
  const [deliveryNotes, setDeliveryNotes] = useState<string>('')
  const [showDeliveryOptions, setShowDeliveryOptions] = useState<boolean>(false)

  // State: custom edited message per vendor (vendorKey -> message)
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({})
  const [isMessageEdited, setIsMessageEdited] = useState<Record<string, boolean>>({})

  // State: copied flag & popup blocked state
  const [copiedVendorId, setCopiedVendorId] = useState<string | null>(null)
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null)

  // Map of vendors for quick lookup
  const vendorMap = useMemo(() => {
    const map = new Map<string, WhatsAppVendor>()
    for (const v of vendors) {
      map.set(v.id, v)
    }
    return map
  }, [vendors])

  // Initialize draft items whenever modal opens or initialItems change
  useEffect(() => {
    if (!open) return

    const initialDrafts: DraftItem[] = initialItems.map((it) => {
      const suggested = it.suggestedReorderQuantity && it.suggestedReorderQuantity > 0
        ? it.suggestedReorderQuantity
        : 10
      const requested = it.requestedQuantity && it.requestedQuantity > 0
        ? it.requestedQuantity
        : suggested

      const targetVendorId = it.defaultVendorId || it.defaultVendor?.id || null

      return {
        id: it.id,
        name: it.name,
        sku: it.sku || 'SKU',
        unit: it.unit || 'units',
        availableQuantity: it.availableQuantity || 0,
        suggestedQuantity: suggested,
        requestedQuantity: requested,
        vendorId: targetVendorId,
      }
    })

    setItems(initialDrafts)
    setCustomMessages({})
    setIsMessageEdited({})
    setPopupBlockedUrl(null)
  }, [open, initialItems])

  // Group items by vendor
  const vendorGroups = useMemo(() => {
    const map = new Map<string, DraftItem[]>()

    for (const item of items) {
      const vKey = item.vendorId || 'UNASSIGNED'
      if (!map.has(vKey)) {
        map.set(vKey, [])
      }
      map.get(vKey)!.push(item)
    }

    const groups: Array<{
      vendorId: string | null
      vendorKey: string
      vendorName: string
      contactPerson: string | null
      rawPhone: string
      normalizedPhone: string | null
      isPhoneValid: boolean
      items: DraftItem[]
    }> = []

    for (const [vKey, groupItems] of map.entries()) {
      if (vKey === 'UNASSIGNED') {
        groups.push({
          vendorId: null,
          vendorKey: 'UNASSIGNED',
          vendorName: '⚠️ Unassigned Supplier',
          contactPerson: null,
          rawPhone: '',
          normalizedPhone: null,
          isPhoneValid: false,
          items: groupItems,
        })
      } else {
        const vendor = vendorMap.get(vKey)
        const vendorName = vendor?.name || 'Supplier'
        const contactPerson = vendor?.contactPerson || null
        const rawPhone = vendorPhoneOverrides[vKey] !== undefined
          ? vendorPhoneOverrides[vKey]
          : vendor?.phone || vendor?.alternatePhone || ''
        const normalized = normalizeWhatsAppNumber(rawPhone)

        groups.push({
          vendorId: vKey,
          vendorKey: vKey,
          vendorName,
          contactPerson,
          rawPhone,
          normalizedPhone: normalized,
          isPhoneValid: Boolean(normalized),
          items: groupItems,
        })
      }
    }

    return groups
  }, [items, vendorMap, vendorPhoneOverrides])

  // Ensure activeVendorId remains valid
  useEffect(() => {
    if (vendorGroups.length === 0) return
    const keys = vendorGroups.map((g) => g.vendorKey)
    if (!keys.includes(activeVendorId)) {
      setActiveVendorId(keys[0])
    }
  }, [vendorGroups, activeVendorId])

  // Active group
  const activeGroup = useMemo(() => {
    return vendorGroups.find((g) => g.vendorKey === activeVendorId) || vendorGroups[0] || null
  }, [vendorGroups, activeVendorId])

  // Auto-generate standard message for active group
  const defaultActiveMessage = useMemo(() => {
    if (!activeGroup) return ''
    return generateVendorOrderMessage({
      vendorName: activeGroup.vendorId ? activeGroup.vendorName : 'Supplier',
      schoolName,
      branchName,
      items: activeGroup.items.map((i) => ({
        name: i.name,
        quantity: i.requestedQuantity,
        unit: i.unit,
      })),
      deliveryDate: deliveryDate || null,
      deliveryNotes: deliveryNotes || null,
    })
  }, [activeGroup, schoolName, branchName, deliveryDate, deliveryNotes])

  // Active message text (custom or default)
  const currentMessageText = useMemo(() => {
    if (!activeGroup) return ''
    if (isMessageEdited[activeGroup.vendorKey] && customMessages[activeGroup.vendorKey] !== undefined) {
      return customMessages[activeGroup.vendorKey]
    }
    return defaultActiveMessage
  }, [activeGroup, isMessageEdited, customMessages, defaultActiveMessage])

  // Update item quantity
  const handleQuantityChange = (itemId: string, qty: number) => {
    const val = Math.max(1, Math.round(qty || 1))
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, requestedQuantity: val } : it))
    )
  }

  // Remove item from draft
  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId))
  }

  // Change vendor for item
  const handleItemVendorChange = (itemId: string, newVendorId: string) => {
    const vId = newVendorId === 'UNASSIGNED' ? null : newVendorId
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, vendorId: vId } : it))
    )
  }

  // Bulk assign all unassigned items to a vendor
  const handleBulkAssignVendor = (targetVendorId: string) => {
    if (!targetVendorId || targetVendorId === 'UNASSIGNED') return
    setItems((prev) =>
      prev.map((it) => (!it.vendorId ? { ...it, vendorId: targetVendorId } : it))
    )
    setActiveVendorId(targetVendorId)
    toast.success('Vendor Assigned', 'Unassigned items moved to selected vendor.')
  }

  // Update phone override for a vendor
  const handlePhoneOverrideChange = (vendorId: string, phone: string) => {
    setVendorPhoneOverrides((prev) => ({ ...prev, [vendorId]: phone }))
  }

  // Update custom message text
  const handleMessageChange = (vendorKey: string, text: string) => {
    setCustomMessages((prev) => ({ ...prev, [vendorKey]: text }))
    setIsMessageEdited((prev) => ({ ...prev, [vendorKey]: true }))
  }

  // Reset message to default
  const handleResetMessage = (vendorKey: string) => {
    setIsMessageEdited((prev) => ({ ...prev, [vendorKey]: false }))
    setCustomMessages((prev) => {
      const copy = { ...prev }
      delete copy[vendorKey]
      return copy
    })
    toast.info('Message Reset', 'Reverted message to standard template.')
  }

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    if (!currentMessageText) return
    try {
      await navigator.clipboard.writeText(currentMessageText)
      setCopiedVendorId(activeGroup?.vendorKey || 'current')
      setTimeout(() => setCopiedVendorId(null), 2500)
      toast.success('Copied to Clipboard', 'Vendor order message ready to paste into WhatsApp.')
    } catch {
      toast.error('Copy Failed', 'Please manually select and copy the text.')
    }
  }

  // Open WhatsApp in browser / app
  const handleOpenWhatsApp = async () => {
    if (!activeGroup) return
    if (!activeGroup.isPhoneValid || !activeGroup.normalizedPhone) {
      toast.error('Missing WhatsApp Number', 'Please configure a valid 10-digit mobile number for this vendor.')
      return
    }

    try {
      const url = buildWhatsAppClickToChatUrl(activeGroup.normalizedPhone, currentMessageText)

      // Record audit event in background
      fetch('/api/v1/inventory/reorder/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUDIT_OPENED',
          vendorId: activeGroup.vendorId,
          vendorName: activeGroup.vendorName,
          vendorPhone: activeGroup.normalizedPhone,
          items: activeGroup.items.map((i) => ({
            name: i.name,
            quantity: i.requestedQuantity,
            unit: i.unit,
          })),
        }),
      }).catch((err) => console.warn('Audit record warning:', err))

      // Open WhatsApp click-to-chat URL
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer')

      if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
        // Popup was blocked by browser
        setPopupBlockedUrl(url)
        toast.warning('Pop-up Blocked', 'Click the link below to open WhatsApp.')
      } else {
        setPopupBlockedUrl(null)
        toast.success(
          'WhatsApp Opened',
          `Message prefilled for ${activeGroup.vendorName}. Please review and send in WhatsApp.`
        )
      }
    } catch (err: any) {
      toast.error('Could Not Open WhatsApp', err.message || 'Invalid WhatsApp configuration')
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-overlay, 500)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--surface-overlay)',
        backdropFilter: 'blur(5px)',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          backgroundColor: 'var(--surface-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-3)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          overflow: 'hidden',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageSquare size={22} />
            </div>
            <div>
              <h3
                id={titleId}
                style={{ fontSize: '1.08rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}
              >
                WhatsApp Vendor Re-Ordering
              </h3>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>
                1-tap prefilled order dispatch • Multi-vendor grouping • Zero stock mutations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL CONTENT CONTAINER                                                   */}
        {/* ========================================================================= */}
        <div
          style={{
            overflowY: 'auto',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* ZERO ITEMS EMPTY STATE */}
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Package size={36} className="text-[var(--text-muted)]" />
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No Items Selected for Reorder</div>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>
                Please select at least one low-stock item to generate a vendor order.
              </p>
            </div>
          ) : (
            <>
              {/* VENDOR GROUP TABS (IF MULTIPLE VENDORS OR UNASSIGNED) */}
              {vendorGroups.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Vendors in this Re-Order ({vendorGroups.length})
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      overflowX: 'auto',
                      paddingBottom: 4,
                    }}
                  >
                    {vendorGroups.map((g) => {
                      const isActive = g.vendorKey === activeVendorId
                      return (
                        <button
                          key={g.vendorKey}
                          type="button"
                          onClick={() => {
                            setActiveVendorId(g.vendorKey)
                            setPopupBlockedUrl(null)
                          }}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '10px',
                            border: isActive ? '2px solid var(--color-success-base)' : '1px solid var(--border-default)',
                            backgroundColor: isActive ? 'var(--color-success-surface)' : 'var(--surface-subtle)',
                            color: isActive ? 'var(--color-success-text)' : 'var(--text-secondary)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span>{g.vendorName}</span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              backgroundColor: isActive ? 'var(--color-success-base)' : 'var(--surface-subtle)',
                              color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                              fontWeight: 700,
                            }}
                          >
                            {g.items.length}
                          </span>
                          {!g.isPhoneValid && g.vendorId && (
                            <span title="Missing WhatsApp number" style={{ color: 'var(--color-warning-base)' }}>
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ACTIVE VENDOR SUMMARY CARD */}
              {activeGroup && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: activeGroup.vendorId ? 'var(--surface-subtle)' : 'var(--color-warning-surface)',
                    border: `1px solid ${activeGroup.vendorId ? 'var(--border-default)' : 'var(--color-warning-border)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Building size={16} className="text-[var(--text-secondary)]" />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {activeGroup.vendorName}
                      </span>
                      {activeGroup.contactPerson && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          (Contact: {activeGroup.contactPerson})
                        </span>
                      )}
                    </div>

                    {/* WhatsApp Status Badge */}
                    <div>
                      {activeGroup.isPhoneValid ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: 'var(--color-success-surface)',
                            color: 'var(--color-success-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          WhatsApp Ready: +{activeGroup.normalizedPhone}
                        </span>
                      ) : activeGroup.vendorId ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: 'var(--color-warning-surface)',
                            color: 'var(--color-warning-text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <AlertTriangle size={13} />
                          Missing Valid Phone
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* UNASSIGNED VENDOR HELPER */}
                  {!activeGroup.vendorId && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-warning-surface)',
                        border: '1px solid var(--color-warning-border)',
                        fontSize: '0.82rem',
                        color: 'var(--color-warning-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={15} className="shrink-0" />
                        <span>
                          These items do not have an assigned vendor. Please assign a vendor to proceed with WhatsApp.
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          className="select select-sm text-xs bg-[var(--surface-card)] border-[var(--color-warning-border)] text-[var(--text-primary)]"
                          defaultValue=""
                          onChange={(e) => handleBulkAssignVendor(e.target.value)}
                        >
                          <option value="" disabled>
                            Assign All To Vendor...
                          </option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.phone || 'No phone'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* PHONE NUMBER EDIT / OVERRIDE IF MISSING OR INVALID */}
                  {activeGroup.vendorId && !activeGroup.isPhoneValid && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.82rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ color: 'var(--color-warning-text)', fontWeight: 600 }}>Enter WhatsApp Phone:</span>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210 or +91 9876543210"
                        value={activeGroup.rawPhone}
                        onChange={(e) => handlePhoneOverrideChange(activeGroup.vendorId!, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          fontSize: '0.82rem',
                          minWidth: '220px',
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        (Will use standard 91-country code for India if 10 digits)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ITEMS REVIEW & QUANTITY TABLE */}
              {activeGroup && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Items to Request ({activeGroup.items.length})
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Quantities reflect order request, not on-hand stock
                    </span>
                  </div>

                  <div
                    style={{
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      overflow: 'hidden',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderCollapse: 'collapse',
                        fontSize: '0.83rem',
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Item</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Available</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Suggested</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600, width: '120px' }}>
                            Order Qty
                          </th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vendor</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGroup.items.map((item) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid var(--border-default)',
                              backgroundColor: 'var(--surface-card)',
                            }}
                          >
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {item.sku}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                              {item.availableQuantity} {item.unit}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--color-success-base)', fontWeight: 600 }}>
                              {item.suggestedQuantity} {item.unit}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.requestedQuantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, parseInt(e.target.value, 10))
                                  }
                                  style={{
                                    width: '65px',
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-default)',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                  }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unit}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                className="select select-xs text-[11px] bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-primary)]"
                                value={item.vendorId || 'UNASSIGNED'}
                                onChange={(e) => handleItemVendorChange(item.id, e.target.value)}
                              >
                                <option value="UNASSIGNED">Unassigned</option>
                                {vendors.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item from this reorder"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: 4,
                                }}
                              >
                                <Trash2 size={14} className="hover:text-[var(--color-danger-base)]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* OPTIONAL DELIVERY DETAILS TOGGLE */}
              <div
                style={{
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--border-default)',
                  padding: '10px 14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeliveryOptions((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--color-info-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Truck size={14} />
                  <span>{showDeliveryOptions ? '− Hide Delivery Details' : '+ Add Expected Delivery Date & Location Notes'}</span>
                </button>

                {showDeliveryOptions && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Delivery Location / Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Main Gate / Reception, Contact Accounts"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          fontSize: '0.82rem',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE MESSAGE PREVIEW & DIRECT EDITING */}
              {activeGroup && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Prefilled WhatsApp Message Preview (Editable)
                    </label>
                    {isMessageEdited[activeGroup.vendorKey] && (
                      <button
                        type="button"
                        onClick={() => handleResetMessage(activeGroup.vendorKey)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '0.72rem',
                          color: 'var(--color-info-base)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RefreshCw size={11} /> Reset to standard template
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={8}
                    value={currentMessageText}
                    onChange={(e) => handleMessageChange(activeGroup.vendorKey, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      fontSize: '0.83rem',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* POPUP BLOCKED FALLBACK ALERT */}
              {popupBlockedUrl && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-warning-surface)',
                    border: '1px solid var(--color-warning-border)',
                    color: 'var(--color-warning-text)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} className="text-[var(--color-warning-base)] shrink-0" />
                    <span>Your browser blocked the popup. Click here to open WhatsApp directly:</span>
                  </div>
                  <a
                    href={popupBlockedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-success-base)',
                      textDecoration: 'underline',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    Open WhatsApp Chat <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {/* TRANSPARENCY & INTEGRITY NOTICE */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-subtle)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                }}
              >
                <strong>Operational Guardrail:</strong> Opening WhatsApp launches WhatsApp Web or your mobile
                app with the prefilled message so you can review and tap Send. PreOne does <em>not</em> alter
                on-hand stock counts or record purchase orders as completed until you create a PO or record GRN receiving.
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER ACTIONS                                                      */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 22px',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-card)',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {activeGroup?.items.length || 0} item(s) selected for{' '}
            <strong>{activeGroup?.vendorName || 'Vendor'}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Copy Prepared Message */}
            <button
              type="button"
              onClick={handleCopyMessage}
              disabled={items.length === 0}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-secondary)',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {copiedVendorId === (activeGroup?.vendorKey || 'current') ? (
                <>
                  <Check size={15} className="text-[var(--color-success-base)]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Copy Message</span>
                </>
              )}
            </button>

            {/* 1-Tap Open WhatsApp Button */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={
                items.length === 0 ||
                !activeGroup ||
                !activeGroup.vendorId ||
                !activeGroup.isPhoneValid
              }
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor:
                  items.length === 0 || !activeGroup?.isPhoneValid
                    ? 'var(--border-default)'
                    : '#25D366',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow:
                  items.length === 0 || !activeGroup?.isPhoneValid
                    ? 'none'
                    : '0 2px 8px rgba(37, 211, 102, 0.4)',
                cursor:
                  items.length === 0 || !activeGroup?.isPhoneValid
                    ? 'not-allowed'
                    : 'pointer',
              }}
              title={
                !activeGroup?.vendorId
                  ? 'Please assign a vendor to send WhatsApp'
                  : !activeGroup?.isPhoneValid
                  ? 'Please enter a valid phone number for this vendor'
                  : 'Open WhatsApp chat with prefilled message'
              }
            >
              <MessageSquare size={16} />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
