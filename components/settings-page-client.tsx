"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { ManagementInterface } from "@/components/management-interface"
import { AppHeader } from "@/components/app-header"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { UserProfile } from "@/lib/user-profiles"
import {
  loadAllCampaigns,
  loadCharactersProgressive,
  getAllUsers,
  createCampaign as createCampaignDB,
  updateCampaign as updateCampaignDB,
  deleteCampaign,
  assignCharacterToCampaign,
  removeCharacterFromCampaign,
  setActiveCampaign,
} from "@/lib/database"
import { pageCache } from "@/lib/page-cache"

interface SettingsPageClientProps {
  defaultTab?: string
}

export function SettingsPageClient({ defaultTab }: SettingsPageClientProps) {
  const cachedCampaigns = pageCache.getCampaigns()
  const cachedChars = pageCache.getAllCharacters()

  const [campaigns, setCampaigns] = useState<Campaign[]>(cachedCampaigns ?? [])
  const [characters, setCharacters] = useState<CharacterData[]>(cachedChars ?? [])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(!(cachedCampaigns && cachedChars))
  const { toast } = useToast()

  useEffect(() => {
    // Users are not cached, so always fetch them. Campaigns/characters skip the network
    // if already cached this session.
    const loadData = async () => {
      const needCampaignsChars = !(cachedCampaigns && cachedChars)
      if (needCampaignsChars) setIsLoading(true)
      try {
        const [campaignsResult, charactersResult, usersResult] = await Promise.all([
          needCampaignsChars ? loadAllCampaigns() : Promise.resolve({ campaigns: undefined }),
          needCampaignsChars ? loadCharactersProgressive() : Promise.resolve({ characters: undefined }),
          getAllUsers(),
        ])
        if (campaignsResult.campaigns) {
          setCampaigns(campaignsResult.campaigns)
          pageCache.setCampaigns(campaignsResult.campaigns)
        }
        if (charactersResult.characters) {
          setCharacters(charactersResult.characters)
          pageCache.setAllCharacters(charactersResult.characters)
        }
        if (usersResult.users) setUsers(usersResult.users)
      } catch (error) {
        console.error("Error loading settings data:", error)
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateCampaign = async (campaign: Campaign) => {
    const result = await createCampaignDB(campaign)
    if (result.success) {
      setCampaigns(prev => [...prev, campaign])
      toast({ title: "Campaign Created", description: `${campaign.name} has been created.` })
    } else {
      toast({ title: "Error", description: result.error || "Failed to create campaign", variant: "destructive" })
    }
  }

  const handleUpdateCampaign = async (campaign: Campaign) => {
    const result = await updateCampaignDB(campaign)
    if (result.success) {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c))
      toast({ title: "Campaign Updated", description: `${campaign.name} has been updated.` })
    } else {
      toast({ title: "Error", description: result.error || "Failed to update campaign", variant: "destructive" })
    }
  }

  const handleDeleteCampaign = async (campaign: Campaign) => {
    const result = await deleteCampaign(campaign.id)
    if (result.success) {
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id))
      setCharacters(prev => prev.map(char =>
        char.campaignId === campaign.id ? { ...char, campaignId: undefined } : char
      ))
      toast({ title: "Campaign Deleted", description: `${campaign.name} has been deleted.` })
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete campaign", variant: "destructive" })
    }
  }

  const handleAssignCharacterToCampaign = async (characterId: string, campaignId: string) => {
    const result = await assignCharacterToCampaign(characterId, campaignId)
    if (result.success) {
      setCharacters(prev => prev.map(char =>
        char.id === characterId ? { ...char, campaignId } : char
      ))
    } else {
      toast({ title: "Error", description: result.error || "Failed to assign character", variant: "destructive" })
    }
  }

  const handleRemoveCharacterFromCampaign = async (characterId: string) => {
    const result = await removeCharacterFromCampaign(characterId)
    if (result.success) {
      setCharacters(prev => prev.map(char =>
        char.id === characterId ? { ...char, campaignId: undefined } : char
      ))
    } else {
      toast({ title: "Error", description: result.error || "Failed to remove character", variant: "destructive" })
    }
  }

  const handleSetActiveCampaign = async (campaignId: string) => {
    const result = await setActiveCampaign(campaignId)
    if (result.success) {
      setCampaigns(prev => prev.map(c => ({
        ...c,
        isActive: c.id === campaignId ? true : c.isActive,
      })))
    } else {
      toast({ title: "Error", description: result.error || "Failed to set active campaign", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="text-muted-foreground">Loading settings…</span>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <AppHeader campaigns={campaigns} />
      <main className="flex-1 overflow-auto">
        <ManagementInterface
          campaigns={campaigns}
          characters={characters}
          users={users}
          onCreateCampaign={handleCreateCampaign}
          onUpdateCampaign={handleUpdateCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onAssignCharacterToCampaign={handleAssignCharacterToCampaign}
          onRemoveCharacterFromCampaign={handleRemoveCharacterFromCampaign}
          onSetActiveCampaign={handleSetActiveCampaign}
          defaultTab={defaultTab}
        />
      </main>
    </div>
  )
}
