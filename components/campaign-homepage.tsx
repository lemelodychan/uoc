"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@iconify/react"
import type { CharacterData, Campaign } from "@/lib/character-data"
import { getAllUsers } from "@/lib/database"

interface CampaignHomepageProps {
  campaign: Campaign | undefined
  characters: CharacterData[]
  onSelectCharacter: (id: string) => void
  onBackToCharacters: () => void
  onEditCampaign?: () => void
  onCreateCharacter?: () => void
  currentUserId?: string
  onStartLongRest?: () => void
}

export function CampaignHomepage({ 
  campaign, 
  characters, 
  onSelectCharacter, 
  onBackToCharacters,
  onEditCampaign,
  onCreateCharacter,
  currentUserId,
  onStartLongRest
}: CampaignHomepageProps) {
  const [users, setUsers] = useState<any[]>([])

  // Fetch all users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      const { users: fetchedUsers, error } = await getAllUsers()
      if (error) {
        console.error("Failed to load users:", error)
      } else {
        setUsers(fetchedUsers || [])
      }
    }
    fetchUsers()
  }, [])
  // Filter characters for this campaign
  const campaignCharacters = characters.filter(char => 
    char.campaignId === campaign?.id
  )

  // Group characters by status
  const charactersByStatus = campaignCharacters.reduce((acc, character) => {
    const status = character.partyStatus || 'active'
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(character)
    return acc
  }, {} as Record<string, CharacterData[]>)

  // Helper function to get character level display
  const getCharacterLevelDisplay = (character: CharacterData) => {
    if (character.level && character.class) {
      return `Level ${character.level} ${character.class}`
    }
    return character.class || 'Unknown Class'
  }

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  // Helper function to get dungeon master display name
  const getDungeonMasterName = () => {
    if (!campaign?.dungeonMasterId) return 'No DM assigned'
    const dm = users.find(user => user.userId === campaign.dungeonMasterId)
    return dm ? dm.displayName || `User ${dm.userId.slice(0, 8)}...` : 'Unknown DM'
  }

  // Check if current user is the dungeon master
  const isDungeonMaster = campaign?.dungeonMasterId === currentUserId

  // Status configuration
  const statusConfig = {
    active: { label: 'Active', icon: 'lucide:user-check', color: 'text-green-500' },
    away: { label: 'Away', icon: 'lucide:user-x', color: 'text-yellow-500' },
    deceased: { label: 'Deceased', icon: 'lucide:skull', color: 'text-red-500' },
    inactive: { label: 'Inactive', icon: 'lucide:user-minus', color: 'text-gray-500' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold font-display flex items-center gap-3">
                {campaign?.name || 'Campaign'}
                {campaign?.isActive && (
                  <Badge variant="secondary" className="text-sm">
                    Active
                  </Badge>
                )}
              </h1>
              {campaign?.description && (
                <p className="text-muted-foreground mb-2">{campaign.description}</p>
              )}
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:calendar" className="w-4 h-4" /> 
                  Started {formatDate(campaign?.created_at)}
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:crown" className="w-4 h-4" /> 
                  {getDungeonMasterName()}
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:users" className="w-4 h-4" /> 
                  {campaignCharacters.length} {campaignCharacters.length === 1 ? 'Character' : 'Characters'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex self-start justify-start content-start gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEditCampaign}
              className="flex items-center gap-2"
            >
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit Campaign
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onCreateCharacter}
              className="flex items-center gap-2"
            >
              <Icon icon="lucide:user-plus" className="w-4 h-4" />
              Add new Character
            </Button>
          </div>
        </div>
      </div>

      {/* Dungeon Master Controls */}
      {isDungeonMaster && (
        <Card className="bg-primary text-primary-foreground border-0 flex-row items-center">
          <CardHeader className="w-full">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon icon="lucide:crown" className="w-5 h-5 text-primary-foreground" />
              Dungeon Master Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full flex justify-end content-end align-end items-end">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={onStartLongRest}
                className="flex items-center gap-2"
              >
                <Icon icon="lucide:moon" className="w-4 h-4" />
                Start Long Rest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateCharacter}
                className="flex items-center gap-2 text-foreground"
              >
                <Icon icon="lucide:user-plus" className="w-4 h-4" />
                Add NPC
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          Coming soon
        </CardContent>
      </Card>
    </div>
  )
}
