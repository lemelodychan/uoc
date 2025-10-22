"use client"

import { useState, useMemo, useEffect } from "react"
import { fromZonedTime, toZonedTime, format, formatInTimeZone } from 'date-fns-tz'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Icon } from "@iconify/react"
import type { CharacterData, Campaign } from "@/lib/character-data"
import type { CampaignNote, CampaignResource, CampaignLink } from "@/lib/database"
import { CampaignNoteModal } from "./edit-modals/campaign-note-modal"
import { CampaignNoteReadModal } from "./edit-modals/campaign-note-read-modal"
import { CampaignResourceModal } from "./edit-modals/campaign-resource-modal"
import { CampaignResourceReadModal } from "./edit-modals/campaign-resource-read-modal"
import { CampaignLinkModal } from "./edit-modals/campaign-link-modal"
import { useCampaignNotes } from "@/hooks/use-campaign-notes"
import { CampaignNotesSkeleton, CampaignNotesListSkeleton, CampaignNotesEmptySkeleton } from "./campaign-notes-skeleton"

interface CampaignHomepageProps {
  campaign: Campaign | undefined
  characters: CharacterData[]
  users: any[]
  resources?: CampaignResource[]
  links?: CampaignLink[]
  onSelectCharacter: (id: string) => void
  onBackToCharacters: () => void
  onEditCampaign?: () => void
  onCreateCharacter?: () => void
  currentUserId?: string
  onStartLongRest?: () => void
  onToggleLevelUpMode?: () => void
  levelUpModeEnabled?: boolean
  onUpdateCampaign?: (campaign: Campaign) => void
  onCreateNote?: (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>) => void
  onUpdateNote?: (id: string, updates: Partial<Pick<CampaignNote, 'title' | 'content' | 'session_date' | 'members_attending'>>) => void
  onDeleteNote?: (id: string) => void
  onCreateResource?: (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>) => void
  onUpdateResource?: (id: string, updates: Partial<Pick<CampaignResource, 'title' | 'content'>>) => void
  onDeleteResource?: (id: string) => void
  onCreateLink?: (link: Omit<CampaignLink, 'id' | 'created_at' | 'updated_at'>) => void
  onDeleteLink?: (id: string) => void
}

export function CampaignHomepage({ 
  campaign, 
  characters, 
  users,
  resources = [],
  links = [],
  onSelectCharacter, 
  onBackToCharacters,
  onEditCampaign,
  onCreateCharacter,
  currentUserId,
  onStartLongRest,
  onToggleLevelUpMode,
  levelUpModeEnabled = false,
  onUpdateCampaign,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onCreateResource,
  onUpdateResource,
  onDeleteResource,
  onCreateLink,
  onDeleteLink
}: CampaignHomepageProps) {
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<CampaignNote | null>(null)
  const [readModalOpen, setReadModalOpen] = useState(false)
  const [readingNote, setReadingNote] = useState<CampaignNote | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'resources'>('overview')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionTime, setSessionTime] = useState('15:00')
  const [sessionTimezone, setSessionTimezone] = useState('Europe/Amsterdam')
  const [sessionNumber, setSessionNumber] = useState('')
  const [dmControlsExpanded, setDmControlsExpanded] = useState(false)
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<CampaignResource | null>(null)
  const [resourceReadModalOpen, setResourceReadModalOpen] = useState(false)
  const [readingResource, setReadingResource] = useState<CampaignResource | null>(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  
  // Use campaign notes hook with caching
  const { 
    notes, 
    loading: notesLoading, 
    error: notesError, 
    fromCache, 
    isStale, 
    refresh: refreshNotes,
    invalidateCache: invalidateNotesCache 
  } = useCampaignNotes(campaign?.id)
  
  // Load existing session data when campaign changes
  useEffect(() => {
    if (campaign?.nextSessionDate) {
      // Parse the stored date to get the date part
      const storedDate = new Date(campaign.nextSessionDate)
      const dateString = storedDate.toISOString().split('T')[0]
      setSessionDate(dateString)
    }
    if (campaign?.nextSessionTime) {
      setSessionTime(campaign.nextSessionTime)
    }
    if (campaign?.nextSessionTimezone) {
      setSessionTimezone(campaign.nextSessionTimezone)
    }
    if (campaign?.nextSessionNumber) {
      setSessionNumber(campaign.nextSessionNumber.toString())
    }
  }, [campaign?.id, campaign?.nextSessionDate, campaign?.nextSessionTime, campaign?.nextSessionTimezone, campaign?.nextSessionNumber])
  
  // Sort notes by session date (fallback to created_at) with configurable order
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      // Use session_date if available, otherwise fallback to created_at
      const dateA = a.session_date ? new Date(a.session_date) : new Date(a.created_at)
      const dateB = b.session_date ? new Date(b.session_date) : new Date(b.created_at)
      
      if (sortOrder === 'asc') {
        return dateA.getTime() - dateB.getTime()
      } else {
        return dateB.getTime() - dateA.getTime()
      }
    })
  }, [notes, sortOrder])

  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [resources])

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

  // Helper functions for notes
  const handleCreateNote = () => {
    setEditingNote(null)
    setNoteModalOpen(true)
  }

  const handleEditNote = (note: CampaignNote) => {
    setEditingNote(note)
    setNoteModalOpen(true)
  }

  // Helper functions for resources
  const handleCreateResource = () => {
    setEditingResource(null)
    setResourceModalOpen(true)
  }

  const handleEditResource = (resource: CampaignResource) => {
    setEditingResource(resource)
    setResourceModalOpen(true)
  }

  const handleReadResource = (resource: CampaignResource) => {
    setReadingResource(resource)
    setResourceReadModalOpen(true)
  }

  const handleSaveResource = async (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingResource) {
      await onUpdateResource?.(editingResource.id, { title: resource.title, content: resource.content })
    } else {
      await onCreateResource?.(resource)
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      await onDeleteResource?.(resourceId)
    }
  }

  const handleEditResourceFromRead = () => {
    if (readingResource) {
      setEditingResource(readingResource)
      setResourceReadModalOpen(false)
      setResourceModalOpen(true)
    }
  }

  const handleDeleteResourceFromRead = async () => {
    if (readingResource) {
      await handleDeleteResource(readingResource.id)
      setResourceReadModalOpen(false)
    }
  }

  // Helper functions for links
  const handleOpenAddLink = () => setLinkModalOpen(true)

  const handleReadNote = (note: CampaignNote) => {
    setReadingNote(note)
    setReadModalOpen(true)
  }

  const handleEditFromRead = () => {
    if (readingNote) {
      setEditingNote(readingNote)
      setReadModalOpen(false)
      setNoteModalOpen(true)
    }
  }

  const handleDeleteFromRead = async () => {
    if (readingNote) {
      await handleDeleteNote(readingNote.id)
      setReadModalOpen(false)
    }
  }

  const handleSaveNote = async (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingNote) {
      await onUpdateNote?.(editingNote.id, { 
        title: note.title, 
        content: note.content,
        session_date: note.session_date,
        members_attending: note.members_attending
      })
    } else {
      await onCreateNote?.(note)
    }
    // Cache will be updated automatically by the database functions
  }

  const handleDeleteNote = async (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      await onDeleteNote?.(noteId)
    }
  }

  const handleScheduleSession = async () => {
    if (!campaign || !sessionDate || !sessionTime || !sessionNumber) return
    
    // Create a date string with the selected time
    const dateTimeString = `${sessionDate}T${sessionTime}:00`
    
    // Create a date object (this will be in local timezone)
    const localDate = new Date(dateTimeString)
    
    // Use a different approach: create the date in the selected timezone
    // Parse the date components
    const [year, month, day] = sessionDate.split('-').map(Number)
    const [hour, minute] = sessionTime.split(':').map(Number)
    
    // Create a date object for the selected date and time
    const selectedDate = new Date(year, month - 1, day, hour, minute, 0)
    
    // Convert to UTC using the timezone library
    const utcDate = fromZonedTime(selectedDate, sessionTimezone)
    
    // If the timezone conversion fails, use a fallback approach
    if (isNaN(utcDate.getTime())) {
      console.log('Timezone conversion failed, using fallback')
      // Fallback: just store the date as-is and let the display handle it
      const fallbackDate = new Date(dateTimeString)
      const updatedCampaign = {
        ...campaign,
        nextSessionDate: fallbackDate.toISOString(),
        nextSessionTime: sessionTime,
        nextSessionTimezone: sessionTimezone,
        nextSessionNumber: parseInt(sessionNumber)
      }
      
      await onUpdateCampaign?.(updatedCampaign)
      setSessionDate('')
      setSessionTime('15:00')
      setSessionTimezone('Europe/Amsterdam')
      setSessionNumber('')
      return
    }
    
    console.log('Scheduling debug:')
    console.log('Selected date:', sessionDate)
    console.log('Selected time:', sessionTime)
    console.log('Selected timezone:', sessionTimezone)
    console.log('Local date:', localDate.toString())
    console.log('Selected date:', selectedDate.toString())
    console.log('UTC date valid:', !isNaN(utcDate.getTime()))
    if (!isNaN(utcDate.getTime())) {
      console.log('UTC date:', utcDate.toISOString())
      console.log('UTC in selected timezone:', format(utcDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: sessionTimezone }))
      console.log('UTC in Amsterdam:', format(utcDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Europe/Amsterdam' }))
      console.log('UTC in Quebec:', format(utcDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'America/Montreal' }))
      console.log('UTC in Tokyo:', format(utcDate, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Tokyo' }))
    }
    
    const updatedCampaign = {
      ...campaign,
      nextSessionDate: !isNaN(utcDate.getTime()) ? utcDate.toISOString() : new Date().toISOString(),
      nextSessionTime: sessionTime,
      nextSessionTimezone: sessionTimezone,
      nextSessionNumber: parseInt(sessionNumber)
    }
    
    await onUpdateCampaign?.(updatedCampaign)
    setSessionDate('')
    setSessionTime('15:00')
    setSessionTimezone('Europe/Amsterdam')
    setSessionNumber('')
  }

  const getAuthorName = (authorId: string) => {
    const author = users.find(user => user.userId === authorId)
    return author ? author.displayName || `User ${authorId.slice(0, 8)}...` : 'Unknown Author'
  }

  const getOwnerName = (userId?: string) => {
    if (!userId) return 'Unknown Owner'
    const owner = users.find(user => user.userId === userId)
    return owner ? owner.displayName || `User ${userId.slice(0, 8)}...` : 'Unknown Owner'
  }

  const formatNoteDate = (dateString: string) => {
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

  const formatSessionDate = (dateString: string, timeString?: string, timezoneString?: string) => {
    try {
      // Parse the UTC date from the stored string
      const utcDate = new Date(dateString)
      
      // If we have time and timezone stored, use them to show the correct times
      if (timeString && timezoneString) {
        // Create a date in the selected timezone
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
        const [hour, minute] = timeString.split(':').map(Number)
        const selectedDate = new Date(year, month - 1, day, hour, minute, 0)
        
        // Convert to UTC using the timezone library
        const utcFromSelected = fromZonedTime(selectedDate, timezoneString)
        
        if (!isNaN(utcFromSelected.getTime())) {
          // Format for Amsterdam (CET/CEST)
          const amsterdamTime = formatInTimeZone(utcFromSelected, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
          
          // Format for Quebec (EST/EDT)
          const quebecTime = formatInTimeZone(utcFromSelected, 'America/Montreal', 'MMMM d, yyyy HH:mm')
          
          // Format for Tokyo (JST)
          const tokyoTime = formatInTimeZone(utcFromSelected, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
          
          return {
            amsterdam: amsterdamTime,
            quebec: quebecTime,
            tokyo: tokyoTime
          }
        }
      }
      
      // Fallback to old behavior if no time/timezone stored or conversion fails
      // Format for Amsterdam (CET/CEST)
      const amsterdamTime = formatInTimeZone(utcDate, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
      
      // Format for Quebec (EST/EDT)
      const quebecTime = formatInTimeZone(utcDate, 'America/Montreal', 'MMMM d, yyyy HH:mm')
      
      // Format for Tokyo (JST)
      const tokyoTime = formatInTimeZone(utcDate, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
      
      return {
        amsterdam: amsterdamTime,
        quebec: quebecTime,
        tokyo: tokyoTime
      }
    } catch {
      return {
        amsterdam: 'Invalid Date',
        quebec: 'Invalid Date',
        tokyo: 'Invalid Date'
      }
    }
  }

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
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Badge variant="outline" className="flex items-center gap-2">
                  <Icon icon="lucide:calendar" className="w-4 h-4" /> 
                  Started {formatDate(campaign?.created_at)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Icon icon="lucide:crown" className="w-4 h-4" /> 
                  {getDungeonMasterName()}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Icon icon="lucide:users" className="w-4 h-4" /> 
                  {campaignCharacters.length} {campaignCharacters.length === 1 ? 'Character' : 'Characters'}
                </Badge>
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
        <Card className="bg-card border-primary/50 border-1 gap-2">
          <CardHeader className="w-full flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDmControlsExpanded(!dmControlsExpanded)}
                className="p-1 h-6 w-6"
              >
                <Icon 
                  icon={dmControlsExpanded ? "lucide:chevron-down" : "lucide:chevron-right"} 
                  className="w-4 h-4" 
                />
              </Button>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon icon="lucide:crown" className="w-5 h-5 text-primary" />
                Dungeon Master Controls
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
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
                variant={levelUpModeEnabled ? "default" : "outline"}
                size="sm"
                onClick={onToggleLevelUpMode}
                className="flex items-center gap-2"
              >
                <Icon icon="lucide:trending-up" className="w-4 h-4" />
                {levelUpModeEnabled ? "Disable Level Up" : "Enable Level Up"}
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
          </CardHeader>

          {dmControlsExpanded && (
            <CardContent className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-3 p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-md font-bold w-[320px]">
                  <Icon icon="lucide:calendar-plus" className="w-4 h-4" />
                  Schedule Next Session
                </div>
                <div className="flex flex-row gap-2 items-end w-full">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <div className="relative">
                      <Input
                        id="session-date"
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full pl-10 pr-10 font-sans"
                        style={{
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                      />
                      <Icon 
                        icon="lucide:calendar" 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer pointer-events-auto" 
                        onClick={() => {
                          const input = document.getElementById('session-date') as HTMLInputElement
                          if (input) {
                            try {
                              input.showPicker?.()
                            } catch {
                              input.focus()
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Time</Label>
                    <div className="relative">
                      <Input
                        id="session-time"
                        type="text"
                        inputMode="numeric"
                        placeholder="HH:MM"
                        maxLength={5}
                        value={sessionTime}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          const formatted = digits.length >= 3 ? `${digits.slice(0,2)}:${digits.slice(2)}` : digits
                          setSessionTime(formatted)
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (!val) {
                            setSessionTime('15:00')
                            return
                          }
                          const match = val.match(/^(\d{1,2})(?::?(\d{1,2}))?$/)
                          if (match) {
                            let [ , h, m ] = match as unknown as [string, string, string]
                            const hh = String(Math.min(23, parseInt(h || '0', 10))).padStart(2, '0')
                            const mm = String(Math.min(59, parseInt(m || '0', 10))).padStart(2, '0')
                            setSessionTime(`${hh}:${mm}`)
                          }
                        }}
                        className="font-sans pl-10 pr-10"
                        style={{
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                      />
                      <Icon 
                        icon="lucide:clock" 
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer pointer-events-auto"
                        onClick={() => {
                          const input = document.getElementById('session-time') as HTMLInputElement
                          input?.focus()
                          input?.select()
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Timezone</Label>
                    <Select value={sessionTimezone} onValueChange={setSessionTimezone}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Amsterdam">Europe</SelectItem>
                        <SelectItem value="America/Montreal">Quebec</SelectItem>
                        <SelectItem value="Asia/Tokyo">Japan</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Session Number</Label>
                    <Input
                      id="session-number"
                      type="number"
                      value={sessionNumber}
                      onChange={(e) => setSessionNumber(e.target.value)}
                      placeholder="Session Number"
                      min="1"
                    />
                  </div>
                  <Button
                    onClick={handleScheduleSession}
                    disabled={!sessionDate || !sessionTime || !sessionNumber}
                    className="flex items-center gap-2"
                  >
                    <Icon icon="lucide:calendar-check" className="w-4 h-4" />
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'notes' | 'resources')} className="w-full gap-4">
        <TabsList className="grid w-full grid-cols-3 gap-2 p-2 h-fit rounded-xl">
          <TabsTrigger value="overview" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:home" className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:sticky-note" className="w-4 h-4" />
            Session Notes
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2 p-2 rounded-lg">
            <Icon icon="lucide:library" className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-0 flex flex-col gap-8">
          {/* Next Scheduled Session */}
          {campaign?.nextSessionDate && campaign?.nextSessionNumber && (
            <Card className="bg-card from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon icon="lucide:calendar-clock" className="w-5 h-5 text-primary" />
                  Next Scheduled Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-sm">
                      Session {campaign.nextSessionNumber}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatNoteDate(campaign.nextSessionDate)}
                    </span>
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-start gap-2 border p-2 rounded-lg">
                          <Icon icon="flag:eu-4x3" className="w-[22px] h-auto border rounded-md my-0.5" />
                          <div>
                            <div className="font-medium">Western Europe</div>
                            <div className="text-muted-foreground">
                              {formatSessionDate(campaign.nextSessionDate, campaign.nextSessionTime, campaign.nextSessionTimezone).amsterdam}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 border p-2 rounded-lg">
                          <div className="w-[22px] h-[16px] flex rounded-md my-0.5 p-0 relative !overflow-hidden border align-middle">
                            <Icon icon="openmoji:quebec-flag" className="!w-[40px] h-[28px] overflow-hidden absolute top-[-7px] left-[-10px] rounded-md" />
                          </div>
                          <div>
                            <div className="font-medium">Quebec</div>
                            <div className="text-muted-foreground">
                              {formatSessionDate(campaign.nextSessionDate, campaign.nextSessionTime, campaign.nextSessionTimezone).quebec}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 border p-2 rounded-lg">
                          <Icon icon="flag:jp-4x3" className="w-[22px] h-auto border rounded-md my-0.5" />
                          <div>
                            <div className="font-medium">Tokyo</div>
                            <div className="text-muted-foreground">
                              {formatSessionDate(campaign.nextSessionDate, campaign.nextSessionTime, campaign.nextSessionTimezone).tokyo}
                            </div>
                          </div>
                        </div>
                      </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Latest Sessions - Only render if session notes exist */}
          {!notesLoading && !notesError && sortedNotes.length > 0 && (
            <Card className="bg-transparent border-0 shadow-none p-0 gap-3">
              <CardHeader className="p-0">
                <div className="flex items-center justify-between h-[32px]">
                  <CardTitle className="flex items-center gap-2">
                    Latest Sessions
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('notes')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:bg-transparent"
                  >
                    See all
                    <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {sortedNotes.slice(0, 3).map((note) => (
                    <Card 
                      key={note.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleReadNote(note)}
                    >
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg line-clamp-2">{note.title}</h4>
                            {fromCache && isStale && (
                              <Icon icon="lucide:clock" className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-x-4 gap-y-1 flex-row flex-wrap">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground flex-nowrap">
                                {note.session_date ? (
                                  <>
                                    <Icon icon="lucide:calendar-days" className="w-3 h-3" />
                                    {formatNoteDate(note.session_date)}
                                  </>
                                ) : (
                                  <>
                                    <Icon icon="lucide:calendar" className="w-3 h-3" />
                                    {formatNoteDate(note.created_at)}
                                  </>
                                )}
                            </div>
                            {note.members_attending && note.members_attending.length > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground flex-nowrap">
                                <Icon icon="lucide:users" className="w-3 h-3" />
                                {note.members_attending.length} member{note.members_attending.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Characters */}
          <Card className="bg-transparent border-0 shadow-none p-0 gap-3">
            <CardHeader className="p-0">
              <CardTitle className="flex items-center gap-2 h-[32px]">
                Characters <Badge variant="outline" className="text-xs">{campaignCharacters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {campaignCharacters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {campaignCharacters.map((character) => (
                    <Card 
                      key={character.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors p-3 rounded-xl"
                      onClick={() => onSelectCharacter(character.id)}
                    >
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-16 w-16 rounded-lg">
                            <AvatarImage src={character.imageUrl} alt={character.name} className="object-cover" />
                            <AvatarFallback className="text-sm">
                              {character.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-lg truncate">{character.name}</h4>
                              {character.partyStatus === 'away' && (
                                <Badge variant="secondary" className="text-xs">
                                  Away
                                </Badge>
                              )}
                              {character.partyStatus === 'deceased' && (
                                <Badge variant="destructive" className="text-xs">
                                  Deceased
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              Level {character.level} {character.class}
                            </p>
                            <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                              <Icon icon="lucide:user" className="w-3 h-3" />
                              {getOwnerName(character.userId)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon icon="lucide:user-plus" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No characters in this campaign</p>
                  <p className="text-sm">Add characters to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Notes */}
        <TabsContent value="notes" className="space-y-6">
          <Card className="p-0 bg-transparent border-0 shadow-none gap-3">
            <CardHeader className="p-0">
              <div className="flex items-center justify-between h-[32px]">
                <CardTitle>Session Notes</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2"
                  >
                    <Icon 
                      icon={sortOrder === 'asc' ? "lucide:arrow-up-down" : "lucide:arrow-down-up"} 
                      className="w-4 h-4" 
                    />
                    {sortOrder === 'asc' ? 'Oldest' : 'Latest'}
                  </Button>
                  <Button onClick={handleCreateNote} size="sm" className="flex items-center gap-2">
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                    New Note
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notesLoading ? (
                <CampaignNotesListSkeleton count={5} />
              ) : notesError ? (
                <div className="text-center p-8 rounded-xl bg-card">
                  <Icon icon="lucide:alert-circle" className="w-12 h-12 mx-auto mb-4 text-destructive" />
                  <h3 className="text-lg font-semibold mb-2">Failed to Load Notes</h3>
                  <p className="text-muted-foreground mb-4">{notesError}</p>
                  <Button onClick={refreshNotes} variant="outline">
                    <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center p-8 rounded-xl bg-card">
                  <Icon icon="lucide:sticky-note" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start documenting your campaign sessions with notes.
                  </p>
                  <Button onClick={handleCreateNote}>
                    <Icon icon="lucide:plus" className="w-4 h-4" />
                    Create First Note
                  </Button>
                </div>
              ) : (
                <ScrollArea>
                  <div className="flex flex-col gap-2">
                    {sortedNotes.map((note) => (
                      <Card 
                        key={note.id} 
                        className="bg-card hover:bg-card/70 transition-colors cursor-pointer rounded-xl"
                        onClick={() => handleReadNote(note)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-regular">{note.title}</CardTitle>
                                {fromCache && isStale && (
                                  <Icon icon="lucide:clock" className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Icon icon="lucide:calendar-days" className="w-3 h-3" />
                                  {formatNoteDate(note.session_date || note.created_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Icon icon="lucide:feather" className="w-3 h-3" />
                                  {getAuthorName(note.author_id)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Icon icon="lucide:users" className="w-3 h-3" />
                                  {note.members_attending?.join(", ")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditNote(note)}
                                className="h-9 p-0"
                              >
                                <Icon icon="lucide:edit" className="w-4 h-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="space-y-6">
          {/* Resources document management */}
          <Card className="p-0 bg-transparent border-0 shadow-none gap-3">
            <CardHeader className="p-0">
              <div className="flex items-center justify-between h-[32px]">
                <CardTitle>Resources</CardTitle>
                {!!currentUserId && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleOpenAddLink} className="flex items-center gap-2" variant="outline">
                      <Icon icon="lucide:plus" className="w-4 h-4" />
                      Add Link
                    </Button>
                    <Button onClick={handleCreateResource} size="sm" className="flex items-center gap-2" variant="outline">
                      <Icon icon="lucide:plus" className="w-4 h-4" />
                      New Document
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              {links.length === 0 ? (
                <>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {links.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-card text-primary text-sm rounded-full border-primary/30 border-1 hover:text-accent"
                    >
                      <Icon icon="lucide:link" className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{link.title}</span>
                      {isDungeonMaster && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={(e) => { e.preventDefault(); onDeleteLink?.(link.id) }}
                        >
                          <Icon icon="lucide:x" className="w-3 h-3" />
                        </Button>
                      )}
                    </a>
                  ))}
                </div>
              )}
              {sortedResources.length === 0 ? (
                <div className="text-center p-8 rounded-xl bg-card">
                  <Icon icon="lucide:library" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
                  <p className="text-muted-foreground mb-4">Add documents for campaign lore, rules, and information.</p>
                  {!!currentUserId && (
                    <Button onClick={handleCreateResource}>
                      <Icon icon="lucide:plus" className="w-4 h-4" />
                      Create First Document
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea>
                  <div className="flex flex-row flex-wrap gap-2">
                    {sortedResources.map((resource) => (
                      <Card key={resource.id} className="w-[calc(33.33%-6px)] bg-card hover:bg-card/70 transition-colors rounded-xl cursor-pointer" onClick={() => handleReadResource(resource)}>
                        <CardHeader>
                          <div className="flex items-start justify-between w-full h-full">
                            <div className="flex flex-col gap-2 justify-between w-full h-full">
                              <CardTitle className="text-lg font-regular flex-grow h-auto flex-1">{resource.title}</CardTitle>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Icon icon="lucide:calendar" className="w-3 h-3" />
                                  {formatNoteDate(resource.created_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Icon icon="lucide:feather" className="w-3 h-3" />
                                  {getAuthorName(resource.author_id)}
                                </div>
                              </div>
                            </div>
                            {/* <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditResource(resource)}
                                className="h-9 p-0"
                              >
                                <Icon icon="lucide:edit" className="w-4 h-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteResource(resource.id)}
                                className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </Button>
                            </div> */}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Note Modal */}
      <CampaignNoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false)
          setEditingNote(null)
        }}
        onSave={handleSaveNote}
        editingNote={editingNote}
        campaignId={campaign?.id || ''}
        currentUserId={currentUserId || ''}
      />

      {/* Campaign Note Read Modal */}
      <CampaignNoteReadModal
        isOpen={readModalOpen}
        onClose={() => {
          setReadModalOpen(false)
          setReadingNote(null)
        }}
        note={readingNote}
        onEdit={handleEditFromRead}
        onDelete={handleDeleteFromRead}
        authorName={readingNote ? getAuthorName(readingNote.author_id) : ''}
        canEdit={readingNote ? readingNote.author_id === currentUserId : false}
      />

      {/* Campaign Resource Modal */}
      <CampaignResourceModal
        isOpen={resourceModalOpen}
        onClose={() => {
          setResourceModalOpen(false)
          setEditingResource(null)
        }}
        onSave={handleSaveResource}
        editingResource={editingResource}
        campaignId={campaign?.id || ''}
        currentUserId={currentUserId || ''}
      />

      {/* Campaign Resource Read Modal */}
      <CampaignResourceReadModal
        isOpen={resourceReadModalOpen}
        onClose={() => {
          setResourceReadModalOpen(false)
          setReadingResource(null)
        }}
        resource={readingResource}
        onEdit={handleEditResourceFromRead}
        onDelete={handleDeleteResourceFromRead}
        authorName={readingResource ? getAuthorName(readingResource.author_id) : ''}
      />

      {/* Campaign Link Modal */}
      <CampaignLinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSave={async (link) => {
          try {
            await onCreateLink?.(link)
            setLinkModalOpen(false)
          } catch {}
        }}
        campaignId={campaign?.id || ''}
      />
    </div>
  )
}
