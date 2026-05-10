"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { CampaignHomepage } from "@/components/campaign-homepage"
import { CharacterSidebar } from "@/components/character-sidebar"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { CampaignNote, CampaignResource, CampaignLink } from "@/lib/database"
import {
  loadCharactersProgressive,
  loadAllCampaigns,
  getAllUsers,
  updateCampaign,
  createCampaignNote,
  updateCampaignNote,
  deleteCampaignNote,
  createCampaignResource,
  updateCampaignResource,
  deleteCampaignResource,
  createCampaignLink,
  deleteCampaignLink,
  getCampaignResources,
  getCampaignLinks,
  loadCharacter,
  saveCharacter,
} from "@/lib/database"
import { ROUTES } from "@/config/routes"
import { AppHeader } from "@/components/app-header"
import { useUser } from "@/lib/user-context"
import { Skeleton } from "@/components/ui/skeleton"
import { pageCache } from "@/lib/page-cache"
import { applyLongRestToCharacters } from "@/lib/long-rest-utils"
import { LongRestModal } from "@/components/edit-modals/long-rest-modal"
import { DiceRollModal } from "@/components/edit-modals/dice-roll-modal"
import { SpellLibraryModal } from "@/components/edit-modals/spell-library-modal"
import { CampaignCreationModal } from "@/components/edit-modals/campaign-creation-modal"
import { CharacterCreationModal } from "@/components/edit-modals/character-creation-modal"
import { createCharacter, type CharacterCreationData } from "@/lib/character-creation-utils"

interface CampaignPageClientProps {
  campaign: Campaign
}

export function CampaignPageClient({ campaign }: CampaignPageClientProps) {
  // Seed state from cache for instant render on revisit
  const cachedPage = pageCache.getCampaignPage(campaign.id)
  const cachedCampaigns = pageCache.getCampaigns()

  const [characters, setCharacters] = useState<CharacterData[]>(cachedPage?.characters ?? [])
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>(cachedCampaigns ?? [campaign])
  const [users, setUsers] = useState<any[]>(cachedPage?.users ?? pageCache.getUsers() ?? [])
  const [resources, setResources] = useState<CampaignResource[]>(cachedPage?.resources ?? [])
  const [links, setLinks] = useState<CampaignLink[]>(cachedPage?.links ?? [])
  const [currentCampaign, setCurrentCampaign] = useState<Campaign>(campaign)
  // Only show skeleton if there's nothing cached yet
  const [isLoading, setIsLoading] = useState(!cachedPage)
  // Modal state
  const [longRestModalOpen, setLongRestModalOpen] = useState(false)
  const [diceRollModalOpen, setDiceRollModalOpen] = useState(false)
  const [spellLibraryModalOpen, setSpellLibraryModalOpen] = useState(false)
  const [editCampaignModalOpen, setEditCampaignModalOpen] = useState(false)
  const [characterCreationModalOpen, setCharacterCreationModalOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()

  useEffect(() => {
    if (cachedPage) return // Already loaded this session — use cache

    const loadData = async () => {
      const [charsResult, usersResult, resourcesResult, linksResult, campaignsResult] = await Promise.all([
        loadCharactersProgressive(campaign.id),
        getAllUsers(),
        getCampaignResources(campaign.id),
        getCampaignLinks(campaign.id),
        loadAllCampaigns(),
      ])
      const newCampaigns = campaignsResult.campaigns ?? []
      const newChars = charsResult.characters ?? []
      const newUsers = usersResult.users ?? []
      const newResources = resourcesResult.resources ?? []
      const newLinks = linksResult.links ?? []

      setAllCampaigns(newCampaigns)
      setCharacters(newChars)
      setUsers(newUsers)
      setResources(newResources)
      setLinks(newLinks)

      pageCache.setCampaigns(newCampaigns)
      pageCache.setUsers(newUsers)
      pageCache.setCampaignPage(campaign.id, {
        characters: newChars,
        users: newUsers,
        resources: newResources,
        links: newLinks,
      })

      // Merge this campaign's characters into the all-characters cache so that
      // CharacterSheetContent can take its fast path (no loading screen) when
      // the user navigates from this campaign page to a character page.
      const existingAll = pageCache.getAllCharacters() ?? []
      const thisIds = new Set(newChars.map(c => c.id))
      pageCache.setAllCharacters([...existingAll.filter(c => !thisIds.has(c.id)), ...newChars])

      setIsLoading(false)
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id])

  const handleSelectCharacter = (id: string) => {
    const character = characters.find(c => c.id === id)
    if (character?.slug && currentCampaign.slug) {
      router.push(ROUTES.character(currentCampaign.slug, character.slug))
    }
  }

  const handleUpdateCampaign = async (updated: Campaign) => {
    const result = await updateCampaign(updated)
    if (result.success) {
      setCurrentCampaign(updated)
      setAllCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
      pageCache.invalidateCampaignPage(updated.id)
    } else {
      toast({ title: "Error", description: result.error || "Failed to update campaign", variant: "destructive" })
    }
  }

  const handleToggleLevelUpMode = async () => {
    const updated = { ...currentCampaign, levelUpModeEnabled: !currentCampaign.levelUpModeEnabled }
    await handleUpdateCampaign(updated)
  }

  const handleCreateCharacter = async (formData: CharacterCreationData) => {
    const result = await createCharacter(formData, {
      existingCharacterCount: characters.length,
      isGuest: !user,
      currentCampaign,
    })
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" })
      return
    }
    const newChar = result.character!
    setCharacters(prev => [...prev, newChar])
    pageCache.invalidateCampaignPage(currentCampaign.id)
    toast({ title: "Success", description: `${newChar.name} created and added to ${currentCampaign.name}!` })
  }

  const handleCreateNote = async (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await createCampaignNote(note)
    if (!result.note) {
      toast({ title: "Error", description: result.error || "Failed to create note", variant: "destructive" })
    }
  }

  const handleUpdateNote = async (id: string, updates: Partial<Pick<CampaignNote, 'title' | 'content' | 'session_date' | 'members_attending'>>) => {
    await updateCampaignNote(id, updates)
  }

  const handleDeleteNote = async (id: string) => {
    await deleteCampaignNote(id)
  }

  const handleCreateResource = async (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await createCampaignResource(resource)
    if (result.resource) {
      setResources(prev => [...prev, result.resource!])
    } else {
      toast({ title: "Error", description: result.error || "Failed to create resource", variant: "destructive" })
    }
  }

  const handleUpdateResource = async (id: string, updates: Partial<Pick<CampaignResource, 'title' | 'content'>>) => {
    const result = await updateCampaignResource(id, updates)
    if (result.resource) {
      setResources(prev => prev.map(r => r.id === id ? result.resource! : r))
    }
  }

  const handleDeleteResource = async (id: string) => {
    const result = await deleteCampaignResource(id)
    if (result.success) {
      setResources(prev => prev.filter(r => r.id !== id))
    }
  }

  const handleCreateLink = async (link: Omit<CampaignLink, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await createCampaignLink(link)
    if (result.link) {
      setLinks(prev => [...prev, result.link!])
    }
  }

  const handleDeleteLink = async (id: string) => {
    const result = await deleteCampaignLink(id)
    if (result.success) {
      setLinks(prev => prev.filter(l => l.id !== id))
    }
  }

  const handleConfirmLongRest = async (selectedCharacterIds: string[]) => {
    if (selectedCharacterIds.length === 0) return
    try {
      // Load full character data for each selected character
      const freshResults = await Promise.all(selectedCharacterIds.map(id => loadCharacter(id)))
      const freshChars = freshResults.map(r => r.character).filter((c): c is CharacterData => !!c)
      if (freshChars.length === 0) return

      const { updatedCharacters } = applyLongRestToCharacters(freshChars, selectedCharacterIds)

      // Save all updated characters to the database
      await Promise.all(updatedCharacters.map(c => saveCharacter(c)))

      // Update local characters state (minimal data — just refresh from updated full data)
      setCharacters(prev => prev.map(c => {
        const updated = updatedCharacters.find(u => u.id === c.id)
        return updated ? { ...c, currentHitPoints: updated.currentHitPoints } : c
      }))

      // Invalidate campaign page cache so next visit re-fetches
      pageCache.invalidateCampaignPage(campaign.id)

      setLongRestModalOpen(false)
      toast({
        title: "Long Rest Complete",
        description: `${selectedCharacterIds.length} character${selectedCharacterIds.length !== 1 ? 's' : ''} completed a long rest.`,
      })
    } catch (err) {
      console.error('Long rest error:', err)
      toast({ title: "Error", description: "Failed to apply long rest effects.", variant: "destructive" })
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <AppHeader campaigns={allCampaigns} selectedCampaignId={currentCampaign.id} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton or real sidebar */}
        {isLoading ? (
          <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col p-4 gap-3 flex-shrink-0">
            <Skeleton className="h-3 w-24 mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          characters.length > 0 && (
            <CharacterSidebar
              characters={characters}
              campaigns={allCampaigns}
              selectedCampaignId={currentCampaign.id}
              onCampaignChange={(id) => {
                const camp = allCampaigns.find(c => c.id === id)
                if (camp?.slug) router.push(ROUTES.campaign(camp.slug))
              }}
              activeCharacterId=""
              onSelectCharacter={handleSelectCharacter}
              onCreateCharacter={() => {}}
              onStartLongRest={() => setLongRestModalOpen(true)}
              onOpenDiceRoll={() => setDiceRollModalOpen(true)}
              onOpenSpellLibrary={() => setSpellLibraryModalOpen(true)}
              currentUserId={user?.id}
              currentView="campaign"
            />
          )
        )}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="space-y-6">
              {/* Campaign header skeleton */}
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
              {/* Character grid skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
              {/* Content sections skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-3 border rounded-lg p-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CampaignHomepage
              campaign={currentCampaign}
              characters={characters}
              users={users}
              resources={resources}
              links={links}
              onSelectCharacter={handleSelectCharacter}
              onBackToCharacters={() => router.push(ROUTES.home)}
              onEditCampaign={() => setEditCampaignModalOpen(true)}
              onCreateCharacter={() => setCharacterCreationModalOpen(true)}
              onStartLongRest={() => setLongRestModalOpen(true)}
              onToggleLevelUpMode={handleToggleLevelUpMode}
              onUpdateCampaign={handleUpdateCampaign}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onCreateResource={handleCreateResource}
              onUpdateResource={handleUpdateResource}
              onDeleteResource={handleDeleteResource}
              onCreateLink={handleCreateLink}
              onDeleteLink={handleDeleteLink}
            />
          )}
        </main>
      </div>

      {/* Long Rest Modal */}
      <LongRestModal
        isOpen={longRestModalOpen}
        onClose={() => setLongRestModalOpen(false)}
        characters={characters}
        campaigns={allCampaigns}
        selectedCampaignId={currentCampaign.id}
        onConfirmLongRest={handleConfirmLongRest}
      />

      {/* Dice Roll Modal — basic mode (no active character) */}
      <DiceRollModal
        isOpen={diceRollModalOpen}
        onClose={() => setDiceRollModalOpen(false)}
      />

      {/* Spell Library Modal — browse mode */}
      <SpellLibraryModal
        isOpen={spellLibraryModalOpen}
        onClose={() => setSpellLibraryModalOpen(false)}
        characters={characters}
        campaigns={allCampaigns}
        selectedCampaignId={currentCampaign.id}
        currentUserId={user?.id}
        onAddSpell={() => {}}
        onCreateNewSpell={() => {}}
        canAddToSheet={false}
      />

      {/* Edit Campaign Modal */}
      <CampaignCreationModal
        isOpen={editCampaignModalOpen}
        onClose={() => setEditCampaignModalOpen(false)}
        editingCampaign={currentCampaign}
        onSave={async (updated) => {
          await handleUpdateCampaign(updated)
          setEditCampaignModalOpen(false)
        }}
      />

      {/* Character Creation Modal */}
      <CharacterCreationModal
        isOpen={characterCreationModalOpen}
        onClose={() => setCharacterCreationModalOpen(false)}
        onCreateCharacter={handleCreateCharacter}
        currentUserId={user?.id}
        dungeonMasterId={currentCampaign.dungeonMasterId}
        campaignId={currentCampaign.id}
      />
    </div>
  )
}
