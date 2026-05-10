import { SettingsPageClient } from '@/components/settings-page-client'

export const metadata = { title: 'Settings — Campaigns' }

export default function SettingsCampaignsPage() {
  return <SettingsPageClient defaultTab="campaigns" />
}
