'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Key,
  Lock,
  Globe,
  Radio,
  ExternalLink,
  Sliders,
  Check,
  Building2,
  HelpCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react'
import { StatusBadge, KpiTile, EmptyState } from '@/components/preone/ui'
import { Modal } from '@/components/preone/Modal'
import { useToast } from '@/components/preone/Toast'

interface GatewayProviderMeta {
  id: string
  name: string
  description: string
  fields: string[]
  supportedMethods: string[]
  sandboxPrefix: string
  productionPrefix: string
}

interface GatewayConfig {
  provider: string
  name: string
  enabled: boolean
  mode: 'SANDBOX' | 'PRODUCTION'
  keyId: string
  rawKeyId?: string
  merchantId: string
  hasKeySecret: boolean
  currency: string
  supportedMethods: string[]
  webhookConfigured: boolean
  webhookSecretMasked: string
  webhookUrl: string
  lastVerifiedAt: string | null
  lastVerificationSuccess: boolean | null
  lastVerificationMessage: string | null
  availableProviders: GatewayProviderMeta[]
}

export function PaymentGatewayConsole({ onUpdated }: { onUpdated?: () => void }) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<GatewayConfig | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showKeySecretInput, setShowKeySecretInput] = useState(false)

  // Form state
  const [form, setForm] = useState({
    provider: 'RAZORPAY',
    name: 'Primary Fees Gateway',
    enabled: true,
    mode: 'SANDBOX' as 'SANDBOX' | 'PRODUCTION',
    merchantId: '',
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    supportedMethods: ['UPI', 'CARD', 'NET_BANKING'],
  })

  const loadGatewayConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/finance/gateway', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.success) {
        setConfig(data.data)
        const g = data.data
        setForm({
          provider: g.provider || 'RAZORPAY',
          name: g.name || 'Primary Fees Gateway',
          enabled: Boolean(g.enabled),
          mode: g.mode || 'SANDBOX',
          merchantId: g.merchantId || '',
          keyId: g.rawKeyId || g.keyId || '',
          keySecret: '',
          webhookSecret: '',
          supportedMethods: g.supportedMethods || ['UPI', 'CARD', 'NET_BANKING'],
        })
      } else {
        toast.error('Failed to load gateway', data.error?.message || 'Server error')
      }
    } catch (e: any) {
      toast.error('Connection Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadGatewayConfig()
  }, [loadGatewayConfig])

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await fetch('/api/v1/finance/gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok && data.success && data.data?.success) {
        toast.success('Connection Verified', data.data.message)
        loadGatewayConfig()
      } else {
        const msg = data.data?.message || data.error?.message || 'Verification test failed'
        toast.error('Verification Failed', msg)
        loadGatewayConfig()
      }
    } catch (e: any) {
      toast.error('Network Error', e.message)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleToggleActive = async (newEnabled: boolean) => {
    try {
      const res = await fetch('/api/v1/finance/gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          newEnabled ? 'Gateway Activated' : 'Gateway Deactivated',
          `Payment gateway is now ${newEnabled ? 'ACTIVE' : 'INACTIVE'}`
        )
        loadGatewayConfig()
        onUpdated?.()
      } else {
        toast.error('Failed to update status', data.error?.message)
      }
    } catch (e: any) {
      toast.error('Error', e.message)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.keyId.trim()) {
      toast.error('Key ID Required', 'Please enter your Gateway Key ID / Client ID')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        provider: form.provider,
        name: form.name.trim(),
        enabled: form.enabled,
        mode: form.mode,
        merchantId: form.merchantId.trim(),
        keyId: form.keyId.trim(),
        supportedMethods: form.supportedMethods,
      }
      if (form.keySecret.trim()) {
        payload.keySecret = form.keySecret.trim()
      }
      if (form.webhookSecret.trim()) {
        payload.webhookSecret = form.webhookSecret.trim()
      }

      const res = await fetch('/api/v1/finance/gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Gateway Saved', 'Configuration saved securely. Testing connection...')
        setShowConfigModal(false)
        await loadGatewayConfig()
        handleTestConnection()
        onUpdated?.()
      } else {
        toast.error('Failed to save', data.error?.message || 'Server rejected gateway settings')
      }
    } catch (e: any) {
      toast.error('Save Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied', `${label} copied to clipboard`)
  }

  const selectedProviderMeta =
    config?.availableProviders.find((p) => p.id === form.provider) ||
    config?.availableProviders[0]

  return (
    <div className="space-y-6">
      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiTile
          label="Gateway Provider"
          value={config?.provider || 'Razorpay'}
          meta={config?.name || 'Primary Gateway'}
          icon={<CreditCard className="size-5 text-indigo-600" />}
          iconClass="ic-purple"
        />
        <KpiTile
          label="Operating Environment"
          value={config?.mode === 'PRODUCTION' ? 'Production (Live)' : 'Sandbox (Test)'}
          meta={config?.mode === 'PRODUCTION' ? 'Real payments enabled' : 'Safe testing environment'}
          icon={<Radio className="size-5 text-emerald-600" />}
          iconClass={config?.mode === 'PRODUCTION' ? 'ic-emerald' : 'ic-blue'}
        />
        <KpiTile
          label="Gateway Status"
          value={config?.enabled ? 'ACTIVE' : 'INACTIVE'}
          meta={config?.enabled ? 'Online fee collection on' : 'Online fees paused'}
          icon={<ShieldCheck className="size-5 text-emerald-600" />}
          iconClass={config?.enabled ? 'ic-emerald' : 'ic-amber'}
        />
        <KpiTile
          label="Connection Health"
          value={
            config?.lastVerificationSuccess === true
              ? 'Verified'
              : config?.lastVerificationSuccess === false
              ? 'Check Failed'
              : 'Unverified'
          }
          meta={
            config?.lastVerifiedAt
              ? `Tested ${new Date(config.lastVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Requires validation test'
          }
          icon={<Zap className="size-5 text-purple-600" />}
          iconClass={config?.lastVerificationSuccess ? 'ic-emerald' : 'ic-amber'}
        />
      </div>

      {/* Main Gateway Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shadow-xs">
                💳
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{config?.name || 'Primary Payment Gateway'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    config?.enabled
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {config?.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                    config?.mode === 'PRODUCTION'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {config?.mode === 'PRODUCTION' ? 'LIVE' : 'TEST MODE'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provider: <strong className="text-slate-700 dark:text-slate-200">{config?.provider || 'RAZORPAY'}</strong> • Bank-grade encrypted credential storage
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${testingConnection ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {config?.enabled ? (
              <button
                type="button"
                onClick={() => handleToggleActive(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleActive(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                Activate Gateway
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setForm({
                  provider: config?.provider || 'RAZORPAY',
                  name: config?.name || 'Primary Fees Gateway',
                  enabled: Boolean(config?.enabled),
                  mode: config?.mode || 'SANDBOX',
                  merchantId: config?.merchantId || '',
                  keyId: config?.rawKeyId || config?.keyId || '',
                  keySecret: '',
                  webhookSecret: '',
                  supportedMethods: config?.supportedMethods || ['UPI', 'CARD', 'NET_BANKING'],
                })
                setShowConfigModal(true)
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Sliders className="size-3.5" />
              <span>Configure Credentials</span>
            </button>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {config?.lastVerifiedAt && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              config.lastVerificationSuccess
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-200'
                : 'bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-200'
            }`}
          >
            {config.lastVerificationSuccess ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="font-semibold block">
                {config.lastVerificationSuccess ? 'Gateway Verification Successful' : 'Gateway Verification Failed'}
              </span>
              <p className="opacity-90">{config.lastVerificationMessage}</p>
            </div>
          </div>
        )}

        {/* Credential Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
            <div className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Key className="size-3 text-indigo-500" />
              API Key & Client ID
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Key ID / Public Key:</div>
              <div className="font-mono font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>{config?.keyId || '(Not configured)'}</span>
                {config?.keyId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(config.rawKeyId || config.keyId, 'Key ID')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Client Secret:</div>
              <div className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>{config?.hasKeySecret ? '••••••••••••••••••••••••' : '(Not configured)'}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {config?.hasKeySecret ? 'Encrypted' : 'Missing'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
            <div className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Globe className="size-3 text-emerald-500" />
              Webhook & Realtime Settlement
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Webhook Endpoint URL:</div>
              <div className="font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="truncate">{config?.webhookUrl || '/api/v1/payments/webhook'}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${window.location.origin}${config?.webhookUrl || '/api/v1/payments/webhook'}`, 'Webhook URL')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 ml-2"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 dark:text-slate-400">Webhook Secret:</div>
              <div className="font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>{config?.webhookSecretMasked || '(Not configured)'}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  {config?.webhookConfigured ? 'HMAC-SHA256' : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Payment Methods Pills */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Enabled Payment Methods for Parents:
          </div>
          <div className="flex flex-wrap gap-2">
            {['UPI', 'CARD', 'NET_BANKING', 'WALLET'].map((m) => {
              const active = config?.supportedMethods?.includes(m)
              return (
                <span
                  key={m}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                  }`}
                >
                  {active ? <Check className="size-3" /> : null}
                  <span>{m === 'NET_BANKING' ? 'Net Banking' : m}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Provider Overview Cards */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Supported Payment Gateways</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(config?.availableProviders || []).map((prov) => {
            const isSelected = config?.provider === prov.id
            return (
              <div
                key={prov.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/30 dark:border-indigo-500/60 dark:bg-indigo-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{prov.name}</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{prov.description}</p>
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                      Current
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Supported: <strong className="text-slate-900 dark:text-white">{prov.supportedMethods.join(', ')}</strong></div>
                  <div>Test Prefix: <code className="font-mono text-indigo-600 dark:text-indigo-400">{prov.sandboxPrefix}</code></div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, provider: prov.id }))
                      setShowConfigModal(true)
                    }}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {isSelected ? 'Edit Settings' : `Switch to ${prov.name}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <Modal
          title={`Configure Payment Gateway — ${selectedProviderMeta?.name || form.provider}`}
          open={showConfigModal}
          onClose={() => setShowConfigModal(false)}
        >
          <form onSubmit={handleSaveConfig} className="space-y-4 p-1 max-h-[80vh] overflow-y-auto">
            {/* Provider Switcher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Select Gateway Provider *
              </label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="RAZORPAY">Razorpay (Recommended for Indian Schools)</option>
                <option value="CASHFREE">Cashfree Payments</option>
                <option value="PAYU">PayU India</option>
              </select>
            </div>

            {/* Config Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Configuration Display Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Campus Razorpay Gateway"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Operating Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Operating Environment *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'SANDBOX' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.mode === 'SANDBOX'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">🧪 Sandbox (Test Mode)</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Test simulated card & UPI transactions with mock money.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, mode: 'PRODUCTION' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.mode === 'PRODUCTION'
                      ? 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold">⚡ Production (Live Mode)</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Process real payments deposited directly to school bank account.</div>
                </button>
              </div>
            </div>

            {/* Key ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {form.provider === 'CASHFREE' ? 'App ID / Client ID *' : form.provider === 'PAYU' ? 'Merchant Key *' : 'Key ID / Client ID *'}
              </label>
              <input
                type="text"
                required
                value={form.keyId}
                onChange={(e) => setForm({ ...form, keyId: e.target.value })}
                placeholder={
                  form.mode === 'SANDBOX'
                    ? (form.provider === 'RAZORPAY' ? 'rzp_test_xxxxxxx' : 'TEST_xxxxxxx')
                    : (form.provider === 'RAZORPAY' ? 'rzp_live_xxxxxxx' : 'LIVE_xxxxxxx')
                }
                className="w-full font-mono text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {form.mode === 'SANDBOX' && form.provider === 'RAZORPAY' ? 'Must begin with "rzp_test_"' : 'Available in your provider dashboard'}
              </span>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {form.provider === 'PAYU' ? 'Merchant Salt *' : 'Secret Key / Client Secret *'}
              </label>
              <div className="relative">
                <input
                  type={showKeySecretInput ? 'text' : 'password'}
                  value={form.keySecret}
                  onChange={(e) => setForm({ ...form, keySecret: e.target.value })}
                  placeholder={config?.hasKeySecret ? '(Secret key saved — enter only to update)' : 'Enter Secret Key'}
                  className="w-full font-mono text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKeySecretInput(!showKeySecretInput)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showKeySecretInput ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Never shared publicly. Encrypted at rest.
              </span>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Webhook Secret (For Instant Verification & Callback Signing)
              </label>
              <input
                type="text"
                value={form.webhookSecret}
                onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                placeholder={config?.webhookConfigured ? '(Webhook secret configured — enter only to update)' : 'e.g. whsec_xxxxxxx'}
                className="w-full font-mono text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Enabled Payment Methods */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Accepted Payment Methods
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)' },
                  { id: 'CARD', label: 'Credit & Debit Cards' },
                  { id: 'NET_BANKING', label: 'Net Banking (50+ Banks)' },
                  { id: 'WALLET', label: 'Digital Wallets & EMI' },
                ].map((item) => {
                  const checked = form.supportedMethods.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, supportedMethods: [...form.supportedMethods, item.id] })
                          } else {
                            setForm({ ...form, supportedMethods: form.supportedMethods.filter((x) => x !== item.id) })
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-800 dark:text-slate-200">{item.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Enable Gateway for Fee Payments
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  When enabled, parents will be presented with online payment links on their invoices.
                </span>
              </div>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="size-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Verify Connection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
