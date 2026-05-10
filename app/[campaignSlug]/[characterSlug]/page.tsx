import { notFound, redirect } from 'next/navigation'
import { loadCharacterBySlug, loadCampaignBySlug, loadCampaignSlugById } from '@/lib/database'
import { createClient } from '@/lib/supabase-server'
import { ROUTES } from '@/config/routes'
import { CharacterPageClient } from '@/components/character-page-client'

interface CharacterPageProps {
  params: Promise<{ campaignSlug: string; characterSlug: string }>
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { campaignSlug, characterSlug } = await params
  const supabase = createClient()

  // Load character by slug
  const { character, error } = await loadCharacterBySlug(characterSlug, supabase)
  if (error || !character) {
    notFound()
  }

  // Verify the campaign slug in the URL matches the character's actual campaign
  if (character.campaignId) {
    const { campaign } = await loadCampaignBySlug(campaignSlug, supabase)
    if (!campaign || campaign.id !== character.campaignId) {
      // Character has moved — redirect to its actual campaign URL
      const actualCampaignSlug = await loadCampaignSlugById(character.campaignId, supabase)
      if (actualCampaignSlug) {
        redirect(ROUTES.character(actualCampaignSlug, characterSlug))
      }
      // If we can't resolve the new campaign, fall through to render
    }
  }

  return <CharacterPageClient characterId={character.id} campaignSlug={campaignSlug} />
}

export async function generateMetadata({ params }: CharacterPageProps) {
  const { characterSlug } = await params
  const supabase = createClient()
  const { character } = await loadCharacterBySlug(characterSlug, supabase)
  return { title: character?.name || 'Character' }
}
