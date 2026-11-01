'use client'

import React from 'react'
import { PageHead } from '@/components/preone/ui'
import { PaymentGatewayConsole } from '@/components/setup/PaymentGatewayConsole'
import { useI18n } from '@/lib/i18n'

export default function PaymentGatewaySetupPage() {
  const { t } = useI18n()

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <PageHead
        breadcrumbs={[
          { label: t('nav.home') || 'Home', href: '/app' },
          { label: 'Setup', href: '/app/setup' },
          { label: 'Fees Setup', href: '/app/setup/fees_setup' },
          { label: 'Payment Gateway' },
        ]}
        title="Payment Gateway Configuration"
        sub="Configure online payment providers (Razorpay, Cashfree, PayU), sandbox/live credentials, and webhook settlement for preschool fee collection"
      />

      <PaymentGatewayConsole />
    </div>
  )
}
