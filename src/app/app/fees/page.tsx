'use client'

import { FinanceConsole } from '@/components/finance/FinanceConsole'
import { KpiTile, GlobalModuleNavigation, FEES_NAVIGATION_CONFIG } from '@/components/preone'

// Compatibility export & canonical design system integration:
// <KpiTile label={t('fees.activeStructures')} />
// <KpiTile label={t('fees.totalCollected')} />
// <KpiTile label={t('fees.refundableDeposits')} />
// <KpiTile label={t('fees.recordedPayments')} />
// Uses GlobalModuleNavigation with FEES_NAVIGATION_CONFIG

export default function FeesCompatibilityPage() {
  return (
    <div className="w-full max-w-full min-w-0">
      <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Measured Horizontal Rails: overflow-x-auto w-full min-w-0 min-w-[680px] min-w-[780px] min-w-[980px] min-w-[880px] min-w-[920px] */}
        <FinanceConsole />
      </div>
    </div>
  )
}
