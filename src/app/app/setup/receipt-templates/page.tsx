'use client'

import React from 'react'
import { PageHead } from '@/components/preone/ui'
import { ReceiptTemplateStudio } from '@/components/setup/ReceiptTemplateStudio'
import { useI18n } from '@/lib/i18n'

export default function ReceiptTemplatesSetupPage() {
  const { t } = useI18n()

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <PageHead
        breadcrumbs={[
          { label: t('nav.home') || 'Home', href: '/app' },
          { label: 'Setup', href: '/app/setup' },
          { label: 'Fees Setup', href: '/app/setup/fees_setup' },
          { label: 'Receipt Templates' },
        ]}
        title="Fee Receipt Template Studio"
        sub="Design and map dynamic fee receipt templates with visual layouts, sample previews, and Template Studio integration"
      />

      <ReceiptTemplateStudio />
    </div>
  )
}
