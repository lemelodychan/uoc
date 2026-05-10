import { notFound } from 'next/navigation'
import { loadCampaignBySlug } from '@/lib/database'
import { createClient } from '@/lib/supabase-server'
import { CampaignPageClient } from '@/components/campaign-page-client'

interface CampaignPageProps {
  params: Promise<{ campaignSlug: string }>
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { campaignSlug } = await params
  const supabase = createClient()
  const { campaign, error } = await loadCampaignBySlug(campaignSlug, supabase)

  if (error || !campaign) {
    notFound()
  }

  return <CampaignPageClient campaign={campaign} />
}

export async function generateMetadata({ params }: CampaignPageProps) {
  const { campaignSlug } = await params
  const supabase = createClient()
  const { campaign } = await loadCampaignBySlug(campaignSlug, supabase)
  return { title: campaign?.name || 'Campaign' }
}
