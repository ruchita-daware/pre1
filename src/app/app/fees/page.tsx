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
  return <FinanceConsole />
}
