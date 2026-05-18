import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { loadCharacterBySlug, loadCampaignBySlug, loadCampaignSlugById } from '@/lib/database'
import { createClient } from '@/lib/supabase-server'
import { ROUTES } from '@/config/routes'
import { CharacterPageClient } from '@/components/character-page-client'

interface CharacterPageProps {
  params: Promise<{ campaignSlug: string; characterSlug: string }>
}

// Cached per-request: page + generateMetadata share one DB hit.
const getCharacterBySlug = cache(async (slug: string) => {
  const supabase = createClient()
  return loadCharacterBySlug(slug, supabase)
})

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { campaignSlug, characterSlug } = await params
  const supabase = createClient()

  // Character lookup and URL campaign lookup are independent — fire in parallel.
  const [{ character, error }, { campaign }] = await Promise.all([
    getCharacterBySlug(characterSlug),
    loadCampaignBySlug(campaignSlug, supabase),
  ])

  if (error || !character) {
    notFound()
  }

  // Verify the URL's campaign slug matches the character's actual campaign
  if (character.campaignId && (!campaign || campaign.id !== character.campaignId)) {
    // Character has moved — redirect to its actual campaign URL
    const actualCampaignSlug = await loadCampaignSlugById(character.campaignId, supabase)
    if (actualCampaignSlug) {
      redirect(ROUTES.character(actualCampaignSlug, characterSlug))
    }
    // If we can't resolve the new campaign, fall through to render
  }

  return <CharacterPageClient characterId={character.id} campaignSlug={campaignSlug} />
}

export async function generateMetadata({ params }: CharacterPageProps) {
  const { characterSlug } = await params
  const { character } = await getCharacterBySlug(characterSlug)
  return { title: character?.name || 'Character' }
}
