"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@iconify/react"
import { useToast } from "@/components/ui/use-toast"
import type { Campaign, CharacterData } from "@/lib/character-data"
import type { UserProfile } from "@/lib/user-profiles"
import { useUser } from "@/lib/user-context"

interface CampaignCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (campaign: Campaign) => void
  editingCampaign?: Campaign | null
  characters?: CharacterData[]
  users?: any[]
  onAssignCharacterToCampaign?: (characterId: string, campaignId: string) => void
  onRemoveCharacterFromCampaign?: (characterId: string, campaignId: string) => void
  onConvertToNPC?: (characterId: string) => void
  onConvertFromNPC?: (characterId: string) => void
}

export function CampaignCreationModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCampaign,
  characters = [],
  users = [],
  onAssignCharacterToCampaign,
  onRemoveCharacterFromCampaign,
  onConvertToNPC,
  onConvertFromNPC
}: CampaignCreationModalProps) {
  const [name, setName] = useState(editingCampaign?.name || "")
  const [description, setDescription] = useState(editingCampaign?.description || "")
  const [dungeonMasterId, setDungeonMasterId] = useState(editingCampaign?.dungeonMasterId || "")
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(editingCampaign?.discordWebhookUrl || "")
  const [isActive, setIsActive] = useState(editingCampaign?.isActive || false)
  const [isDefault, setIsDefault] = useState(editingCampaign?.isDefault || false)
  const [logoLightUrl, setLogoLightUrl] = useState(editingCampaign?.logoLightUrl || "")
  const [logoDarkUrl, setLogoDarkUrl] = useState(editingCampaign?.logoDarkUrl || "")
  const [uploadingLightLogo, setUploadingLightLogo] = useState(false)
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false)
  const lightLogoInputRef = useRef<HTMLInputElement>(null)
  const darkLogoInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { isSuperadmin } = useUser()
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const testTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Update form state when editingCampaign changes
  useEffect(() => {
    if (editingCampaign) {
      setName(editingCampaign.name || "")
      setDescription(editingCampaign.description || "")
      setDungeonMasterId(editingCampaign.dungeonMasterId || "")
      setDiscordWebhookUrl(editingCampaign.discordWebhookUrl || "")
      setIsActive(editingCampaign.isActive || false)
      setIsDefault(editingCampaign.isDefault || false)
      setLogoLightUrl(editingCampaign.logoLightUrl || "")
      setLogoDarkUrl(editingCampaign.logoDarkUrl || "")
    } else {
      setName("")
      setDescription("")
      setDungeonMasterId("")
      setDiscordWebhookUrl("")
      setIsActive(false)
      setIsDefault(false)
      setLogoLightUrl("")
      setLogoDarkUrl("")
    }
  }, [editingCampaign])


  // Helper function to format character level and class display (same as sidebar)
  const getCharacterLevelDisplay = (character: CharacterData): string => {
    if (character.classes && character.classes.length > 0) {
      // Multiclass character
      const totalLevel = character.classes.reduce((total, cls) => total + cls.level, 0)
      const classDisplay = character.classes
        .map(cls => cls.name)
        .join('/')
      return `Level ${totalLevel} ${classDisplay}`
    } else {
      // Single class character
      return `Level ${character.level} ${character.class}`
    }
  }

  const getCharactersInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId === campaignId)
  }

  const getCharactersNotInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId !== campaignId)
  }

  const handleSave = () => {
    if (!name.trim()) return

            const campaign: Campaign = {
              id: editingCampaign?.id || `campaign_${crypto.randomUUID()}`,
              name: name.trim(),
              description: description.trim() || undefined,
              created_at: editingCampaign?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              characters: editingCampaign?.characters || [],
              isActive: isActive,
              dungeonMasterId: dungeonMasterId || undefined,
              // Discord integration
              discordWebhookUrl: discordWebhookUrl.trim() || undefined,
              discordNotificationsEnabled: !!discordWebhookUrl.trim(), // Enable notifications if webhook URL is provided
              // Preserve session scheduling and level up fields
              levelUpModeEnabled: editingCampaign?.levelUpModeEnabled || false,
              nextSessionDate: editingCampaign?.nextSessionDate,
              nextSessionTime: editingCampaign?.nextSessionTime,
              nextSessionTimezone: editingCampaign?.nextSessionTimezone,
              nextSessionNumber: editingCampaign?.nextSessionNumber,
              discordReminderSent: editingCampaign?.discordReminderSent || false,
              // Campaign logos
              logoLightUrl: logoLightUrl || undefined,
              logoDarkUrl: logoDarkUrl || undefined,
              // Default campaign (superadmin only)
              isDefault: isSuperadmin ? isDefault : false
            }

    onSave(campaign)
    handleClose()
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setDungeonMasterId("")
    setDiscordWebhookUrl("")
    setIsActive(false)
    setLogoLightUrl("")
    setLogoDarkUrl("")
    onClose()
  }

  const handleLogoUpload = async (file: File, mode: 'light' | 'dark') => {
    try {
      if (mode === 'light') {
        setUploadingLightLogo(true)
      } else {
        setUploadingDarkLogo(true)
      }

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'campaign-logos')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to upload logo'
        throw new Error(errorMessage)
      }

      if (mode === 'light') {
        setLogoLightUrl(result.url)
      } else {
        setLogoDarkUrl(result.url)
      }

      toast({
        title: "Logo Uploaded",
        description: `${mode === 'light' ? 'Light' : 'Dark'} mode logo uploaded successfully.`,
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload logo',
        variant: "destructive",
      })
    } finally {
      setUploadingLightLogo(false)
      setUploadingDarkLogo(false)
      if (mode === 'light' && lightLogoInputRef.current) {
        lightLogoInputRef.current.value = ''
      }
      if (mode === 'dark' && darkLogoInputRef.current) {
        darkLogoInputRef.current.value = ''
      }
    }
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file, mode)
    }
    // Reset input so same file can be selected again
    if (mode === 'light' && lightLogoInputRef.current) {
      lightLogoInputRef.current.value = ''
    }
    if (mode === 'dark' && darkLogoInputRef.current) {
      darkLogoInputRef.current.value = ''
    }
  }

  const handleSendTestDiscord = async () => {
    if (testStatus !== 'idle') return
    if (!discordWebhookUrl || !discordWebhookUrl.startsWith('http')) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid Discord webhook URL.', variant: 'destructive' })
      return
    }
    try {
      setTestStatus('sending')
      const res = await fetch('/api/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl, campaignName: name || editingCampaign?.name }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Discord test failed', description: data?.details || 'Webhook returned an error.', variant: 'destructive' })
        setTestStatus('idle')
        return
      }
      toast({ title: 'Discord test sent', description: 'Check your Discord channel for the test message.' })
      setTestStatus('sent')
      if (testTimeoutRef.current) clearTimeout(testTimeoutRef.current)
      testTimeoutRef.current = setTimeout(() => {
        setTestStatus('idle')
      }, 2000)
    } catch (e: any) {
      toast({ title: 'Discord test error', description: e?.message || 'Unexpected error.', variant: 'destructive' })
      setTestStatus('idle')
    }
  }

  useEffect(() => {
    return () => {
      if (testTimeoutRef.current) clearTimeout(testTimeoutRef.current)
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>
            {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {editingCampaign
              ? 'Update your campaign details and manage characters below.'
              : 'Create a new campaign to organize your characters and adventures.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="flex-shrink-0 flex flex-col gap-4 p-4 bg-background">

            <div className="flex flex-row gap-4">
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter campaign name..."
                  maxLength={100}
                />
              </div>
              {/* Dungeon Master */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="dungeon-master">Dungeon Master *</Label>
                <Select value={dungeonMasterId || "none"} onValueChange={(value) => setDungeonMasterId(value === "none" ? "" : value)}>
                  <SelectTrigger className="w-[144px]">
                    <SelectValue placeholder="Select a Dungeon Master (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Dungeon Master</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        {user.displayName || `User ${user.userId.slice(0, 8)}...`}
                      </SelectItem>
                    ))}
                    {users.length === 0 && (
                      <SelectItem value="no-users" disabled>
                        No users found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-description">Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Enter campaign description, setting details, or notes..."
                height={80}
              />
            </div>

            {/* Campaign Logos */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Light Mode Logo */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="logo-light" className="text-xs text-muted-foreground">
                    Light Mode Logo
                  </Label>
                  <div className="flex flex-col gap-2">
                    {(logoLightUrl || logoDarkUrl) && (
                      <div className="relative w-full h-20 border rounded-lg bg-background flex items-center justify-center overflow-hidden">
                        <img 
                          src={logoLightUrl || logoDarkUrl || ""} 
                          alt="Light mode logo" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoLightUrl("")}
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <Icon icon="lucide:x" className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <Input
                      id="logo-light"
                      type="file"
                      accept="image/*,.svg"
                      ref={lightLogoInputRef}
                      onChange={(e) => handleLogoFileChange(e, 'light')}
                      disabled={uploadingLightLogo}
                      className="cursor-pointer"
                    />
                    {uploadingLightLogo && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>

                {/* Dark Mode Logo */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="logo-dark" className="text-xs text-muted-foreground">
                    Dark Mode Logo
                  </Label>
                  <div className="flex flex-col gap-2">
                    {(logoDarkUrl || logoLightUrl) && (
                      <div className="relative w-full h-20 border rounded-lg bg-background flex items-center justify-center overflow-hidden">
                        <img 
                          src={logoDarkUrl || logoLightUrl || ""} 
                          alt="Dark mode logo" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogoDarkUrl("")}
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                        >
                          <Icon icon="lucide:x" className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <Input
                      id="logo-dark"
                      type="file"
                      accept="image/*,.svg"
                      ref={darkLogoInputRef}
                      onChange={(e) => handleLogoFileChange(e, 'dark')}
                      disabled={uploadingDarkLogo}
                      className="cursor-pointer"
                    />
                    {uploadingDarkLogo && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Icon icon="lucide:loader-2" className="w-3 h-3 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-row gap-4 w-full">
              {/* Discord Webhook URL */}
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="discord-webhook-url">Discord Webhook URL</Label>
                <div className="flex gap-2 items-center w-full">
                  <Input
                    id="discord-webhook-url"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    inputMode="url"
                  />
                  <Button type="button" variant="outline" onClick={handleSendTestDiscord} disabled={!discordWebhookUrl || testStatus !== 'idle'}>
                    {testStatus === 'sent' ? (
                      <span className="inline-flex items-center">
                        <Icon icon="lucide:check" className="w-4 h-4 mr-1" />
                        Test Sent
                      </span>
                    ) : testStatus === 'sending' ? (
                      'Sending...'
                    ) : (
                      'Send Test'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Campaign Settings */}
            <div className="flex flex-col gap-2">
              {/* Active Campaign */}
              <div className="flex gap-4 items-start justify-start p-3 border rounded-lg bg-card">
                <div className="h-[20px] w-fit">
                  <Switch
                    id="campaign-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="campaign-active" className="text-sm font-medium h-[20px]">
                    Active Campaign
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mark this campaign as active. Multiple campaigns can be active at the same time.
                  </p>
                </div>
              </div>

              {/* Default Campaign (Superadmin Only) */}
              {isSuperadmin && (
                <div className="flex items-start gap-4 justify-start p-3 border rounded-lg bg-card border-primary/20">
                  <div className="h-[20px] w-fit">
                    <Switch
                      id="campaign-default"
                      checked={isDefault}
                      onCheckedChange={setIsDefault}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="campaign-default" className="text-sm font-medium h-[20px]">
                      Make Default Campaign
                      <Badge variant="secondary" className="text-xs py-0.5 px-1.5">Admin Only</Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Set this campaign as the default to show on app load. Only one campaign can be the default.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Character Management Section - Only show when editing existing campaign */}
          {editingCampaign && onAssignCharacterToCampaign && onRemoveCharacterFromCampaign && (
            <div className="space-y-4 border-t p-4 bg-background">
              {/* Characters in Campaign */}
              {getCharactersInCampaign(editingCampaign.id).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:users" className="w-4 h-4" /> Characters in Campaign <Badge variant="outline" className="text-xs">
                      {getCharactersInCampaign(editingCampaign.id).length}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {getCharactersInCampaign(editingCampaign.id).map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 border bg-card rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                            {character.imageUrl ? (
                              <img 
                                src={character.imageUrl} 
                                alt={character.name} 
                                className="w-full h-full object-cover border rounded-md"
                              />
                            ) : (
                              <Icon icon="lucide:user" className="w-full h-full p-2 text-muted-foreground border rounded-md" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{character.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {getCharacterLevelDisplay(character)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {character.isNPC ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => onConvertFromNPC?.(character.id)}
                            >
                              <Icon icon="lucide:user" className="w-3 h-3" />
                              Turn into PC
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => onConvertToNPC?.(character.id)}
                            >
                              <Icon icon="lucide:users" className="w-3 h-3" />
                              Turn into NPC
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[#ce6565] hover:bg-[#ce6565] hover:text-white h-8"
                            onClick={() => onRemoveCharacterFromCampaign(character.id, editingCampaign.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No characters assigned to this campaign yet.
                </div>
              )}

              {/* Add Character to Campaign */}
              {getCharactersNotInCampaign(editingCampaign.id).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Icon icon="lucide:user-plus" className="w-4 h-4" />
                    Add Characters
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {getCharactersNotInCampaign(editingCampaign.id).map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 bg-muted/100 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                            {character.imageUrl ? (
                              <img 
                                src={character.imageUrl} 
                                alt={character.name} 
                                className="w-full h-full object-cover border rounded-md"
                              />
                            ) : (
                              <Icon icon="lucide:user" className="w-full h-full p-2 text-muted-foreground border rounded-md" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium">{character.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {getCharacterLevelDisplay(character)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAssignCharacterToCampaign(character.id, editingCampaign.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

