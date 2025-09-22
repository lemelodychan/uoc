"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Edit,
  Heart,
  Shield,
  Zap,
  Footprints,
  Sword,
  Sparkles,
  Star,
  Wrench,
  Save,
  RefreshCw,
  User,
  BookOpen,
  Globe,
  UserStar,
  Skull,
  Dice5,
  NotebookPen,
} from "lucide-react"
import { CharacterSidebar } from "@/components/character-sidebar"
import { CampaignManagementModal } from "@/components/edit-modals/campaign-management-modal"
import { BasicInfoModal } from "@/components/edit-modals/basic-info-modal"
import { CharacterCreationModal } from "@/components/edit-modals/character-creation-modal"
import { createDefaultSkills, createDefaultSavingThrowProficiencies, createClassBasedSavingThrowProficiencies, createClassBasedSkills, calculatePassivePerception, calculatePassiveInsight, calculateSavingThrowBonus, calculateSpellSaveDC, calculateSpellAttackBonus, getSpellsKnown, getArtificerInfusionsKnown, getArtificerMaxInfusedItems, getTotalAdditionalSpells, getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData, getWarlockInvocationsKnown, type EldritchCannon, type Campaign, createCampaign } from "@/lib/character-data"
import { AbilitiesModal } from "@/components/edit-modals/abilities-modal"
import { CombatModal } from "@/components/edit-modals/combat-modal"
import { WeaponsModal } from "@/components/edit-modals/weapons-modal"
import { InfusionsModal } from "@/components/edit-modals/infusions-modal"
import { FeaturesModal } from "@/components/edit-modals/features-modal"
import { EquipmentModal } from "@/components/edit-modals/equipment-modal"
import { LanguagesModal } from "@/components/edit-modals/languages-modal"
import { ToolsModal } from "@/components/edit-modals/tools-modal"
import { FeatsModal } from "@/components/edit-modals/feats-modal"
import { SpellModal } from "@/components/edit-modals/spell-modal"
import { SpellListModal } from "@/components/edit-modals/spell-list-modal"
import { DiceRollModal } from "@/components/edit-modals/dice-roll-modal"
import { CharacterDetailsModal } from "@/components/edit-modals/character-details-modal"
import { CharacterDetailsContentModal } from "@/components/edit-modals/character-details-content-modal"
import { LongRestModal } from "@/components/edit-modals/long-rest-modal"
import { LongRestResultsModal } from "@/components/edit-modals/long-rest-results-modal"
import { EldritchCannonModal } from "@/components/edit-modals/eldritch-cannon-modal"
import { EldritchInvocationsModal } from "@/components/edit-modals/eldritch-invocations-modal"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import {
  sampleCharacters,
  calculateModifier,
  calculateSkillBonus,
  calculateToolBonus,
  calculateProficiencyBonus,
  type CharacterData,
  type SpellData,
  type Skill,
  type ToolProficiency,
} from "@/lib/character-data"
import { saveCharacter, loadAllCharacters, testConnection, loadClassData, loadClassFeatures, updatePartyStatus, createCampaign as createCampaignDB, loadAllCampaigns, updateCampaign as updateCampaignDB, deleteCampaign, assignCharacterToCampaign, removeCharacterFromCampaign, setActiveCampaign } from "@/lib/database"
import { subscribeToLongRestEvents, broadcastLongRestEvent, confirmLongRestEvent, type LongRestEvent, type LongRestEventData } from "@/lib/realtime"
import { getBardicInspirationData, getSongOfRestData } from "@/lib/class-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export default function CharacterSheet() {
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all")
  const [activeCharacterId, setActiveCharacterId] = useState<string>("")
  const [basicInfoModalOpen, setBasicInfoModalOpen] = useState(false)
  const [abilitiesModalOpen, setAbilitiesModalOpen] = useState(false)
  const [combatModalOpen, setCombatModalOpen] = useState(false)
  const [weaponsModalOpen, setWeaponsModalOpen] = useState(false)
  const [infusionsModalOpen, setInfusionsModalOpen] = useState(false)
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false)
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
  const [languagesModalOpen, setLanguagesModalOpen] = useState(false)
  const [toolsModalOpen, setToolsModalOpen] = useState(false)
  const [featsModalOpen, setFeatsModalOpen] = useState(false)
  const [spellModalOpen, setSpellModalOpen] = useState(false)
  const [spellListModalOpen, setSpellListModalOpen] = useState(false)
  const [characterDetailsModalOpen, setCharacterDetailsModalOpen] = useState(false)
  const [characterDetailsContentModalOpen, setCharacterDetailsContentModalOpen] = useState(false)
  const [characterCreationModalOpen, setCharacterCreationModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)
  const multiclassDataChangedRef = useRef<boolean>(false)
  const [featureModalOpen, setFeatureModalOpen] = useState(false)
  const [featureModalContent, setFeatureModalContent] = useState<{ title: string; description: string; needsAttunement?: boolean; maxUses?: number; dailyRecharge?: string; usesPerLongRest?: number | string; refuelingDie?: string } | null>(null)
  const [featureModalIsClassFeature, setFeatureModalIsClassFeature] = useState(false)
  const [featureNotesModalOpen, setFeatureNotesModalOpen] = useState(false)
  const [featureNotesDraft, setFeatureNotesDraft] = useState<string>("")
  const [featureImageDraft, setFeatureImageDraft] = useState<string>("")
  const [portraitModalOpen, setPortraitModalOpen] = useState(false)
  const [longRestModalOpen, setLongRestModalOpen] = useState(false)
  const [currentLongRestEvent, setCurrentLongRestEvent] = useState<LongRestEvent | null>(null)
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null)
  const [eldritchCannonModalOpen, setEldritchCannonModalOpen] = useState(false)
  const [eldritchInvocationsModalOpen, setEldritchInvocationsModalOpen] = useState(false)
  const [diceRollModalOpen, setDiceRollModalOpen] = useState(false)
  const [campaignManagementModalOpen, setCampaignManagementModalOpen] = useState(false)
  const [longRestResults, setLongRestResults] = useState<{
    characterId: string;
    characterName: string;
    hpRestored: number;
    exhaustionReduced: number;
    magicItemReplenishments: {
      itemName: string;
      chargesReplenished: number;
      diceRoll?: number;
      maxCharges: number;
    }[];
    featureReplenishments: {
      featureName: string;
      usesReplenished: number;
      diceRoll?: number;
      maxUses: number;
    }[];
    spellSlotReplenishments: {
      level: number;
      slotsRestored: number;
    }[];
    classAbilityReplenishments: {
      abilityName: string;
      usesRestored: number;
      maxUses: number;
    }[];
    featSpellReplenishments: {
      featName: string;
      usesRestored: number;
      maxUses: number;
    }[];
    hitDiceReplenishments: {
      diceRestored: number;
      maxDice: number;
      dieType: string;
    };
  }[] | null>(null)
  const [longRestResultsModalOpen, setLongRestResultsModalOpen] = useState(false)
  const [skillSortMode, setSkillSortMode] = useState<'alpha' | 'ability'>('ability')

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('uoc.skillSortMode') : null
      if (stored === 'alpha' || stored === 'ability') {
        setSkillSortMode(stored)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('uoc.skillSortMode', skillSortMode)
      }
    } catch {}
  }, [skillSortMode])

  const { toast } = useToast()

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const activeCharacter = characters.find((c) => c.id === activeCharacterId) || characters[0]
  
  // Debug logging for active character
  if (activeCharacter) {
    console.log('[DEBUG] Active character found:', {
      id: activeCharacter.id,
      name: activeCharacter.name,
      classes: activeCharacter.classes,
      savingThrowProficiencies: activeCharacter.savingThrowProficiencies
    })
  } else {
    console.log('[DEBUG] No active character found')
  }
  

  const debouncedAutoSave = useCallback(async () => {
    if (!dbConnected || !activeCharacterId) {
      return
    }

    // Get fresh character data from state at the time of execution
    let currentCharacter: CharacterData | undefined
    setCharacters(currentCharacters => {
      currentCharacter = currentCharacters.find((c) => c.id === activeCharacterId)
      return currentCharacters
    })

    if (!currentCharacter) {
      return
    }
    
    // Create toast outside of state setter
    const savingToast = toast({
      title: "Saving...",
      description: "Auto-saving your character changes",
    })

    try {
      const { success, error, characterId } = await saveCharacter(currentCharacter)
      if (success) {
        if (characterId && characterId !== currentCharacter.id) {
          setCharacters(prev => prev.map(char => char.id === activeCharacterId ? { ...char, id: characterId } : char))
          setActiveCharacterId(characterId)
        }
        
        // Reload character from database if multiclass data changed
        if (multiclassDataChangedRef.current) {
          multiclassDataChangedRef.current = false
          await reloadCharacterFromDatabase(characterId || activeCharacterId)
        }
        
        savingToast.update({
          id: savingToast.id,
          title: "Saved!",
          description: "Character changes saved successfully",
        })
        setTimeout(() => savingToast.dismiss(), 2000)
      } else {
        savingToast.update({
          id: savingToast.id,
          title: "Save failed",
          description: error || "Failed to save character changes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Auto-save error:", error)
      savingToast.update({
        id: savingToast.id,
        title: "Save failed",
        description: "An error occurred while saving",
        variant: "destructive",
      })
    }
  }, [activeCharacterId, dbConnected, toast])

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    autoSaveTimeoutRef.current = setTimeout(debouncedAutoSave, 1000)
  }, [debouncedAutoSave])

  const updateCharacter = (updates: Partial<CharacterData>, options?: { autosave?: boolean }) => {
    setCharacters((prev) => prev.map((char) => (char.id === activeCharacterId ? { ...char, ...updates } : char)))
    if (options?.autosave !== false) {
      triggerAutoSave()
    }
  }

  const reloadCharacterFromDatabase = useCallback(async (characterId: string) => {
    try {
      const { loadCharacter } = await import('@/lib/database')
      const { character, error } = await loadCharacter(characterId)
      
      if (error) {
        console.error("Error reloading character:", error)
        return
      }
      
      if (character) {
        setCharacters((prev) => prev.map((char) => (char.id === characterId ? character : char)))
      }
    } catch (error) {
      console.error("Error reloading character from database:", error)
    }
  }, [])

  // Spell slots are now calculated during initial character load for better performance

  const handlePartyStatusChange = async (status: 'active' | 'away' | 'deceased') => {
    if (!activeCharacterId || !activeCharacter) return

    const result = await updatePartyStatus(activeCharacterId, status, activeCharacter.class, activeCharacter.level)
    if (result.success) {
      // Update the character in the local state
      updateCharacter({ partyStatus: status })
      toast({
        title: "Party Status Updated",
        description: `Character status changed to ${status}`,
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update party status",
        variant: "destructive",
      })
    }
  }

  const saveActiveCharacterToLocalStorage = (characterId: string) => {
    try {
      localStorage.setItem("dnd-active-character-id", characterId)
    } catch (error) {
      console.error("[v0] Failed to save active character to localStorage:", error)
    }
  }

  const loadActiveCharacterFromLocalStorage = (): string | null => {
    try {
      return localStorage.getItem("dnd-active-character-id")
    } catch (error) {
      console.error("[v0] Failed to load active character from localStorage:", error)
      return null
    }
  }

  useEffect(() => {
    loadFromDatabaseFirst()
  }, [])

  // Spell slots are now calculated during initial character load, no need for async updates

  const loadFromDatabaseFirst = async () => {
    setIsInitialLoading(true)

    // Test connection first
    const { success, error } = await testConnection()
    setDbConnected(success)

    if (success) {
      try {
        const { characters: dbCharacters, error: loadError } = await loadAllCharacters()
        const { campaigns: dbCampaigns, error: campaignLoadError } = await loadAllCampaigns()
        
        if (loadError) {
          console.error("Failed to load characters:", loadError)
          setCharacters(sampleCharacters)
          setActiveCharacterId("1")
          toast({
            title: "Database Error",
            description: "Failed to load characters from database. Using sample data.",
            variant: "destructive",
          })
        } else if (dbCharacters && dbCharacters.length > 0) {
          setCharacters(dbCharacters)
          setCampaigns(dbCampaigns || [])

          // Set active campaign by default
          const activeCampaign = (dbCampaigns || []).find(c => c.isActive)
          let selectedCampaignId = "all"
          if (activeCampaign) {
            selectedCampaignId = activeCampaign.id
            setSelectedCampaignId(activeCampaign.id)
          }

          // Filter characters based on selected campaign
          const filteredCharacters = selectedCampaignId === "all" 
            ? dbCharacters 
            : dbCharacters.filter(character => {
                if (selectedCampaignId === "no-campaign") {
                  return !character.campaignId
                }
                return character.campaignId === selectedCampaignId
              })

          const savedActiveCharacterId = loadActiveCharacterFromLocalStorage()
          let validCharacterId = savedActiveCharacterId && dbCharacters.find((c) => c.id === savedActiveCharacterId)
            ? savedActiveCharacterId
            : null

          // If saved character is not in the filtered campaign, select first character from filtered list
          if (!validCharacterId || !filteredCharacters.find(c => c.id === validCharacterId)) {
            validCharacterId = filteredCharacters.length > 0 ? filteredCharacters[0].id : dbCharacters[0]?.id
          }

          setActiveCharacterId(validCharacterId)
          saveActiveCharacterToLocalStorage(validCharacterId)

          // Spell slots are now calculated during initial load
          toast({
            title: "Success",
            description: `Loaded ${dbCharacters.length} character(s) from database.`,
          })
        } else {
          setCharacters(sampleCharacters)
          setActiveCharacterId("1")
          toast({
            title: "No Characters Found",
            description: "No characters found in database. Starting with sample data.",
          })
        }
      } catch (error) {
        console.error("Error loading characters:", error)
        setCharacters(sampleCharacters)
        setActiveCharacterId("1")
        toast({
          title: "Database Error",
          description: "Failed to connect to database. Using sample data.",
          variant: "destructive",
        })
      }
    } else {
      setCharacters(sampleCharacters)
      setActiveCharacterId("1")
      toast({
        title: "Database Offline",
        description: "Using offline mode with sample data. Check your Supabase configuration.",
        variant: "destructive",
      })
    }

    setIsInitialLoading(false)
  }

  // Long Rest Functions
  const handleStartLongRest = () => {
    setCurrentLongRestEvent(null) // Clear any existing event
    setLongRestModalOpen(true)
  }

  // Dice Roll Functions
  const handleOpenDiceRoll = () => {
    setDiceRollModalOpen(true)
  }

  // Campaign Management Functions
  const handleOpenCampaignManagement = () => {
    setCampaignManagementModalOpen(true)
  }

  const handleCreateCampaign = async (campaign: Campaign) => {
    try {
      const result = await createCampaignDB(campaign)
      if (result.success) {
        setCampaigns(prev => [...prev, campaign])
        toast({
          title: "Campaign Created",
          description: `"${campaign.name}" has been created successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the campaign.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCampaign = async (campaign: Campaign) => {
    try {
      const result = await updateCampaignDB(campaign)
      if (result.success) {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c))
        toast({
          title: "Campaign Updated",
          description: `"${campaign.name}" has been updated successfully.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the campaign.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const result = await deleteCampaign(campaignId)
      if (result.success) {
        setCampaigns(prev => prev.filter(c => c.id !== campaignId))
        // Remove campaign association from characters
        setCharacters(prev => prev.map(char => 
          char.campaignId === campaignId ? { ...char, campaignId: undefined } : char
        ))
        toast({
          title: "Campaign Deleted",
          description: "Campaign has been deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the campaign.",
        variant: "destructive",
      })
    }
  }

  const handleAssignCharacterToCampaign = async (characterId: string, campaignId: string) => {
    try {
      const result = await assignCharacterToCampaign(characterId, campaignId)
      if (result.success) {
        setCharacters(prev => prev.map(char => 
          char.id === characterId ? { ...char, campaignId } : char
        ))
        toast({
          title: "Character Assigned",
          description: "Character has been assigned to the campaign.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to assign character to campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error assigning character to campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning the character.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveCharacterFromCampaign = async (characterId: string, campaignId: string) => {
    try {
      const result = await removeCharacterFromCampaign(characterId)
      if (result.success) {
        setCharacters(prev => prev.map(char => 
          char.id === characterId ? { ...char, campaignId: undefined } : char
        ))
        toast({
          title: "Character Removed",
          description: "Character has been removed from the campaign.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove character from campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error removing character from campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while removing the character.",
        variant: "destructive",
      })
    }
  }

  const handleSetActiveCampaign = async (campaignId: string) => {
    try {
      const result = await setActiveCampaign(campaignId)
      if (result.success) {
        // Update campaigns state to reflect the new active campaign
        setCampaigns(prev => prev.map(c => ({
          ...c,
          isActive: c.id === campaignId
        })))
        // Set the selected campaign to the active one
        setSelectedCampaignId(campaignId)
        toast({
          title: "Active Campaign Set",
          description: "The campaign has been set as active and will load by default.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to set active campaign.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting active campaign:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while setting the active campaign.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateHP = (newHP: number) => {
    if (!activeCharacter) return
    
    const updatedCharacter = {
      ...activeCharacter,
      currentHP: newHP
    }
    
    updateCharacter(updatedCharacter)
  }

  const applyLongRestEffects = useCallback(async (selectedCharacterIds: string[], eventId?: string) => {
    try {
      const longRestResults: {
        characterId: string;
        characterName: string;
        hpRestored: number;
        exhaustionReduced: number;
        magicItemReplenishments: {
          itemName: string;
          chargesReplenished: number;
          diceRoll?: number;
          maxCharges: number;
        }[];
        featureReplenishments: {
          featureName: string;
          usesReplenished: number;
          diceRoll?: number;
          maxUses: number;
        }[];
        spellSlotReplenishments: {
          level: number;
          slotsRestored: number;
        }[];
        classAbilityReplenishments: {
          abilityName: string;
          usesRestored: number;
          maxUses: number;
        }[];
        featSpellReplenishments: {
          featName: string;
          usesRestored: number;
          maxUses: number;
        }[];
        hitDiceReplenishments: {
          diceRestored: number;
          maxDice: number;
          dieType: string;
        };
      }[] = []

      // Update all selected characters to restore their hit points and replenish magic items
      const updatedCharacters = characters.map(character => {
        if (selectedCharacterIds.includes(character.id)) {
          const hpRestored = character.maxHitPoints - character.currentHitPoints
          const exhaustionReduced = Math.min(1, character.exhaustion || 0) // Reduce by 1, but not below 0
          const magicItemReplenishments: {
            itemName: string;
            chargesReplenished: number;
            diceRoll?: number;
            maxCharges: number;
          }[] = []

          const featureReplenishments: {
            featureName: string;
            usesReplenished: number;
            diceRoll?: number;
            maxUses: number;
          }[] = []

          const spellSlotReplenishments: {
            level: number;
            slotsRestored: number;
          }[] = []

          const classAbilityReplenishments: {
            abilityName: string;
            usesRestored: number;
            maxUses: number;
          }[] = []

          const featSpellReplenishments: {
            featName: string;
            usesRestored: number;
            maxUses: number;
          }[] = []

          const hitDiceReplenishments: {
            diceRestored: number;
            maxDice: number;
            dieType: string;
          } = {
            diceRestored: 0,
            maxDice: 0,
            dieType: "d8"
          }

          // Replenish magic item charges
          const updatedMagicItems = character.magicItems.map(item => {
            if (item.maxUses && item.maxUses > 0 && item.dailyRecharge) {
              let chargesReplenished = 0
              let diceRoll: number | undefined

              if (item.dailyRecharge.toLowerCase() === 'all') {
                // Replenish all charges
                chargesReplenished = item.maxUses - (item.currentUses || 0)
              } else if (item.dailyRecharge.includes('d')) {
                // Roll dice for replenishment (e.g., "1d3", "1d4+1")
                const diceMatch = item.dailyRecharge.match(/(\d+)d(\d+)([+-]\d+)?/)
                if (diceMatch) {
                  const numDice = parseInt(diceMatch[1])
                  const diceSize = parseInt(diceMatch[2])
                  const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : 0
                  
                  // Roll the dice
                  let totalRoll = 0
                  for (let i = 0; i < numDice; i++) {
                    totalRoll += Math.floor(Math.random() * diceSize) + 1
                  }
                  totalRoll += modifier
                  
                  diceRoll = totalRoll
                  const maxPossibleReplenishment = item.maxUses - (item.currentUses || 0)
                  chargesReplenished = Math.min(totalRoll, maxPossibleReplenishment)
                }
              }

              if (chargesReplenished > 0) {
                magicItemReplenishments.push({
                  itemName: item.name || "Unnamed Magic Item",
                  chargesReplenished,
                  diceRoll,
                  maxCharges: item.maxUses
                })
              }

              return {
                ...item,
                currentUses: Math.min(item.maxUses, (item.currentUses || 0) + chargesReplenished)
              }
            }
            return item
          })

          // Replenish feature uses
          const updatedFeatures = character.features.map(feature => {
            if (feature.refuelingDie && feature.usesPerLongRest) {
              const actualUsesPerLongRest = getFeatureUsesPerLongRest(feature)
              const currentUses = Math.min(actualUsesPerLongRest, Math.max(0, feature.currentUses ?? actualUsesPerLongRest))
              const maxPossibleReplenishment = actualUsesPerLongRest - currentUses
              
              if (maxPossibleReplenishment > 0) {
                let usesReplenished = 0
                let diceRoll: number | undefined

                if (feature.refuelingDie.toLowerCase() === 'all') {
                  // Replenish all uses
                  usesReplenished = maxPossibleReplenishment
                } else if (feature.refuelingDie.includes('d')) {
                  // Roll dice for replenishment (e.g., "1d3", "1d4+1")
                  const diceMatch = feature.refuelingDie.match(/(\d+)d(\d+)([+-]\d+)?/)
                  if (diceMatch) {
                    const numDice = parseInt(diceMatch[1])
                    const diceSize = parseInt(diceMatch[2])
                    const modifier = diceMatch[3] ? parseInt(diceMatch[3]) : 0
                    
                    // Roll the dice
                    let totalRoll = 0
                    for (let i = 0; i < numDice; i++) {
                      totalRoll += Math.floor(Math.random() * diceSize) + 1
                    }
                    totalRoll += modifier
                    
                    diceRoll = totalRoll
                    usesReplenished = Math.min(totalRoll, maxPossibleReplenishment)
                  }
                }

                if (usesReplenished > 0) {
                  featureReplenishments.push({
                    featureName: feature.name,
                    usesReplenished,
                    diceRoll,
                    maxUses: actualUsesPerLongRest
                  })
                }

                return {
                  ...feature,
                  currentUses: Math.min(actualUsesPerLongRest, currentUses + usesReplenished)
                }
              }
            }
            return feature
          })

          // Replenish spell slots
          const updatedSpellSlots = character.spellData.spellSlots.map(slot => {
            const slotsRestored = slot.used
            if (slotsRestored > 0) {
              spellSlotReplenishments.push({
                level: slot.level,
                slotsRestored
              })
            }
            return {
              ...slot,
              used: 0 // Reset all used spell slots
            }
          })

          // Replenish class-specific abilities
          const updatedSpellData = { ...character.spellData, spellSlots: updatedSpellSlots }

          // Bardic Inspiration
          if (character.spellData.bardicInspirationSlot) {
            const bardicSlot = character.spellData.bardicInspirationSlot
            const usesRestored = bardicSlot.usesPerRest - bardicSlot.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Bardic Inspiration",
                usesRestored,
                maxUses: bardicSlot.usesPerRest
              })
            }
            updatedSpellData.bardicInspirationSlot = {
              ...bardicSlot,
              currentUses: bardicSlot.usesPerRest
            }
          }

          // Flash of Genius (Artificer)
          if (character.spellData.flashOfGeniusSlot) {
            const fogSlot = character.spellData.flashOfGeniusSlot
            const usesRestored = fogSlot.usesPerRest - fogSlot.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Flash of Genius",
                usesRestored,
                maxUses: fogSlot.usesPerRest
              })
            }
            updatedSpellData.flashOfGeniusSlot = {
              ...fogSlot,
              currentUses: fogSlot.usesPerRest
            }
          }

          // Divine Sense (Paladin)
          if (character.spellData.divineSenseSlot) {
            const divineSlot = character.spellData.divineSenseSlot
            const usesRestored = divineSlot.usesPerRest - divineSlot.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Divine Sense",
                usesRestored,
                maxUses: divineSlot.usesPerRest
              })
            }
            updatedSpellData.divineSenseSlot = {
              ...divineSlot,
              currentUses: divineSlot.usesPerRest
            }
          }

          // Channel Divinity (Paladin)
          if (character.spellData.channelDivinitySlot) {
            const channelSlot = character.spellData.channelDivinitySlot
            const usesRestored = channelSlot.usesPerRest - channelSlot.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Channel Divinity",
                usesRestored,
                maxUses: channelSlot.usesPerRest
              })
            }
            updatedSpellData.channelDivinitySlot = {
              ...channelSlot,
              currentUses: channelSlot.usesPerRest
            }
          }

          // Cleansing Touch (Paladin)
          if (character.spellData.cleansingTouchSlot) {
            const cleansingSlot = character.spellData.cleansingTouchSlot
            const usesRestored = cleansingSlot.usesPerRest - cleansingSlot.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Cleansing Touch",
                usesRestored,
                maxUses: cleansingSlot.usesPerRest
              })
            }
            updatedSpellData.cleansingTouchSlot = {
              ...cleansingSlot,
              currentUses: cleansingSlot.usesPerRest
            }
          }

          // Elemental Gift (Warlock)
          if (character.spellData.elementalGift) {
            const elementalGift = character.spellData.elementalGift
            const usesRestored = elementalGift.usesPerLongRest - elementalGift.currentUses
            if (usesRestored > 0) {
              classAbilityReplenishments.push({
                abilityName: "Elemental Gift",
                usesRestored,
                maxUses: elementalGift.usesPerLongRest
              })
            }
            updatedSpellData.elementalGift = {
              ...elementalGift,
              currentUses: elementalGift.usesPerLongRest
            }
          }

          // Song of Rest (Bard) - reset to available
          if (character.spellData.songOfRest) {
            updatedSpellData.songOfRest = {
              ...character.spellData.songOfRest,
              available: true
            }
          }

          // Replenish feat spell slots
          const updatedFeatSpellSlots = character.spellData.featSpellSlots.map(feat => {
            const usesRestored = feat.usesPerLongRest - feat.currentUses
            if (usesRestored > 0) {
              featSpellReplenishments.push({
                featName: feat.featName,
                usesRestored,
                maxUses: feat.usesPerLongRest
              })
            }
            return {
              ...feat,
              currentUses: feat.usesPerLongRest // Reset to full uses
            }
          })

          updatedSpellData.featSpellSlots = updatedFeatSpellSlots

          // Replenish hit dice (restore up to half of total hit dice, minimum 1)
          let updatedHitDice = character.hitDice
          if (character.hitDice) {
            const diceToRestore = Math.max(1, Math.floor(character.hitDice.total / 2))
            const maxPossibleRestore = character.hitDice.used // Number of used dice that can be restored
            const actualRestore = Math.min(diceToRestore, maxPossibleRestore)
            
            
            if (actualRestore > 0) {
              hitDiceReplenishments.diceRestored = actualRestore
              hitDiceReplenishments.maxDice = character.hitDice.total
              hitDiceReplenishments.dieType = character.hitDice.dieType
              
              updatedHitDice = {
                ...character.hitDice,
                used: Math.max(0, character.hitDice.used - actualRestore)
              }
              
            }
          }

          longRestResults.push({
            characterId: character.id,
            characterName: character.name,
            hpRestored,
            exhaustionReduced,
            magicItemReplenishments,
            featureReplenishments,
            spellSlotReplenishments,
            classAbilityReplenishments,
            featSpellReplenishments,
            hitDiceReplenishments
          })

          return {
            ...character,
            currentHitPoints: character.maxHitPoints,
            magicItems: updatedMagicItems,
            features: updatedFeatures,
            spellData: updatedSpellData,
            hitDice: updatedHitDice,
            exhaustion: Math.max(0, (character.exhaustion || 0) - 1), // Reduce exhaustion by 1 (minimum 0)
          }
        }
        return character
      })

      setCharacters(updatedCharacters)

      // Save all updated characters to database
      const savePromises = selectedCharacterIds.map(async (characterId) => {
        const character = updatedCharacters.find(c => c.id === characterId)
        if (character) {
          const { success, error } = await saveCharacter(character)
          if (!success) {
            console.error(`Failed to save character ${character.name}:`, error)
          }
          return { characterId, success, error }
        }
        return { characterId, success: false, error: "Character not found" }
      })

      const results = await Promise.all(savePromises)
      const failedSaves = results.filter(r => !r.success)

      // Store the long rest results for the results modal
      setLongRestResults(longRestResults)

      // Note: Event completion is now handled by confirmLongRestEvent

      if (failedSaves.length === 0) {
        toast({
          title: "Long Rest Complete",
          description: `${selectedCharacterIds.length} character${selectedCharacterIds.length !== 1 ? 's' : ''} have completed a long rest and restored their hit points.`,
        })
      } else {
        toast({
          title: "Long Rest Partially Complete",
          description: `Long rest completed for most characters, but ${failedSaves.length} failed to save.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error applying long rest effects:", error)
      throw error
    }
  }, [characters, toast])

  const handleIncomingLongRestEvent = useCallback(async (event: LongRestEvent) => {
    
    if (event.status === 'completed') {
      // Event was completed by another player
      if (currentLongRestEvent && currentLongRestEvent.id === event.id) {
        setCurrentLongRestEvent(null)
        setLongRestModalOpen(false)
        
        // Apply the long rest effects locally since another player confirmed it
        await applyLongRestEffects(event.selected_character_ids, event.id)
        
        // Show results modal
        setLongRestResultsModalOpen(true)
        
        const confirmerName = characters.find(c => c.id === event.confirmed_by_character_id)?.name || 'Another player'
        toast({
          title: "Long Rest Completed",
          description: `${confirmerName} has confirmed the long rest. All effects have been applied.`,
        })
      }
      return
    }

    // Don't process events initiated by the current user (they're already applied locally)
    if (event.initiated_by_character_id === activeCharacter?.id) {
      return
    }

    
    try {
      // Set the current event and open the modal
      setCurrentLongRestEvent(event)
      setLongRestModalOpen(true)
      
      // Show notification about the long rest
      const initiatorName = characters.find(c => c.id === event.initiated_by_character_id)?.name || 'Another player'
      toast({
        title: "Long Rest Initiated",
        description: `${initiatorName} has initiated a long rest. Review the effects and confirm when ready.`,
      })
    } catch (error) {
      console.error("[Realtime] Error processing incoming long rest event:", error)
      toast({
        title: "Sync Error",
        description: "Failed to process long rest event from another player.",
        variant: "destructive",
      })
    }
  }, [activeCharacter?.id, characters, currentLongRestEvent, toast, applyLongRestEffects])

  const handleConfirmLongRest = useCallback(async (selectedCharacterIds: string[]) => {
    if (selectedCharacterIds.length === 0) {
      toast({
        title: "No Characters Selected",
        description: "Please select at least one character for the long rest.",
        variant: "destructive",
      })
      return
    }

    if (!activeCharacter) {
      toast({
        title: "No Active Character",
        description: "Cannot initiate long rest without an active character.",
        variant: "destructive",
      })
      return
    }

    try {
      if (currentLongRestEvent) {
        // This is a confirmation of an existing long rest event
        
        // Confirm the event
        const { success: confirmSuccess, error: confirmError } = await confirmLongRestEvent(
          currentLongRestEvent.id,
          activeCharacter.id,
          {
            confirmed_by: activeCharacter.name,
            final_status: 'confirmed'
          }
        )

        if (!confirmSuccess) {
          console.error("Failed to confirm long rest event:", confirmError)
          toast({
            title: "Confirmation Failed",
            description: "Failed to confirm the long rest event.",
            variant: "destructive",
          })
          return
        }

        // Apply the long rest effects
        await applyLongRestEffects(currentLongRestEvent.selected_character_ids, currentLongRestEvent.id)
        
        // Clear the current event and show results
        setCurrentLongRestEvent(null)
        setLongRestModalOpen(false)
        setLongRestResultsModalOpen(true)
        
      } else {
        // This is a new long rest initiation
        
        // Prepare event data for broadcasting
        const eventData: LongRestEventData = {
          effects_applied: ['restore_hit_points'],
          characters_affected: selectedCharacterIds.map(id => {
            const char = characters.find(c => c.id === id)
            return {
              id,
              name: char?.name || 'Unknown',
              hp_restored: char ? char.maxHitPoints - char.currentHitPoints : 0
            }
          }),
          modal_open: true,
          awaiting_confirmation: true
        }

        // Broadcast the long rest event to all connected clients
        const { success: broadcastSuccess, error: broadcastError, eventId } = await broadcastLongRestEvent(
          activeCharacter.id,
          selectedCharacterIds,
          eventData
        )

        if (!broadcastSuccess) {
          console.error("Failed to broadcast long rest event:", broadcastError)
          toast({
            title: "Broadcast Failed",
            description: "Long rest completed locally but failed to sync with other players.",
            variant: "destructive",
          })
        }

        // Apply the long rest effects locally
        await applyLongRestEffects(selectedCharacterIds, eventId)
        
        // Show results modal
        setLongRestModalOpen(false)
        setLongRestResultsModalOpen(true)
      }

    } catch (error) {
      console.error("Error during long rest:", error)
      toast({
        title: "Long Rest Failed",
        description: "An error occurred during the long rest process.",
        variant: "destructive",
      })
    }
  }, [activeCharacter, characters, currentLongRestEvent, applyLongRestEffects, toast])

  // Set up real-time subscription for long rest events
  useEffect(() => {
    if (dbConnected) {
      
      const subscription = subscribeToLongRestEvents(
        (event: LongRestEvent) => {
          handleIncomingLongRestEvent(event)
        },
        (error) => {
          console.error("[Realtime] Subscription error:", error)
          toast({
            title: "Connection Error",
            description: "Lost connection to real-time updates. Some features may not sync properly.",
            variant: "destructive",
          })
        }
      )
      
      setRealtimeSubscription(subscription)
      
      return () => {
        console.log("[Realtime] Cleaning up subscription...")
        subscription?.unsubscribe()
      }
    }
  }, [dbConnected, handleIncomingLongRestEvent]) // Use memoized function

  const loadCharactersFromDatabase = async () => {
    if (!dbConnected) {
      toast({
        title: "Database Offline",
        description: "Cannot reload characters - database connection unavailable.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { characters: dbCharacters, error } = await loadAllCharacters()
      const { campaigns: dbCampaigns, error: campaignLoadError } = await loadAllCampaigns()
      
      if (error) {
        console.error("Failed to load characters:", error)
        toast({
          title: "Error",
          description: "Failed to reload characters from database.",
          variant: "destructive",
        })
      } else if (dbCharacters && dbCharacters.length > 0) {
        setCharacters(dbCharacters)
        setCampaigns(dbCampaigns || [])
        
        // Set active campaign by default
        const activeCampaign = (dbCampaigns || []).find(c => c.isActive)
        if (activeCampaign) {
          setSelectedCampaignId(activeCampaign.id)
        }
        
        const savedActiveCharacterId = loadActiveCharacterFromLocalStorage()
        const validCharacterId =
          savedActiveCharacterId && dbCharacters.find((c) => c.id === savedActiveCharacterId)
            ? savedActiveCharacterId
            : dbCharacters[0].id

        setActiveCharacterId(validCharacterId)
        saveActiveCharacterToLocalStorage(validCharacterId)

        // Spell slots are now calculated during initial load
        toast({
          title: "Success",
          description: `Reloaded ${dbCharacters.length} character(s) from database.`,
        })
      }
    } catch (error) {
      console.error("Error loading characters:", error)
      toast({
        title: "Error",
        description: "Failed to reload characters from database.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveCurrentCharacter = async () => {
    if (!activeCharacter) {
      return
    }

    if (!dbConnected) {
      toast({
        title: "Database Offline",
        description: "Cannot save character - database connection unavailable.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { success, error, characterId } = await saveCharacter(activeCharacter)
      if (success) {
        // If a new UUID was generated, update the character's ID in local state
        if (characterId && characterId !== activeCharacter.id) {
          updateCharacter({ id: characterId })
          setActiveCharacterId(characterId)
        }
        toast({
          title: "Success",
          description: `${activeCharacter.name} saved successfully!`,
        })
      } else {
        toast({
          title: "Error",
          description: error || "Failed to save character",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving character:", error)
      toast({
        title: "Error",
        description: "Failed to save character to database",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }


  const updateSpellData = (spellDataUpdates: Partial<SpellData>) => {
    console.log("[v0] updateSpellData called with:", spellDataUpdates)
    
    if (!activeCharacterId) {
      console.log("[v0] No active character ID, skipping update")
      return
    }
    
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) {
      console.log("[v0] Character not found, skipping update")
      return
    }
    
    const updatedSpellData = {
      ...currentCharacter.spellData,
      ...spellDataUpdates,
    }
    
    console.log("[v0] Updating character with spell data:", updatedSpellData)
    // User action -> autosave
    updateCharacter({ spellData: updatedSpellData }, { autosave: true })
  }

  const updateBasicInfo = async (updates: Partial<CharacterData>) => {
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) return

    // Check if class or subclass changed
    const classChanged = updates.class && updates.class !== currentCharacter.class
    const subclassChanged = updates.subclass !== undefined && updates.subclass !== currentCharacter.subclass
    const levelChanged = updates.level && updates.level !== currentCharacter.level
    
    // Check if multiclass data changed
    const multiclassChanged = updates.classes && JSON.stringify(updates.classes) !== JSON.stringify(currentCharacter.classes)
    
    // Set flag to trigger reload after save if multiclass data changed
    if (multiclassChanged) {
      multiclassDataChangedRef.current = true
    }

    // If class, subclass, level, or multiclass data changed, we need to recalculate everything
    if (classChanged || subclassChanged || levelChanged || multiclassChanged) {
      try {
        // Load new class data
        const { loadClassData } = await import('@/lib/database')
        const { classData } = await loadClassData(updates.class || currentCharacter.class, updates.subclass)
        
        // Load new class features - handle both single class and multiclass
        let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
        
        if (updates.classes && updates.classes.length > 0) {
          // Load features for all classes in multiclassing
          const { loadClassFeatures } = await import('@/lib/database')
          const allFeatures = await Promise.all(
            updates.classes.map(async (charClass: any) => {
              if (charClass.class_id) {
                const { features, error: featuresError } = await loadClassFeatures(charClass.class_id, charClass.level)
                if (featuresError) {
                  console.error(`Error loading class features for ${charClass.name}:`, featuresError)
                  return []
                }
                return features || []
              } else {
                console.log(`[DEBUG] No class_id for ${charClass.name}, skipping`)
                return []
              }
            })
          )
          // Flatten and combine all features
          classFeatures = allFeatures.flat()
        } else if (classData?.id) {
          // Fallback to single class loading
          const { loadClassFeatures } = await import('@/lib/database')
          const { features, error: featuresError } = await loadClassFeatures(classData.id, updates.level || currentCharacter.level)
          if (featuresError) {
            console.error("Error loading class features:", featuresError)
          } else {
            classFeatures = features || []
          }
        }

        // Calculate new spell slots
        let newSpellSlots: any[] = []
        if (updates.classes && updates.classes.length > 1) {
          // Use multiclassing spell slot calculation
          const { getMulticlassSpellSlots } = await import('@/lib/character-data')
          newSpellSlots = getMulticlassSpellSlots(updates.classes)
        } else if (classData) {
          if ((updates.class || currentCharacter.class).toLowerCase() === "warlock") {
            const { getWarlockSpellSlots } = await import('@/lib/character-data')
            newSpellSlots = getWarlockSpellSlots(updates.level || currentCharacter.level)
          } else {
            const { calculateSpellSlotsFromClass } = await import('@/lib/spell-slot-calculator')
            newSpellSlots = calculateSpellSlotsFromClass(classData, updates.level || currentCharacter.level)
          }
        }

        // Calculate new spell values
        const newLevel = updates.level || currentCharacter.level
        const proficiencyBonus = Math.ceil(newLevel / 4) + 1
        const newCharacter = { ...currentCharacter, ...updates, level: newLevel }
        
        const { calculateSpellAttackBonus, calculateSpellSaveDC, getSpellsKnown } = await import('@/lib/character-data')
        const { getCantripsKnown, getBardicInspirationData, getSongOfRestData } = await import('@/lib/class-utils')
        
        const newSpellAttackBonus = calculateSpellAttackBonus(newCharacter, classData, proficiencyBonus)
        const newSpellSaveDC = calculateSpellSaveDC(newCharacter, classData, proficiencyBonus)
        const newSpellsKnown = getSpellsKnown(newCharacter, classData)
        const newCantripsKnown = getCantripsKnown(newLevel, classData, updates.class || currentCharacter.class, newCharacter)
        
        // Calculate class-specific features
        const charismaModifier = Math.floor((newCharacter.charisma - 10) / 2)
        let bardicInspiration, songOfRest, flashOfGeniusSlot, divineSenseSlot, layOnHands, channelDivinitySlot, cleansingTouchSlot
        
        if (updates.classes && updates.classes.length > 1) {
          // Use multiclass feature calculation
          const { getMulticlassFeatures } = await import('@/lib/character-data')
          const multiclassFeatures = await getMulticlassFeatures(newCharacter)
          bardicInspiration = multiclassFeatures.bardicInspirationSlot
          songOfRest = multiclassFeatures.songOfRest
          flashOfGeniusSlot = multiclassFeatures.flashOfGeniusSlot
          divineSenseSlot = multiclassFeatures.divineSenseSlot
          layOnHands = multiclassFeatures.layOnHands
          channelDivinitySlot = multiclassFeatures.channelDivinitySlot
          cleansingTouchSlot = multiclassFeatures.cleansingTouchSlot
        } else {
          // Use single class feature calculation
          bardicInspiration = getBardicInspirationData(newLevel, charismaModifier, classData)
          songOfRest = getSongOfRestData(newLevel, classData)
        }

        // Create comprehensive updates
        const comprehensiveUpdates: Partial<CharacterData> = {
          ...updates,
          class_id: classData?.id,
          classFeatures: classFeatures,
          savingThrowProficiencies: (classChanged || multiclassChanged) ? 
            (updates.classes && updates.classes.length > 1 ? 
              (await import('@/lib/character-data')).getMulticlassSavingThrowProficiencies(updates.classes) :
              (await import('@/lib/character-data')).createClassBasedSavingThrowProficiencies(updates.class || currentCharacter.class)
            ) :
            currentCharacter.savingThrowProficiencies,
          equipmentProficiencies: (classChanged || multiclassChanged) ?
            (updates.classes && updates.classes.length > 1 ?
              (await import('@/lib/character-data')).getMulticlassEquipmentProficiencies(updates.classes) :
              currentCharacter.equipmentProficiencies
            ) :
            currentCharacter.equipmentProficiencies,
          spellData: {
            ...currentCharacter.spellData,
            spellAttackBonus: newSpellAttackBonus,
            spellSaveDC: newSpellSaveDC,
            spellsKnown: newSpellsKnown,
            cantripsKnown: newCantripsKnown,
            spellSlots: newSpellSlots,
            bardicInspirationSlot: bardicInspiration || undefined,
            songOfRest: songOfRest || undefined,
            flashOfGeniusSlot: flashOfGeniusSlot || undefined,
            divineSenseSlot: divineSenseSlot || undefined,
            layOnHands: layOnHands || undefined,
            channelDivinitySlot: channelDivinitySlot || undefined,
            cleansingTouchSlot: cleansingTouchSlot || undefined,
            // Clear class-specific features when class changes
            ...(classChanged ? {
              eldritchInvocations: undefined,
              mysticArcanum: undefined,
              genieWrath: undefined,
              elementalGift: undefined,
              sanctuaryVessel: undefined,
              limitedWish: undefined,
            } : {}),
          },
          // Clear class-specific equipment when class changes
          ...(classChanged ? {
            eldritchCannon: undefined,
            infusions: [],
            infusionNotes: "",
            hitDiceByClass: updates.classes && updates.classes.length > 1 ?
              (await import('@/lib/character-data')).getHitDiceByClass(updates.classes) :
              undefined,
          } : {}),
        }

        updateCharacter(comprehensiveUpdates)
        
        toast({
          title: "Character Updated",
          description: classChanged ? 
            `Class changed to ${updates.class}. All class features and calculations have been updated.` :
            "Character information updated successfully.",
        })
      } catch (error) {
        console.error("Error updating character with class data:", error)
        // Fallback to basic update if class data loading fails
        updateCharacter(updates)
        toast({
          title: "Warning",
          description: "Character updated, but some class features may need to be refreshed.",
          variant: "destructive",
        })
      }
    } else {
      // No class/level change, just update normally
      updateCharacter(updates)
    }
  }

  const updateSkillProficiency = (skillName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => {
    if (!activeCharacterId) return
    
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) return

    const updatedSkills: Skill[] = currentCharacter.skills.map((skill): Skill => {
      if (skill.name === skillName) {
        if (proficiencyType === "proficient") {
          if (checked) {
            // If proficient is checked and expertise was already on, keep expertise
            return { ...skill, proficiency: (skill.proficiency === "expertise" ? "expertise" : "proficient") as Skill["proficiency"] }
          } else {
            // If proficient is unchecked, remove proficiency (but keep expertise if it was on)
            return { ...skill, proficiency: (skill.proficiency === "expertise" ? "expertise" : "none") as Skill["proficiency"] }
          }
        } else {
          // expertise
          if (checked) {
            // If expertise is checked, set to expertise (proficient is implied)
            return { ...skill, proficiency: "expertise" as Skill["proficiency"] }
          } else {
            // If expertise is unchecked, set to proficient if it was on, otherwise none
            return { ...skill, proficiency: (skill.proficiency !== "none" ? "proficient" : "none") as Skill["proficiency"] }
          }
        }
      }
      return skill
    })
    updateCharacter({ skills: updatedSkills })
    triggerAutoSave()
  }

  const updateToolProficiency = (toolName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => {
    if (!activeCharacterId) return
    
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) return

    const updatedTools: ToolProficiency[] = currentCharacter.toolsProficiencies.map((tool): ToolProficiency => {
      if (tool.name === toolName) {
        if (proficiencyType === "proficient") {
          if (checked) {
            // If proficient is checked and expertise was already on, keep expertise
            return { ...tool, proficiency: (tool.proficiency === "expertise" ? "expertise" : "proficient") as ToolProficiency["proficiency"] }
          } else {
            // If proficient is unchecked, remove proficiency (but keep expertise if it was on)
            return { ...tool, proficiency: (tool.proficiency === "expertise" ? "expertise" : "none") as ToolProficiency["proficiency"] }
          }
        } else {
          // expertise
          if (checked) {
            // If expertise is checked, set to expertise (proficient is implied)
            return { ...tool, proficiency: "expertise" as ToolProficiency["proficiency"] }
          } else {
            // If expertise is unchecked, set to proficient if it was on, otherwise none
            return { ...tool, proficiency: (tool.proficiency !== "none" ? "proficient" : "none") as ToolProficiency["proficiency"] }
          }
        }
      }
      return tool
    })
    updateCharacter({ toolsProficiencies: updatedTools })
    triggerAutoSave()
  }

  const createNewCharacter = () => {
    setCharacterCreationModalOpen(true)
  }

  const handleCreateCharacter = async (characterData: {
    name: string
    class: string
    subclass: string
    classId: string
    level: number
    background: string
    race: string
    alignment: string
  }) => {
    const newId = (characters.length + 1).toString()
    
    // Load class data to get primary ability for spell calculations
    const { classData } = await loadClassData(characterData.class, characterData.subclass)
    const proficiencyBonus = calculateProficiencyBonus(characterData.level)
    
    // Load class features from database
    let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
    if (classData?.id) {
      console.log(`[DEBUG] handleCreateCharacter: Loading features for class_id: ${classData.id}, level: ${characterData.level}`)
      const { features, error: featuresError } = await loadClassFeatures(classData.id, characterData.level)
      if (featuresError) {
        console.error("Error loading class features:", featuresError)
      } else {
        classFeatures = features || []
        console.log(`[DEBUG] handleCreateCharacter: Loaded ${classFeatures.length} features for new character`)
      }
    } else {
      console.log(`[DEBUG] handleCreateCharacter: No class data found for ${characterData.class} ${characterData.subclass}`)
    }
    
    // Create a temporary character object for calculations
    const tempCharacter: CharacterData = {
      id: newId,
      name: characterData.name,
      class: characterData.class,
      subclass: characterData.subclass,
      class_id: characterData.classId,
      level: characterData.level,
      background: characterData.background,
      race: characterData.race,
      alignment: characterData.alignment,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      armorClass: 10,
      initiative: 0,
      speed: 30,
      currentHitPoints: 8,
      maxHitPoints: 8,
      exhaustion: 0,
      hitDice: {
        total: characterData.level,
        used: 0,
        dieType: "d8", // Default, will be updated based on class
      },
      weapons: [],
      weaponNotes: "",
      features: [],
      savingThrowProficiencies: createClassBasedSavingThrowProficiencies(characterData.class),
      skills: createClassBasedSkills(classData?.skill_proficiencies || []) as any,
      spellData: {
        spellAttackBonus: 0,
        spellSaveDC: 8,
        cantripsKnown: 0,
        spellsKnown: 0,
        spellSlots: [],
        spellNotes: "",
        bardicInspirationSlot: undefined,
        songOfRest: undefined,
        featSpellSlots: [],
        spells: [],
      },
      classFeatures: classFeatures,
      toolsProficiencies: [] as any,
      feats: [],
      infusions: [],
      infusionNotes: "",
      equipment: "",
      magicItems: [],
      languages: "",
      otherTools: "",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
      bardicInspirationUsed: 0,
      // Initialize spell slots used to 0 for new characters
      spellSlotsUsed: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
      },
      classes: [{
        name: characterData.class,
        subclass: characterData.subclass,
        class_id: characterData.classId,
        level: characterData.level
      }],
    }
    
    // Calculate spell slots immediately during character creation
    let calculatedSpellSlots: any[] = []
    if (classData) {
      // Warlocks use a different spell slot system (Pact Magic)
      if (characterData.class.toLowerCase() === "warlock") {
        const { getWarlockSpellSlots } = await import('../lib/character-data')
        calculatedSpellSlots = getWarlockSpellSlots(characterData.level)
      } else {
        // Import the spell slot calculation function for other classes
        const { calculateSpellSlotsFromClass } = await import('../lib/spell-slot-calculator')
        const newSpellSlots = calculateSpellSlotsFromClass(classData, characterData.level)
        calculatedSpellSlots = newSpellSlots.map((newSlot: any) => {
          // For new characters, all slots start unused (used = 0)
          return { ...newSlot, used: 0 }
        })
      }
    }

    // Now calculate spell values using the temporary character
    const newCharacter: CharacterData = {
      ...tempCharacter,
      spellData: {
        ...tempCharacter.spellData,
        spellAttackBonus: calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
        spellSaveDC: calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
        cantripsKnown: characterData.class.toLowerCase() === "warlock" 
          ? (() => {
              const { getWarlockCantripsKnown } = require('../lib/character-data')
              return getWarlockCantripsKnown(characterData.level)
            })()
          : 0, // Will be calculated from class data for other classes
        spellsKnown: characterData.class.toLowerCase() === "warlock"
          ? (() => {
              const { getWarlockSpellsKnown } = require('../lib/character-data')
              return getWarlockSpellsKnown(characterData.level)
            })()
          : getSpellsKnown(tempCharacter, classData, undefined),
        spellSlots: calculatedSpellSlots, // Populate immediately
        // Add class-specific features
        bardicInspirationSlot: getBardicInspirationData(tempCharacter.level, Math.floor((tempCharacter.charisma - 10) / 2), classData) || undefined,
        songOfRest: getSongOfRestData(tempCharacter.level, classData) || undefined,
        flashOfGeniusSlot: (tempCharacter.class.toLowerCase() === "artificer" && tempCharacter.level >= 7)
          ? (() => {
              const usesPerRest = Math.max(1, Math.floor((tempCharacter.intelligence - 10) / 2))
              return { 
                usesPerRest, 
                currentUses: usesPerRest,
                replenishesOnLongRest: true
              }
            })()
          : undefined,
        // Add Paladin-specific features
        divineSenseSlot: getDivineSenseData(tempCharacter),
        layOnHands: getLayOnHandsData(tempCharacter),
        channelDivinitySlot: getChannelDivinityData(tempCharacter),
        cleansingTouchSlot: getCleansingTouchData(tempCharacter),
        // Add Warlock-specific features
        ...(tempCharacter.class.toLowerCase() === "warlock" && tempCharacter.subclass?.toLowerCase() === "the genie" ? {
          genieWrath: (() => {
            const { createGenieWrath } = require('../lib/character-data')
            return createGenieWrath('efreeti') // Default to Efreeti, can be changed later
          })(),
          elementalGift: (() => {
            const { createElementalGift } = require('../lib/character-data')
            return createElementalGift('efreeti', tempCharacter.level) // Default to Efreeti
          })(),
          sanctuaryVessel: tempCharacter.level >= 10 ? {
            vesselType: 'Ring',
            hoursRemaining: 0,
            maxHours: 2 * calculateProficiencyBonus(tempCharacter.level)
          } : undefined,
          limitedWish: tempCharacter.level >= 14 ? {
            usesPerLongRest: 1,
            currentUses: 1,
            longRestCooldown: 0
          } : undefined,
        } : {}),
        // Add Raven Queen Warlock-specific features
        ...(tempCharacter.class.toLowerCase() === "warlock" && tempCharacter.subclass?.toLowerCase() === "the raven queen" ? {
          sentinelRaven: (() => {
            const { createSentinelRaven } = require('../lib/character-data')
            return createSentinelRaven()
          })(),
          soulOfTheRaven: (() => {
            const { createSoulOfTheRaven } = require('../lib/character-data')
            return createSoulOfTheRaven(tempCharacter.level)
          })(),
          ravensShield: (() => {
            const { createRavensShield } = require('../lib/character-data')
            return createRavensShield(tempCharacter.level)
          })(),
          queensRightHand: (() => {
            const { createQueensRightHand } = require('../lib/character-data')
            return createQueensRightHand(tempCharacter.level)
          })(),
        } : {}),
      },
    }
    
    // Add character to local state first
    setCharacters((prev) => [...prev, newCharacter])
    setActiveCharacterId(newId)
    
    // Save character to database
    try {
      const { success, error, characterId } = await saveCharacter(newCharacter)
      if (success) {
        // If a new UUID was generated, update the character's ID in local state
        if (characterId && characterId !== newId) {
          setCharacters(prev => prev.map(char => char.id === newId ? { ...char, id: characterId } : char))
          setActiveCharacterId(characterId)
        }
        toast({
          title: "Success",
          description: `${characterData.name} created successfully!`,
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to save character: ${error}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving new character:", error)
      toast({
        title: "Error",
        description: "Failed to save character to database",
        variant: "destructive",
      })
    }
    
    // Spell slots are now calculated during initial load
  }

  const strengthMod = activeCharacter ? calculateModifier(activeCharacter.strength) : 0
  const dexterityMod = activeCharacter ? calculateModifier(activeCharacter.dexterity) : 0
  const constitutionMod = activeCharacter ? calculateModifier(activeCharacter.constitution) : 0
  const intelligenceMod = activeCharacter ? calculateModifier(activeCharacter.intelligence) : 0
  const wisdomMod = activeCharacter ? calculateModifier(activeCharacter.wisdom) : 0
  const charismaMod = activeCharacter ? calculateModifier(activeCharacter.charisma) : 0

  const proficiencyBonus = activeCharacter ? calculateProficiencyBonus(activeCharacter.level) : 0

  const passivePerception = activeCharacter ? calculatePassivePerception(activeCharacter, proficiencyBonus) : 0
  const passiveInsight = activeCharacter ? calculatePassiveInsight(activeCharacter, proficiencyBonus) : 0

  const perceptionSkill = activeCharacter?.skills.find((skill) => skill.name === "Perception")
  const insightSkill = activeCharacter?.skills.find((skill) => skill.name === "Insight")

  const abilityOrder = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
  const sortedSkills = activeCharacter ? [...activeCharacter.skills].sort((a, b) => {
    if (skillSortMode === 'alpha') {
      return a.name.localeCompare(b.name)
    }
    const abilityCompare = abilityOrder.indexOf(a.ability as typeof abilityOrder[number]) - abilityOrder.indexOf(b.ability as typeof abilityOrder[number])
    if (abilityCompare !== 0) return abilityCompare
    return a.name.localeCompare(b.name)
  }) : []

  const toggleSpellSlot = (level: number, slotIndex: number) => {
    if (!activeCharacter) return

    const updatedSpellData = {
      ...activeCharacter.spellData,
      spellSlots: activeCharacter.spellData.spellSlots.map((slot) => {
        if (slot.level === level) {
          // Corrected logic:
          // - If clicking an available slot (checked), mark it as used
          // - If clicking a used slot (unchecked), mark it as available
          const isAvailable = slotIndex < (slot.total - slot.used)
          const newUsed = isAvailable ? slot.used + 1 : slot.used - 1
          return { ...slot, used: Math.max(0, Math.min(slot.total, newUsed)) }
        }
        return slot
      }),
    }
    // User action -> autosave
    updateCharacter({ spellData: updatedSpellData }, { autosave: true })
    triggerAutoSave()
  }

  const toggleFeatSpellSlot = (featIndex: number, slotIndex: number) => {
    if (!activeCharacter) return

    const updatedSpellData = {
      ...activeCharacter.spellData,
      featSpellSlots: activeCharacter.spellData.featSpellSlots.map((feat, index) => {
        if (index === featIndex) {
          // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
          const isAvailable = slotIndex < feat.currentUses
          const newCurrentUses = isAvailable ? feat.currentUses - 1 : feat.currentUses + 1
          return { ...feat, currentUses: Math.max(0, Math.min(feat.usesPerLongRest, newCurrentUses)) }
        }
        return feat
      }),
    }
    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const getFeatureUsesPerLongRest = (feature: any): number => {
    if (typeof feature.usesPerLongRest === 'number') {
      return Math.max(0, feature.usesPerLongRest)
    }
    if (typeof feature.usesPerLongRest === 'string') {
      if (feature.usesPerLongRest.toLowerCase() === 'prof') {
        return Math.max(0, activeCharacter.proficiencyBonus ?? calculateProficiencyBonus(activeCharacter.level))
      }
      const abilityMap: { [key: string]: number } = {
        'str': activeCharacter.strength,
        'dex': activeCharacter.dexterity,
        'con': activeCharacter.constitution,
        'int': activeCharacter.intelligence,
        'wis': activeCharacter.wisdom,
        'cha': activeCharacter.charisma
      }
      const abilityScore = abilityMap[feature.usesPerLongRest.toLowerCase()]
      if (abilityScore !== undefined) {
        const modifier = Math.floor((abilityScore - 10) / 2)
        return Math.max(0, modifier) // Ensure 0 or negative modifiers return 0
      }
    }
    return 0
  }

  // Helper function to get calculated uses for modal display
  const getCalculatedUsesForModal = (usesPerLongRest: number | string | undefined): number => {
    if (typeof usesPerLongRest === 'number') {
      return Math.max(0, usesPerLongRest)
    }
    if (typeof usesPerLongRest === 'string') {
      if (usesPerLongRest.toLowerCase() === 'prof') {
        return Math.max(0, activeCharacter.proficiencyBonus ?? calculateProficiencyBonus(activeCharacter.level))
      }
      const abilityMap: { [key: string]: number } = {
        'str': activeCharacter.strength,
        'dex': activeCharacter.dexterity,
        'con': activeCharacter.constitution,
        'int': activeCharacter.intelligence,
        'wis': activeCharacter.wisdom,
        'cha': activeCharacter.charisma
      }
      const abilityScore = abilityMap[usesPerLongRest.toLowerCase()]
      if (abilityScore !== undefined) {
        const modifier = Math.floor((abilityScore - 10) / 2)
        return Math.max(0, modifier) // Ensure 0 or negative modifiers return 0
      }
    }
    return 0
  }

  const toggleFeatureUse = (featureIndex: number, slotIndex: number) => {
    if (!activeCharacter) return
    const updated = activeCharacter.features.map((f, idx) => {
      if (idx !== featureIndex) return f
      const actualUsesPerLongRest = getFeatureUsesPerLongRest(f)
      const currentUses = Math.min(actualUsesPerLongRest, Math.max(0, f.currentUses ?? actualUsesPerLongRest))
      // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
      const isAvailable = slotIndex < currentUses
      const newCurrentUses = isAvailable ? currentUses - 1 : currentUses + 1
      return { ...f, currentUses: Math.max(0, Math.min(actualUsesPerLongRest, newCurrentUses)) }
    })
    updateCharacter({ features: updated })
    triggerAutoSave()
  }

  const toggleMagicItemUse = (itemIndex: number, slotIndex: number) => {
    if (!activeCharacter) return
    const updated = activeCharacter.magicItems.map((item, idx) => {
      if (idx !== itemIndex) return item
      const maxUses = Math.max(0, item.maxUses ?? 0)
      const currentUses = Math.min(maxUses, Math.max(0, item.currentUses ?? maxUses))
      // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
      const isAvailable = slotIndex < currentUses
      const newCurrentUses = isAvailable ? currentUses - 1 : currentUses + 1
      return { ...item, currentUses: Math.max(0, Math.min(maxUses, newCurrentUses)) }
    })
    updateCharacter({ magicItems: updated })
    triggerAutoSave()
  }

  const toggleBardicInspiration = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.bardicInspirationSlot) return

    const bardicSlot = activeCharacter.spellData.bardicInspirationSlot
    // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
    const isAvailable = index < bardicSlot.currentUses
    const newCurrentUses = isAvailable ? bardicSlot.currentUses - 1 : bardicSlot.currentUses + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      bardicInspirationSlot: {
        ...bardicSlot,
        currentUses: Math.max(0, Math.min(bardicSlot.usesPerRest, newCurrentUses)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleHitDie = (classIndex: number, dieIndex: number) => {
    if (!activeCharacter.hitDiceByClass || !activeCharacter.hitDiceByClass[classIndex]) return

    const hitDieClass = activeCharacter.hitDiceByClass[classIndex]
    const currentAvailable = hitDieClass.total - hitDieClass.used

    const updatedHitDiceByClass = [...activeCharacter.hitDiceByClass]
    if (dieIndex < currentAvailable) {
      // Mark as used
      updatedHitDiceByClass[classIndex] = {
        ...hitDieClass,
        used: hitDieClass.used + 1
      }
    } else {
      // Mark as available
      updatedHitDiceByClass[classIndex] = {
        ...hitDieClass,
        used: Math.max(0, hitDieClass.used - 1)
      }
    }

    updateCharacter({ hitDiceByClass: updatedHitDiceByClass })
    triggerAutoSave()
  }

  const toggleFlashOfGenius = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.flashOfGeniusSlot) return

    const fog = activeCharacter.spellData.flashOfGeniusSlot
    // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
    const isAvailable = index < fog.currentUses
    const newCurrentUses = isAvailable ? fog.currentUses - 1 : fog.currentUses + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      flashOfGeniusSlot: {
        ...fog,
        currentUses: Math.max(0, Math.min(fog.usesPerRest, newCurrentUses)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleDivineSense = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.divineSenseSlot) return

    const divineSense = activeCharacter.spellData.divineSenseSlot
    // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
    const isAvailable = index < divineSense.currentUses
    const newCurrentUses = isAvailable ? divineSense.currentUses - 1 : divineSense.currentUses + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      divineSenseSlot: {
        ...divineSense,
        currentUses: Math.max(0, Math.min(divineSense.usesPerRest, newCurrentUses)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleChannelDivinity = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.channelDivinitySlot) return

    const channelDivinity = activeCharacter.spellData.channelDivinitySlot
    // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
    const isAvailable = index < channelDivinity.currentUses
    const newCurrentUses = isAvailable ? channelDivinity.currentUses - 1 : channelDivinity.currentUses + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      channelDivinitySlot: {
        ...channelDivinity,
        currentUses: Math.max(0, Math.min(channelDivinity.usesPerRest, newCurrentUses)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleCleansingTouch = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.cleansingTouchSlot) return

    const cleansingTouch = activeCharacter.spellData.cleansingTouchSlot
    // Corrected logic: if clicking an available slot, use it; if clicking a used slot, restore it
    const isAvailable = index < cleansingTouch.currentUses
    const newCurrentUses = isAvailable ? cleansingTouch.currentUses - 1 : cleansingTouch.currentUses + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      cleansingTouchSlot: {
        ...cleansingTouch,
        currentUses: Math.max(0, Math.min(cleansingTouch.usesPerRest, newCurrentUses)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleSongOfRest = () => {
    if (!activeCharacter || !activeCharacter.spellData.songOfRest) return

    const updatedSpellData = {
      ...activeCharacter.spellData,
      songOfRest: {
        ...activeCharacter.spellData.songOfRest,
        available: !activeCharacter.spellData.songOfRest.available,
      },
    }
    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const setActiveCharacterIdWithStorage = (characterId: string) => {
    setActiveCharacterId(characterId)
    saveActiveCharacterToLocalStorage(characterId)
  }

  const handleEldritchCannonSave = (cannon: EldritchCannon | null) => {
    updateCharacter({ eldritchCannon: cannon || undefined })
    triggerAutoSave()
  }


  if (isInitialLoading || !activeCharacter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading character data...</p>
          <p className="text-sm text-gray-600">
            {isInitialLoading ? "Connecting to database..." : "No characters available"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <CharacterSidebar
        characters={characters}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onCampaignChange={setSelectedCampaignId}
        activeCharacterId={activeCharacterId}
        onSelectCharacter={setActiveCharacterIdWithStorage}
        onCreateCharacter={createNewCharacter}
        onStartLongRest={handleStartLongRest}
        onOpenDiceRoll={handleOpenDiceRoll}
        onOpenCampaignManagement={handleOpenCampaignManagement}
      />

      <main className="flex-1 p-6 overflow-auto">
        {/* Character Header */}
        <Card className="mb-6">
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {activeCharacter.imageUrl && (
                  <img
                    src={activeCharacter.imageUrl}
                    alt="Portrait"
                    className="w-20 h-24 rounded-lg object-cover border cursor-pointer"
                    onClick={() => setPortraitModalOpen(true)}
                  />
                )}
                <div className="flex flex-col items-between gap-2">
                  <CardTitle className="text-2xl font-bold font-mono">{activeCharacter.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Level {activeCharacter.level}</Badge>
                    <Badge variant="default">Proficiency {formatModifier(proficiencyBonus)}</Badge>
                    <Badge variant="outline">
                      {activeCharacter.classes && activeCharacter.classes.length > 1 ? (
                        activeCharacter.classes.map(charClass => 
                          `${charClass.name}${charClass.subclass ? `・${charClass.subclass}` : ''} ${charClass.level}` 
                        ).join(' / ')
                      ) : (
                        `${activeCharacter.class}・${activeCharacter.subclass}`
                      )}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground px-1">
                    {activeCharacter.race}・{activeCharacter.background}・{activeCharacter.alignment}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCharacterDetailsContentModalOpen(true)}>
                  <BookOpen className="w-4 h-4" />
                  Character Biography
                </Button>
{/*                 <div
                  className={`w-2 h-2 rounded-full ${dbConnected === true ? "bg-green-500" : dbConnected === false ? "bg-red-500" : "bg-yellow-500"}`}
                  title={
                    dbConnected === true
                      ? "Database Connected"
                      : dbConnected === false
                        ? "Database Offline"
                        : "Connecting..."
                  }
                /> */}
                <Button variant="outline" size="sm" onClick={() => setBasicInfoModalOpen(true)}>
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
{/*                 <Button variant="outline" size="sm" onClick={loadCharactersFromDatabase} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isLoading ? "Loading..." : "Refresh"}
                </Button> */}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* COLUMN 1: Abilities, Skills, Features, Equipment, Languages */}
          <div className="space-y-6">
            {/* Ability Scores */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle>Ability Scores</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setAbilitiesModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "STR", fullName: "Strength", score: activeCharacter.strength, modifier: strengthMod },
                    { name: "DEX", fullName: "Dexterity", score: activeCharacter.dexterity, modifier: dexterityMod },
                    {
                      name: "CON",
                      fullName: "Constitution",
                      score: activeCharacter.constitution,
                      modifier: constitutionMod,
                    },
                    {
                      name: "INT",
                      fullName: "Intelligence",
                      score: activeCharacter.intelligence,
                      modifier: intelligenceMod,
                    },
                    { name: "WIS", fullName: "Wisdom", score: activeCharacter.wisdom, modifier: wisdomMod },
                    { name: "CHA", fullName: "Charisma", score: activeCharacter.charisma, modifier: charismaMod },
                  ].map((ability) => (
                    <div key={ability.name} className="text-center flex flex-col items-center gap-1">
                      <div className="text-sm text-muted-foreground">{ability.fullName}</div>
                      <div className="text-2xl font-bold mb-2 font-mono">{ability.score}</div>
                      <Badge variant="default">{formatModifier(ability.modifier)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Saving Throws */}
            <Card className="flex flex-col gap-3">
              <CardHeader>
                <CardTitle>Saving Throws</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 flex flex-col gap-2">
                  {(() => {
                    console.log('[DEBUG] UI: Rendering saving throws:', activeCharacter.savingThrowProficiencies)
                    console.log('[DEBUG] UI: Saving throws length:', activeCharacter.savingThrowProficiencies?.length)
                    console.log('[DEBUG] UI: Active character classes:', activeCharacter.classes)
                    if (!activeCharacter.savingThrowProficiencies || activeCharacter.savingThrowProficiencies.length === 0) {
                      console.log('[DEBUG] UI: No saving throws found, returning empty div')
                      return <div>No saving throws loaded</div>
                    }
                    return activeCharacter.savingThrowProficiencies.map((savingThrow) => {
                    const savingThrowBonus = calculateSavingThrowBonus(activeCharacter, savingThrow.ability, proficiencyBonus)
                    const abilityName = savingThrow.ability.charAt(0).toUpperCase() + savingThrow.ability.slice(1)

                    return (
                      <div key={savingThrow.ability} className="flex items-center justify-between mb-0">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              id={`${savingThrow.ability}-save`}
                              checked={savingThrow.proficient}
                              onChange={(e) => {
                                const updatedSavingThrows = activeCharacter.savingThrowProficiencies.map(st =>
                                  st.ability === savingThrow.ability
                                    ? { ...st, proficient: e.target.checked }
                                    : st
                                )
                                updateCharacter({ savingThrowProficiencies: updatedSavingThrows })
                                triggerAutoSave()
                              }}
                              className="w-3 h-3 rounded border-gray-300"
                            />
                            <Label htmlFor={`${savingThrow.ability}-save`} className="sr-only">
                              Proficient
                            </Label>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{abilityName}</span>
                            <span className="text-muted-foreground ml-1">
                              ({savingThrow.ability.slice(0, 3).toUpperCase()})
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary">{formatModifier(savingThrowBonus)}</Badge>
                      </div>
                    )
                  })
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="flex flex-col gap-4 relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Skills</CardTitle>
                  <div className="inline-flex gap-1 rounded-md bg-muted p-1 absolute right-4 top-4">
                    <Button size="sm" className="text-xs px-2 py-1 h-6" variant={skillSortMode === 'alpha' ? 'outline' : 'ghost'} onClick={() => setSkillSortMode('alpha')}>A–Z</Button>
                    <Button size="sm" className="text-xs px-2 py-1 h-6" variant={skillSortMode === 'ability' ? 'outline' : 'ghost'} onClick={() => setSkillSortMode('ability')}>Ability</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {skillSortMode === 'ability' ? (
                    <>
                      {abilityOrder.map((abilityKey) => {
                        const group = sortedSkills.filter(s => s.ability === abilityKey)
                        if (group.length === 0) return null
                        const headerName = abilityKey.charAt(0).toUpperCase() + abilityKey.slice(1)
                        const abbr = abilityKey.slice(0, 3).toUpperCase()
                        return (
                          <div key={abilityKey} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                            <div className="text-xs font-semibold text-muted-foreground">{headerName} ({abbr})</div>
                            {group.map((skill) => {
                              const skillBonus = calculateSkillBonus(activeCharacter, skill)
                              const isProficient = skill.proficiency === 'proficient' || skill.proficiency === 'expertise'
                              const hasExpertise = skill.proficiency === 'expertise'
                              return (
                                <div key={skill.name} className="flex items-center justify-between mb-0">
                                  <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`${skill.name}-prof`}
                                          checked={isProficient}
                                          onChange={(e) => updateSkillProficiency(skill.name, 'proficient', e.target.checked)}
                                          className="w-3 h-3 rounded border-gray-300"
                                        />
                                        <Label htmlFor={`${skill.name}-prof`} className="sr-only">
                                          Proficient
                                        </Label>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="checkbox"
                                          id={`${skill.name}-exp`}
                                          checked={hasExpertise}
                                          onChange={(e) => updateSkillProficiency(skill.name, 'expertise', e.target.checked)}
                                          className="w-3 h-3 rounded border-gray-300"
                                        />
                                        <Label htmlFor={`${skill.name}-exp`} className="sr-only">
                                          Expertise
                                        </Label>
                                      </div>
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-medium">{skill.name}</span>
                                      <span className="text-muted-foreground ml-1">
                                        ({skill.ability.slice(0, 3).toUpperCase()})
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant="secondary">{formatModifier(skillBonus)}</Badge>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <div className="flex flex-col gap-1 mt-2">
                    {sortedSkills.map((skill) => {
                      const skillBonus = calculateSkillBonus(activeCharacter, skill)
                      const isProficient = skill.proficiency === 'proficient' || skill.proficiency === 'expertise'
                      const hasExpertise = skill.proficiency === 'expertise'
                      return (
                        <div key={skill.name} className="flex items-center justify-between mb-0">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  id={`${skill.name}-prof`}
                                  checked={isProficient}
                                  onChange={(e) => updateSkillProficiency(skill.name, 'proficient', e.target.checked)}
                                  className="w-3 h-3 rounded border-gray-300"
                                />
                                <Label htmlFor={`${skill.name}-prof`} className="sr-only">
                                  Proficient
                                </Label>
                              </div>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="checkbox"
                                  id={`${skill.name}-exp`}
                                  checked={hasExpertise}
                                  onChange={(e) => updateSkillProficiency(skill.name, 'expertise', e.target.checked)}
                                  className="w-3 h-3 rounded border-gray-300"
                                />
                                <Label htmlFor={`${skill.name}-exp`} className="sr-only">
                                  Expertise
                                </Label>
                              </div>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{skill.name}</span>
                              <span className="text-muted-foreground ml-1">
                                ({skill.ability.slice(0, 3).toUpperCase()})
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary">{formatModifier(skillBonus)}</Badge>
                        </div>
                      )
                    })}
                    </div>
                  )}
                </div>

                {/* Passive Skills Section */}
                <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                  <div className="text-sm font-medium">Passive Skills</div>
                  <div className="space-y- flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-0">
                      <span className="text-sm">Passive Perception</span>
                      <Badge variant="secondary">{passivePerception}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-0">
                      <span className="text-sm">Passive Insight</span>
                      <Badge variant="secondary">{passiveInsight}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features & Traits */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserStar className="w-5 h-5" /> 
                    Features & Traits
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setFeaturesModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {activeCharacter.features.map((feature, index) => (
                    <div key={index} className="p-2 border rounded flex flex-col gap-0.5">
                      <div className="font-medium flex items-start justify-between">
                        <span className="text-sm">{feature.name}</span>
                        {getFeatureUsesPerLongRest(feature) > 0 && (
                          <div className="flex items-center gap-1 py-1">
                              {Array.from({ length: getFeatureUsesPerLongRest(feature) }, (_, i) => {
                                const usesPer = getFeatureUsesPerLongRest(feature)
                                const current = Math.min(usesPer, Math.max(0, feature.currentUses ?? usesPer))
                                const usedCount = usesPer - current
                                const isAvailable = i < current
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleFeatureUse(index, i)}
                                  className={`w-4 h-4 rounded border-2 transition-colors ${
                                    isAvailable
                                      ? "bg-blue-500 border-blue-500 cursor-pointer"
                                      : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                  }`}
                                  title={isAvailable ? "Available" : "Used"}
                                />
                              )
                            })}
                            <span className="text-xs text-muted-foreground ml-1 w-5 text-right">
                              {Math.min(getFeatureUsesPerLongRest(feature), Math.max(0, feature.currentUses ?? getFeatureUsesPerLongRest(feature)))}/{getFeatureUsesPerLongRest(feature)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground relative">
                        <div className="line-clamp-2 max-h-20 overflow-hidden">
                          <RichTextDisplay content={feature.description} className="text-xs text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-2 h-7 shadow-sm text-foreground"
                            onClick={() => {
                              setFeatureModalContent({ 
                                title: feature.name, 
                                description: feature.description,
                                usesPerLongRest: feature.usesPerLongRest,
                                refuelingDie: feature.refuelingDie
                              })
                              setFeatureModalIsClassFeature(false)
                              setFeatureModalOpen(true)
                            }}
                          >
                            Read more
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeCharacter.features.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No features or traits</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Feats */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Feats
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setFeatsModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {activeCharacter.feats.map((feat, index) => (
                    <div key={index} className="p-2 border rounded-lg flex items-center justify-between">
                      <div className="font-medium text-sm">{feat.name}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-2 h-7 shadow-sm text-foreground"
                        onClick={() => {
                          setFeatureModalContent({ title: feat.name, description: feat.description })
                          setFeatureModalIsClassFeature(false)
                          setFeatureModalOpen(true)
                        }}
                      >
                        Read more
                      </Button>
                    </div>
                  ))}
                  {activeCharacter.feats.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No feats</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tools Proficiencies */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Item Proficiencies
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setToolsModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {/* Other Proficiencies: Equipment (Armor/Weapons) */}

                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium mb-2">Tools Proficiencies</div>
                  <div className="flex flex-col gap-1.5">
                  {activeCharacter.toolsProficiencies.map((tool, index) => {
                    const toolBonus = calculateToolBonus(activeCharacter, tool)
                    const isProficient = tool.proficiency === "proficient" || tool.proficiency === "expertise"
                    const hasExpertise = tool.proficiency === "expertise"

                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                id={`${tool.name}-prof`}
                                checked={isProficient}
                                onChange={(e) => updateToolProficiency(tool.name, "proficient", e.target.checked)}
                                className="w-3 h-3 rounded border-gray-300"
                              />
                              <Label htmlFor={`${tool.name}-prof`} className="sr-only">
                                Proficient
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                id={`${tool.name}-exp`}
                                checked={hasExpertise}
                                onChange={(e) => updateToolProficiency(tool.name, "expertise", e.target.checked)}
                                className="w-3 h-3 rounded border-gray-300"
                              />
                              <Label htmlFor={`${tool.name}-exp`} className="sr-only">
                                Expertise
                              </Label>
                            </div>
                          </div>
                          <div className="text-sm">
                            <span>{tool.name}</span>
                          </div>
                        </div>
                        {toolBonus !== 0 && (
                          <Badge variant="secondary" className="text-xs font-mono">+{toolBonus}</Badge>
                        )}
                      </div>
                    )
                  })}
                  </div>
                  {activeCharacter.toolsProficiencies.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No tool proficiencies</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Other Inventory</h4>
                  </div>
                  <RichTextDisplay
                    content={activeCharacter.otherTools || "No other tools or items listed"}
                    className={
                      !activeCharacter.otherTools ? "text-muted-foreground text-center py-2 text-sm" : "text-sm"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Languages
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setLanguagesModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <RichTextDisplay
                  content={activeCharacter.languages || "No languages listed"}
                  className={!activeCharacter.languages ? "text-muted-foreground text-center py-4" : ""}
                />
              </CardContent>
            </Card>

          </div>

          {/* COLUMN 2: Combat, Weapons, Spells, Tools Proficiencies */}
          <div className="space-y-6 flex flex-col gap-1">
            {/* Combat Stats */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle>Combat</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setCombatModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 grid grid-cols-2 gap-4 items-start">
                <div className="flex items-center gap-3 col-span-1 mb-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground">Armor Class</div>
                    <div className="text-xl font-bold font-mono">{activeCharacter.armorClass}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 col-span-1 mb-0">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground">Initiative</div>
                    <div className="text-xl font-bold font-mono">{formatModifier(activeCharacter.initiative)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 col-span-1 mb-0">
                  <Footprints className="w-5 h-5 text-green-600" />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      Speed
                      {(() => {
                        const exhaustion = activeCharacter.exhaustion || 0
                        if (exhaustion >= 2) {
                          return <Badge variant="outline" className="text-red-800 text-xs px-1 py-1"><Skull className="w-4 h-4" /></Badge>
                        }
                        return null
                      })()}
                    </div>
                    <div className={`text-xl font-bold font-mono ${(() => {
                      const exhaustion = activeCharacter.exhaustion || 0
                      return exhaustion >= 2 ? "text-red-800" : ""
                    })()}`}>
                      {(() => {
                        const exhaustion = activeCharacter.exhaustion || 0
                        if (exhaustion >= 5) return "0 ft"
                        if (exhaustion >= 2) return `${Math.floor(activeCharacter.speed / 2)} ft`
                        return `${activeCharacter.speed} ft`
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-1 mb-0">
                  <Heart className="w-5 h-5 text-red-600" />
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      Hit Points
                      {(() => {
                        const exhaustion = activeCharacter.exhaustion || 0
                        if (exhaustion >= 4) {
                          return <Badge variant="outline" className="text-red-800 text-xs px-1 py-1"><Skull className="w-4 h-4" /></Badge>
                        }
                        return null
                      })()}
                    </div>
                    <div className={`text-xl font-bold font-mono flex items-center gap-2 ${(() => {
                      const exhaustion = activeCharacter.exhaustion || 0
                      return exhaustion >= 4 ? "text-red-800" : ""
                    })()}`}>
                      {(() => {
                        const exhaustion = activeCharacter.exhaustion || 0
                        const effectiveMaxHP = exhaustion >= 4 ? Math.floor(activeCharacter.maxHitPoints / 2) : activeCharacter.maxHitPoints
                        const tempHP = (activeCharacter.temporaryHitPoints ?? 0) > 0 ? activeCharacter.temporaryHitPoints as number : 0
                        return (
                          <>
                            {activeCharacter.currentHitPoints}/
                            {effectiveMaxHP + tempHP}
                            {tempHP > 0 && (
                              <span className="text-green-600 text-xs font-medium">(+{tempHP})</span>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                {/* Exhaustion - only show if > 0 */}
                {(activeCharacter.exhaustion ?? 0) > 0 && (
                  <div className="flex items-center gap-3 col-span-2 mb-0">
                    <Skull className="w-5 h-5 text-red-800" />
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Exhaustion</div>
                      <div className="text-xl font-bold font-mono text-red-800">
                        Level {activeCharacter.exhaustion}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const exhaustion = activeCharacter.exhaustion || 0
                          const effects = []
                          if (exhaustion >= 1) effects.push("Disadvantage on ability checks")
                          if (exhaustion >= 2) effects.push("Speed halved")
                          if (exhaustion >= 3) effects.push("Disadvantage on attack rolls & saves")
                          if (exhaustion >= 4) effects.push("Hit point maximum halved")
                          if (exhaustion >= 5) effects.push("Speed reduced to 0")
                          if (exhaustion >= 6) effects.push("Death")
                          return effects.join(", ")
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hit Dice */}
                {activeCharacter.hitDiceByClass && activeCharacter.hitDiceByClass.length > 0 ? (
                  <div className="flex items-start gap-3 col-span-2 mb-0">
                    <Dice5 className="w-5 h-10 py-2.5 text-purple-600" />
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Hit Dice</div>
                      <div className="flex flex-row gap-5">
                        {activeCharacter.hitDiceByClass.map((hitDie, classIndex) => (
                          <div key={classIndex} className="flex flex-col gap-1">
                            <span className="text-md font-bold font-mono">
                              {hitDie.total - hitDie.used}/{hitDie.total}{hitDie.dieType}
                            </span>
                            <div className="flex gap-1">
                              {Array.from({ length: hitDie.total }, (_, dieIndex) => {
                                const isAvailable = dieIndex < (hitDie.total - hitDie.used)
                                return (
                                  <button
                                    key={dieIndex}
                                    onClick={() => toggleHitDie(classIndex, dieIndex)}
                                    className={`w-3 h-3 rounded border transition-colors ${
                                      isAvailable
                                        ? "bg-purple-500 border-purple-500 cursor-pointer hover:bg-purple-600"
                                        : "bg-white border-gray-300 cursor-pointer hover:border-gray-400"
                                    }`}
                                    title={isAvailable ? "Available" : "Used"}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeCharacter.hitDice && (
                  <div className="flex items-center gap-3 col-span-1 mb-0">
                    <Dice5 className="w-5 h-5 text-purple-600" />
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Hit Dice</div>
                      <div className="text-xl font-bold font-mono">
                        {activeCharacter.hitDice.total - activeCharacter.hitDice.used}/{activeCharacter.hitDice.total}{activeCharacter.hitDice.dieType}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weapons */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sword className="w-5 h-5" />
                    Weapons
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setWeaponsModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 flex flex-col gap-0.5">
                  {activeCharacter.weapons.map((weapon, index) => (
                    <div key={index} className="p-3 border rounded-lg flex flex-col gap-2">
                      <div className="font-medium">{weapon.name}</div>
                      <div className="text-sm text-muted-foreground flex flex-row gap-1 flex-wrap">
                        <Badge variant="secondary">{weapon.attackBonus} ATK</Badge> <Badge variant="outline">{weapon.damageType}</Badge>
                      </div>
                    </div>
                  ))}
                  {activeCharacter.weapons.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No weapons equipped</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Weapon Notes</h4>
                  </div>
                  <RichTextDisplay
                    content={activeCharacter.weaponNotes || "No weapon notes"}
                    className={
                      !activeCharacter.weaponNotes ? "text-muted-foreground text-center py-2 text-sm" : "text-sm"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Spells & Magic */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Spells & Magic
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSpellModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex flex-col gap-2">
                {/* Basic Spell Stats */}
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3 items-start">
                    <div className="text-center p-2 border rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1">
                      <div className="text-sm text-muted-foreground">Spell Attack</div>
                      <div className="text-xl font-bold font-mono">
                        {formatModifier(activeCharacter.spellData.spellAttackBonus)}
                      </div>
                    </div>
                    <div className="text-center p-2 border rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1">
                      <div className="text-sm text-muted-foreground">Spell Save DC</div>
                      <div className="text-xl font-bold font-mono">{activeCharacter.spellData.spellSaveDC}</div>
                    </div>
                    <div className="text-center p-2 border rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1">
                      <div className="text-sm text-muted-foreground">Cantrips</div>
                      <div className="text-xl font-bold font-mono">{activeCharacter.spellData.cantripsKnown}</div>
                    </div>
                    <div className="text-center p-2 border rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1">
                      <div className="text-sm text-muted-foreground">Spells</div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-xl font-bold font-mono">{activeCharacter.spellData.spellsKnown}</div>
                        {getTotalAdditionalSpells(activeCharacter) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{getTotalAdditionalSpells(activeCharacter)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" size="sm" onClick={() => setSpellListModalOpen(true)}>
                    <BookOpen className="w-4 h-4" />
                    Spell List
                  </Button>
                </div>

                {/* Bard Features */}
                {(activeCharacter.class.toLowerCase() === "bard" || activeCharacter.classes?.some(c => c.name.toLowerCase() === "bard")) && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="text-sm font-medium">Bard Features</div>
                    {/* Bardic Inspiration */}
                    {activeCharacter.spellData.bardicInspirationSlot && (
                      <div className="flex items-center justify-between p-2 border rounded gap-1">
                        <div className="flex gap-1 flex-col">
                          <span className="text-sm font-medium">Bardic Inspiration</span>
                          <span className="text-xs text-muted-foreground">
                            1{activeCharacter.spellData.bardicInspirationSlot.dieType} save bonus
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: activeCharacter.spellData.bardicInspirationSlot.usesPerRest }, (_, i) => {
                            const usedCount = activeCharacter.spellData.bardicInspirationSlot!.usesPerRest - activeCharacter.spellData.bardicInspirationSlot!.currentUses
                            const isAvailable = i < activeCharacter.spellData.bardicInspirationSlot!.currentUses
                            return (
                              <button
                                key={i}
                                onClick={() => toggleBardicInspiration(i)}
                                className={`w-4 h-4 rounded border-2 transition-colors ${
                                  isAvailable
                                    ? "bg-purple-500 border-purple-500 cursor-pointer"
                                    : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                }`}
                                title={isAvailable ? "Available" : "Used"}
                              />
                            )
                          })}
                          <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                            {activeCharacter.spellData.bardicInspirationSlot.currentUses}/
                            {activeCharacter.spellData.bardicInspirationSlot.usesPerRest}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Bard - Song of Rest */}
                    {activeCharacter.spellData.songOfRest && (
                      <div className="p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggleSongOfRest}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex flex-col gap-1">
                            <span className="font-medium">Song of Rest</span><span className="text-xs text-muted-foreground"> 1{activeCharacter.spellData.songOfRest.healingDie} healing</span>
                          </span>
                          <Badge variant={activeCharacter.spellData.songOfRest.available ? "default" : "secondary"}>
                            {activeCharacter.spellData.songOfRest.available ? "Available" : "Used"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Artificer Features */}
                {(activeCharacter.class.toLowerCase() === "artificer" || activeCharacter.classes?.some(c => c.name.toLowerCase() === "artificer")) && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="text-sm font-medium">Artificer Skills</div>
                    {/* Artificer - Flash of Genius */}
                    {((activeCharacter.class.toLowerCase() === "artificer" && activeCharacter.level >= 7) || (activeCharacter.classes?.some(c => c.name.toLowerCase() === "artificer") && activeCharacter.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) >= 7)) && activeCharacter.spellData.flashOfGeniusSlot && (
                        <div className="flex items-start justify-between p-2 border rounded gap-3">
                          <div className="flex gap-1 flex-col">
                            <span className="text-sm font-medium">
                              Flash of Genius
                            </span>
                            <span className="text-xs text-muted-foreground">
                              <Badge variant="secondary">{formatModifier(intelligenceMod)}</Badge> bonus to any check
                            </span>
                          </div>
                          <div className="flex items-center gap-1 py-1">
                            {Array.from({ length: activeCharacter.spellData.flashOfGeniusSlot.usesPerRest }, (_, i) => {
                              const usedCount = activeCharacter.spellData.flashOfGeniusSlot!.usesPerRest - activeCharacter.spellData.flashOfGeniusSlot!.currentUses
                              const isAvailable = i < activeCharacter.spellData.flashOfGeniusSlot!.currentUses
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleFlashOfGenius(i)}
                                  className={`w-4 h-4 rounded border-2 transition-colors ${
                                    isAvailable
                                      ? "bg-blue-500 border-blue-500 cursor-pointer"
                                      : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                  }`}
                                  title={isAvailable ? "Available" : "Used"}
                                />
                              )
                            })}
                            <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                              {activeCharacter.spellData.flashOfGeniusSlot.currentUses}/{activeCharacter.spellData.flashOfGeniusSlot.usesPerRest}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Paladin Features */}
                {(activeCharacter.class.toLowerCase() === "paladin" || activeCharacter.classes?.some(c => c.name.toLowerCase() === "paladin")) && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="text-sm font-medium">Paladin Skills</div>
                    {/* Paladin - Divine Sense */}
                    {activeCharacter.spellData.divineSenseSlot && (
                        <div className="flex items-start gap-1 justify-between p-2 border rounded">
                          <div className="flex gap-1 flex-col">
                            <span className="text-sm font-medium">Divine Sense</span>
                            <span className="text-xs text-muted-foreground">
                              Detect celestials, fiends, and undead within 60 feet
                            </span>
                          </div>
                          <div className="flex items-center gap-1 py-1">
                            {Array.from({ length: activeCharacter.spellData.divineSenseSlot.usesPerRest }, (_, i) => {
                              const isAvailable = i < activeCharacter.spellData.divineSenseSlot!.currentUses
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleDivineSense(i)}
                                  className={`w-4 h-4 rounded border-2 transition-colors ${
                                    isAvailable
                                      ? "bg-yellow-500 border-yellow-500 cursor-pointer"
                                      : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                  }`}
                                  title={isAvailable ? "Available" : "Used"}
                                />
                              )
                            })}
                            <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                              {activeCharacter.spellData.divineSenseSlot.currentUses}/{activeCharacter.spellData.divineSenseSlot.usesPerRest}
                            </span>
                          </div>
                        </div>
                    )}
                    {/* Paladin - Lay on Hands */}
                    {activeCharacter.spellData.layOnHands && (
                        <div className="flex items-center justify-between p-2 border rounded">
                          <div className="flex gap-1 flex-col">
                            <span className="text-sm font-medium">
                              Lay on Hands
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              Healing pool
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={activeCharacter.spellData.layOnHands.totalHitPoints}
                              value={activeCharacter.spellData.layOnHands.currentHitPoints}
                              onChange={(e) => {
                                const newValue = Math.max(0, Math.min(activeCharacter.spellData.layOnHands!.totalHitPoints, parseInt(e.target.value) || 0))
                                setCharacters(prev => prev.map(char => 
                                  char.id === activeCharacter.id 
                                    ? {
                                        ...char,
                                        spellData: {
                                          ...char.spellData,
                                          layOnHands: {
                                            ...char.spellData.layOnHands!,
                                            currentHitPoints: newValue
                                          }
                                        }
                                      }
                                    : char
                                ))
                              triggerAutoSave()
                              }}
                              className="w-16 px-2 py-1 text-sm border rounded text-center"
                              title="Remaining Lay on Hands hit points"
                            />
                            <span className="text-sm text-muted-foreground">
                              / {activeCharacter.spellData.layOnHands.totalHitPoints}
                            </span>
                          </div>
                        </div>
                    )}
                    {/* Paladin - Channel Divinity */}
                    {activeCharacter.spellData.channelDivinitySlot && (
                        <div className="flex items-start justify-between p-2 border rounded gap-1">
                          <div className="flex gap-1 flex-col">
                            <span className="text-sm font-medium">Channel Divinity</span>
                            <span className="text-xs text-muted-foreground">
                              Sacred Oath features
                            </span>
                          </div>
                          <div className="flex items-center gap-2 py-1">
                            {Array.from({ length: activeCharacter.spellData.channelDivinitySlot.usesPerRest }, (_, i) => {
                              const isAvailable = i < activeCharacter.spellData.channelDivinitySlot!.currentUses
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleChannelDivinity(i)}
                                  className={`w-4 h-4 rounded border-2 transition-colors ${
                                    isAvailable
                                      ? "bg-purple-500 border-purple-500 cursor-pointer"
                                      : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                  }`}
                                  title={isAvailable ? "Available" : "Used"}
                                />
                              )
                            })}
                            <span className="text-xs text-muted-foreground w-5 text-right">
                              {activeCharacter.spellData.channelDivinitySlot.currentUses}/{activeCharacter.spellData.channelDivinitySlot.usesPerRest}
                            </span>
                          </div>
                        </div>
                    )}
                    {/* Paladin - Cleansing Touch */}
                    {activeCharacter.spellData.cleansingTouchSlot && (
                      <div className="flex items-start justify-between p-2 border rounded gap-1">
                          <div className="flex gap-1 flex-col">
                            <span className="text-sm font-medium">Cleansing Touch</span>
                            <span className="text-xs text-muted-foreground">
                              End one spell on yourself or willing creature
                            </span>
                          </div>
                          <div className="flex items-center gap-1 py-1">
                            {Array.from({ length: activeCharacter.spellData.cleansingTouchSlot.usesPerRest }, (_, i) => {
                              const isAvailable = i < activeCharacter.spellData.cleansingTouchSlot!.currentUses
                              return (
                                <button
                                  key={i}
                                  onClick={() => toggleCleansingTouch(i)}
                                  className={`w-4 h-4 rounded border-2 transition-colors ${
                                    isAvailable
                                      ? "bg-green-500 border-green-500 cursor-pointer"
                                      : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                  }`}
                                  title={isAvailable ? "Available" : "Used"}
                                />
                              )
                            })}
                            <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                              {activeCharacter.spellData.cleansingTouchSlot.currentUses}/{activeCharacter.spellData.cleansingTouchSlot.usesPerRest}
                            </span>
                          </div>
                        </div>
                    )}
                  </div>
                )}

                {/* Warlock Features */}
                {(activeCharacter.class.toLowerCase() === "warlock" || activeCharacter.classes?.some(c => c.name.toLowerCase() === "warlock")) && (
                  (activeCharacter.spellData.genieWrath || 
                   (activeCharacter.spellData.elementalGift && activeCharacter.level >= 6) ||
                   (activeCharacter.spellData.sanctuaryVessel && activeCharacter.level >= 10) ||
                   (activeCharacter.spellData.limitedWish && activeCharacter.level >= 14)) && (
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="text-sm font-medium">Warlock Features</div>
                    {/* Warlock - Genie Wrath */}
                    {activeCharacter.spellData.genieWrath && (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex gap-1 flex-col">
                          <span className="text-sm font-medium">Genie Wrath</span>
                          <span className="text-xs text-muted-foreground">
                            Extra {activeCharacter.spellData.genieWrath.damageType} damage on hit
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {activeCharacter.spellData.genieWrath.currentUses}/{activeCharacter.spellData.genieWrath.usesPerTurn} per turn
                          </Badge>
                        </div>
                      </div>
                    )}
                    {/* Warlock - Elemental Gift */}
                    {activeCharacter.spellData.elementalGift && activeCharacter.level >= 6 && (
                      <div className="flex items-start justify-between p-2 border rounded gap-1">
                        <div className="flex gap-1 flex-col">
                          <span className="text-sm font-medium">Elemental Gift</span>
                          <span className="text-xs text-muted-foreground">
                            Flying speed {activeCharacter.spellData.elementalGift.flyingSpeed} ft for 10 minutes
                          </span>
                        </div>
                        <div className="flex items-center gap-1 py-1">
                          {Array.from({ length: activeCharacter.spellData.elementalGift.usesPerLongRest }, (_, i) => {
                            const isAvailable = i < activeCharacter.spellData.elementalGift!.currentUses
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const elementalGift = activeCharacter.spellData.elementalGift!
                                  const newCurrentUses = isAvailable ? elementalGift.currentUses - 1 : elementalGift.currentUses + 1
                                  const updatedSpellData = {
                                    ...activeCharacter.spellData,
                                    elementalGift: {
                                      ...elementalGift,
                                      currentUses: Math.max(0, Math.min(elementalGift.usesPerLongRest, newCurrentUses))
                                    }
                                  }
                                  updateCharacter({ spellData: updatedSpellData })
                                  triggerAutoSave()
                                }}
                                className={`w-4 h-4 rounded border-2 transition-colors ${
                                  isAvailable
                                    ? "bg-orange-500 border-orange-500 cursor-pointer"
                                    : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                }`}
                                title={isAvailable ? "Available" : "Used"}
                              />
                            )
                          })}
                          <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                            {activeCharacter.spellData.elementalGift.currentUses}/{activeCharacter.spellData.elementalGift.usesPerLongRest}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Warlock - Sanctuary Vessel */}
                    {activeCharacter.spellData.sanctuaryVessel && activeCharacter.level >= 10 && (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex gap-1 flex-col">
                          <span className="text-sm font-medium">Sanctuary Vessel</span>
                          <span className="text-xs text-muted-foreground">
                            {activeCharacter.spellData.sanctuaryVessel.vesselType} - extradimensional space
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {activeCharacter.spellData.sanctuaryVessel.hoursRemaining}/{activeCharacter.spellData.sanctuaryVessel.maxHours} hours
                          </Badge>
                        </div>
                      </div>
                    )}
                    {/* Warlock - Limited Wish */}
                    {activeCharacter.spellData.limitedWish && activeCharacter.level >= 14 && (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex gap-1 flex-col">
                          <span className="text-sm font-medium">Limited Wish</span>
                          <span className="text-xs text-muted-foreground">
                            Cast any 6th level or lower spell
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {activeCharacter.spellData.limitedWish.currentUses}/{activeCharacter.spellData.limitedWish.usesPerLongRest} uses
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                )}


                {activeCharacter.spellData.spellSlots.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">Spell Slots</div>
                    <div className="space-y-2 flex flex-col gap-0">
                      {activeCharacter.spellData.spellSlots
                        .sort((a, b) => a.level - b.level)
                        .map((slot) => (
                          <div key={slot.level} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">
                              {((activeCharacter.class.toLowerCase() === "warlock" || activeCharacter.classes?.some(c => c.name.toLowerCase() === "warlock")) && slot.level === 0) 
                                ? "Warlock Spells" 
                                : `Level ${slot.level}`}
                            </span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: slot.total }, (_, i) => {
                                const isAvailable = i < (slot.total - slot.used)
                                return (
                                  <button
                                    key={i}
                                    onClick={() => toggleSpellSlot(slot.level, i)}
                                    className={`w-4 h-4 rounded border-2 transition-colors ${
                                      isAvailable
                                        ? "bg-gray-400 border-gray-400 cursor-pointer"
                                        : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                    }`}
                                    title={isAvailable ? "Available" : "Used"}
                                  />
                                )
                              })}
                              <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                                {slot.total - slot.used}/{slot.total}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : activeCharacter.class ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">Spell Slots</div>
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Loading spell slots for {activeCharacter.class}...
                    </div>
                  </div>
                ) : null}

                {activeCharacter.spellData.featSpellSlots.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">Feat Spells</div>
                    <div className="flex flex-col gap-2">
                      {activeCharacter.spellData.featSpellSlots.map((featSpell, featSpellIndex) => (
                        <div key={featSpellIndex} className="p-2 border rounded flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{featSpell.spellName}</span>
                              <span className="text-xs text-muted-foreground">from {featSpell.featName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: featSpell.usesPerLongRest }, (_, i) => {
                                const isAvailable = i < featSpell.currentUses
                                return (
                                  <button
                                    key={i}
                                    onClick={() => toggleFeatSpellSlot(featSpellIndex, i)}
                                    className={`w-4 h-4 rounded border-2 transition-colors ${
                                      isAvailable
                                        ? "bg-green-500 border-green-500 cursor-pointer"
                                        : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                    }`}
                                    title={isAvailable ? "Available" : "Used"}
                                  />
                                )
                              })}
                              <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                                {featSpell.currentUses}/{featSpell.usesPerLongRest}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spell Notes */}
                <div className="pt-4 border-t flex flex-col gap-2">
                  <div className="text-sm font-medium">Spell Notes</div>
                  <RichTextDisplay
                    content={activeCharacter.spellData.spellNotes || "No spell notes"}
                    className={
                      !activeCharacter.spellData.spellNotes
                        ? "text-muted-foreground text-center py-2 text-sm"
                        : "text-sm"
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Equipment */}
            <Card className="flex flex-col gap-3">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Equipment & Magic Items
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setEquipmentModalOpen(true)}>
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col">
                <div className="flex flex-col gap-1 border-b pb-4 mb-4">
                  <div className="text-sm font-medium mb-2">Equipment Proficiencies</div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Column 1 */}
                    <div className="flex flex-col gap-2">
                      {[
                        { key: "lightArmor", label: "Light armour" },
                        { key: "mediumArmor", label: "Medium armour" },
                        { key: "heavyArmor", label: "Heavy armour" },
                        { key: "shields", label: "Shields" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(activeCharacter.equipmentProficiencies?.[item.key as keyof typeof activeCharacter.equipmentProficiencies])}
                            onChange={(e) => {
                              const value = e.target.checked
                              setCharacters((prev) => prev.map((c) =>
                                c.id === activeCharacter.id
                                  ? {
                                      ...c,
                                      equipmentProficiencies: {
                                        lightArmor: c.equipmentProficiencies?.lightArmor ?? false,
                                        mediumArmor: c.equipmentProficiencies?.mediumArmor ?? false,
                                        heavyArmor: c.equipmentProficiencies?.heavyArmor ?? false,
                                        shields: c.equipmentProficiencies?.shields ?? false,
                                        simpleWeapons: c.equipmentProficiencies?.simpleWeapons ?? false,
                                        martialWeapons: c.equipmentProficiencies?.martialWeapons ?? false,
                                        firearms: c.equipmentProficiencies?.firearms ?? false,
                                        [item.key]: value,
                                      } as any,
                                    }
                                  : c
                              ))
                              triggerAutoSave()
                            }}
                            className="w-3 h-3 rounded border-gray-300"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                    {/* Column 2 */}
                    <div className="flex flex-col gap-2">
                      {[
                        { key: "simpleWeapons", label: "Simple weapons" },
                        { key: "martialWeapons", label: "Martial weapons" },
                        { key: "firearms", label: "Firearms" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(activeCharacter.equipmentProficiencies?.[item.key as keyof typeof activeCharacter.equipmentProficiencies])}
                            onChange={(e) => {
                              const value = e.target.checked
                              setCharacters((prev) => prev.map((c) =>
                                c.id === activeCharacter.id
                                  ? {
                                      ...c,
                                      equipmentProficiencies: {
                                        lightArmor: c.equipmentProficiencies?.lightArmor ?? false,
                                        mediumArmor: c.equipmentProficiencies?.mediumArmor ?? false,
                                        heavyArmor: c.equipmentProficiencies?.heavyArmor ?? false,
                                        shields: c.equipmentProficiencies?.shields ?? false,
                                        simpleWeapons: c.equipmentProficiencies?.simpleWeapons ?? false,
                                        martialWeapons: c.equipmentProficiencies?.martialWeapons ?? false,
                                        firearms: c.equipmentProficiencies?.firearms ?? false,
                                        [item.key]: value,
                                      } as any,
                                    }
                                  : c
                              ))
                              triggerAutoSave()
                            }}
                            className="w-3 h-3 rounded border-gray-300"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Magic Items */}
                {activeCharacter.magicItems && activeCharacter.magicItems.length > 0 && (
                  <>
                  <div className="flex flex-col gap-3 border-b pb-4 mb-4">
                    <div className="text-sm font-medium">Magic Items</div>
                    <div className="flex flex-col gap-2">
                      {activeCharacter.magicItems.map((item, index) => (
                        <div key={index} className="p-2 border rounded">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">{item.name || "Unnamed Magic Item"}</h4>
                            {(item.maxUses ?? 0) > 0 && (
                              <div className="flex items-center gap-2">
                                {Array.from({ length: item.maxUses! }, (_, i) => {
                                  const maxUses = Math.max(0, item.maxUses ?? 0)
                                  const currentUses = Math.min(maxUses, Math.max(0, item.currentUses ?? maxUses))
                                  const usedCount = maxUses - currentUses
                                  const isAvailable = i < currentUses
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => toggleMagicItemUse(index, i)}
                                      className={`w-4 h-4 rounded border-2 transition-colors ${
                                        isAvailable
                                          ? "bg-purple-500 border-purple-500 cursor-pointer"
                                          : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
                                      }`}
                                      title={isAvailable ? "Available" : "Used"}
                                    />
                                  )
                                })}
                                <span className="text-xs text-muted-foreground ml-1">
                                  {Math.min(item.maxUses ?? 0, Math.max(0, item.currentUses ?? (item.maxUses ?? 0)))}/{item.maxUses}
                                </span>
                              </div>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground relative">
                              <div className="line-clamp-3 max-h-0 overflow-hidden">
                                <RichTextDisplay content={item.description} className="text-xs text-muted-foreground" />
                              </div>
                              <div className="flex justify-start">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="px-2 h-7 shadow-sm text-foreground"
                              onClick={() => {
                                setFeatureModalContent({ 
                                      title: item.name || "Unnamed Magic Item", 
                                      description: item.description,
                                      maxUses: item.maxUses,
                                      dailyRecharge: item.dailyRecharge
                                    })
                                setFeatureModalIsClassFeature(false)
                                    setFeatureModalOpen(true)
                                  }}
                                >
                                  Read more
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  </>
                )}

                {/* Equipment Notes */}
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium">Equipment Inventory</div>
                  <RichTextDisplay
                    content={activeCharacter.equipment || "No equipment listed"}
                      className={!activeCharacter.equipment ? "text-muted-foreground text-center py-2" : ""}
                    />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMN 3: Class Features, Feats */}
          <div className="space-y-6 flex flex-col gap-1">
            {/* Class Features */}
            <Card className="flex flex-col gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Class Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCharacter.classFeatures?.length > 0 ? (() => {
                    // Group features by class
                    const featuresByClass = new Map<string, Array<{name: string, description: string, source: string, level: number, className?: string}>>()
                    
                    activeCharacter.classFeatures.forEach(feature => {
                      // Use the className from the feature, or fallback to the character's primary class
                      const className = feature.className || activeCharacter.class
                      
                      if (!featuresByClass.has(className)) {
                        featuresByClass.set(className, [])
                      }
                      featuresByClass.get(className)!.push(feature)
                    })
                    
                    // Sort features within each class by level
                    featuresByClass.forEach(features => {
                      features.sort((a, b) => a.level - b.level)
                    })
                    
                    // Render grouped features
                    return Array.from(featuresByClass.entries()).map(([className, features]) => (
                      <div key={className} className="space-y-3">
                        {/* Class Header */}
                        {activeCharacter.classes && activeCharacter.classes.length > 1 && (
                          <div className="flex items-center gap-2 mt-2">
                            <h4 className="font-semibold text-sm text-foreground">{className} Features</h4>
                            <Badge variant="outline" className="text-xs">
                              {features.length}
                            </Badge>
                          </div>
                        )}
                        
                        {/* Features for this class */}
                        {features.map((feature, index) => (
                          <div key={`${className}-${index}`} className="p-3 border rounded-lg flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium flex-1 min-w-0 truncate">{feature.name}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Level {feature.level}
                                </Badge>
                                {feature.source?.toLowerCase() === "subclass" && (
                                  <Badge variant="secondary" className="text-xs">
                                    {feature.source}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground relative flex flex-col gap-2">
                              <div className="line-clamp-2 max-h-12 overflow-hidden">
                                <RichTextDisplay content={feature.description} className="text-sm text-muted-foreground" />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-fit px-2 h-7 shadow-sm text-foreground"
                                onClick={() => {
                                  setFeatureModalContent({ title: feature.name, description: feature.description })
                                  setFeatureModalIsClassFeature(true)
                                  setFeatureModalOpen(true)
                                }}
                              >
                                Read more
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  })() : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No class features available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Artificer - Eldritch Cannon */}
            {((activeCharacter.class.toLowerCase() === "artificer" && activeCharacter.subclass?.toLowerCase() === "artillerist" && activeCharacter.level >= 3) || (activeCharacter.classes?.some(c => c.name.toLowerCase() === "artificer" && c.subclass?.toLowerCase() === "artillerist") && activeCharacter.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) >= 3)) && (
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Eldritch Cannon
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEldritchCannonModalOpen(true)}
                      disabled={activeCharacter.level < 3}
                    >
                      <Edit className="w-4 h-4" />
                      {activeCharacter.eldritchCannon ? "Edit" : "Create"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activeCharacter.eldritchCannon ? (
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium flex items-center gap-2">
                            {activeCharacter.eldritchCannon.size} {activeCharacter.eldritchCannon.type}
                            <Badge variant="outline" className="text-xs">
                              {activeCharacter.eldritchCannon.currentHitPoints}/{activeCharacter.eldritchCannon.maxHitPoints} HP
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                            <div className="text-xs text-muted-foreground">AC</div>
                            <div className="font-mono text-lg font-semibold">{activeCharacter.eldritchCannon.armorClass}</div>
                          </div>
                          <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                            <div className="text-xs text-muted-foreground">Attack</div>
                            <div className="font-mono text-lg font-semibold">+{activeCharacter.eldritchCannon.attackBonus}</div>
                          </div>
                          <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                            <div className="text-xs text-muted-foreground">
                              {activeCharacter.eldritchCannon.type === 'Protector' ? 'Temp HP' : 'Damage'}
                            </div>
                            <div className="font-mono text-lg font-semibold">{activeCharacter.eldritchCannon.damage}</div>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                          {activeCharacter.eldritchCannon.specialProperty}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No active cannon. Artificers gain access to Eldritch Cannons at 3rd level.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Artificer - Infusions */}
            {((activeCharacter.class.toLowerCase() === "artificer" && activeCharacter.level >= 2) || (activeCharacter.classes?.some(c => c.name.toLowerCase() === "artificer") && activeCharacter.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) >= 2)) && (
              <Card className="flex flex-col gap-3">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Infusions
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setInfusionsModalOpen(true)}
                      disabled={activeCharacter.level < 2}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {/* Infusion Tracking */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Infusions Known</div>
                      <div className="text-xl font-bold text-primary font-mono">
                        {getArtificerInfusionsKnown(activeCharacter.level)}
                      </div>
                    </div>
                    <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Max Infused Items</div>
                      <div className="text-xl font-bold text-primary font-mono">
                        {getArtificerMaxInfusedItems(activeCharacter)}
                      </div>
                    </div>
                  </div>

                  {/* Infusions List */}
                  <div className="space-y-3 flex flex-col gap-2">
                    {activeCharacter.infusions.map((infusion, index) => (
                      <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between">
                        <h4 className="text-sm font-medium mb-0">{infusion.title || "Untitled Infusion"}</h4>
                        {infusion.description && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-2 h-7 shadow-sm text-foreground"
                          onClick={() => {
                            setFeatureModalContent({ 
                              title: infusion.title || "Untitled Infusion", 
                              description: infusion.description,
                              needsAttunement: infusion.needsAttunement
                            })
                            setFeatureModalIsClassFeature(false)
                          setFeatureModalOpen(true)
                        }}
                      >
                        Read more
                      </Button>
                        )}
                    </div>
                  ))}
                    {activeCharacter.infusions.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No infusions selected yet. You can choose {getArtificerInfusionsKnown(activeCharacter.level)} infusions at level {activeCharacter.level}.
                      </div>
                  )}
                </div>

                  {/* Infusion Notes Display */}
                  {activeCharacter.infusionNotes && (
                    <div className="mt-2 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Infusion Notes</div>
                      <RichTextDisplay 
                        content={activeCharacter.infusionNotes} 
                        className={
                          !activeCharacter.infusionNotes
                            ? "text-muted-foreground text-center py-2 text-sm"
                            : "text-sm"
                        }
                      />
                    </div>
                  )}
              </CardContent>
              </Card>
            )}

            {/* Warlock - Eldritch Invocations */}
            {((activeCharacter.class.toLowerCase() === "warlock" && activeCharacter.level >= 2) || (activeCharacter.classes?.some(c => c.name.toLowerCase() === "warlock") && activeCharacter.classes?.reduce((total, c) => c.name.toLowerCase() === "warlock" ? total + c.level : total, 0) >= 2)) && (
              <Card className="flex flex-col gap-3">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Eldritch Invocations
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEldritchInvocationsModalOpen(true)}
                      disabled={activeCharacter.level < 2}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {/* Invocation Tracking */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-2 border rounded-lg flex flex-col gap-1">
                      <div className="text-sm text-muted-foreground">Invocations Known</div>
                      <div className="text-xl font-bold text-primary font-mono">
                        {activeCharacter.spellData.eldritchInvocations?.length || 0}/{getWarlockInvocationsKnown(activeCharacter.level)}
                      </div>
                    </div>
                  </div>

                  {/* Invocations List */}
                  <div className="space-y-3 flex flex-col gap-2">
                    {activeCharacter.spellData.eldritchInvocations && activeCharacter.spellData.eldritchInvocations.length > 0 ? (
                      activeCharacter.spellData.eldritchInvocations.map((invocation, index) => (
                        <div key={index} className="p-2 mb-0 border rounded-lg flex items-center justify-between">
                          <h4 className="text-sm font-medium mb-0">{invocation.name}</h4>
                          {invocation.description && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2 h-7 shadow-sm text-foreground"
                              onClick={() => {
                                setFeatureModalContent({ 
                                  title: invocation.name, 
                                  description: invocation.description
                                })
                                setFeatureModalIsClassFeature(false)
                                setFeatureModalOpen(true)
                              }}
                            >
                              Read more
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No invocations selected yet. You can choose {getWarlockInvocationsKnown(activeCharacter.level)} invocations at level {activeCharacter.level}.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </main>

      {/* Edit Modals */}
      <BasicInfoModal
        isOpen={basicInfoModalOpen}
        onClose={() => setBasicInfoModalOpen(false)}
        character={activeCharacter}
        onSave={updateBasicInfo}
        onPartyStatusChange={handlePartyStatusChange}
      />
      <CharacterDetailsModal
        isOpen={characterDetailsModalOpen}
        onClose={() => setCharacterDetailsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <CharacterDetailsContentModal
        isOpen={characterDetailsContentModalOpen}
        onClose={() => setCharacterDetailsContentModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <AbilitiesModal
        isOpen={abilitiesModalOpen}
        onClose={() => setAbilitiesModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <CombatModal
        isOpen={combatModalOpen}
        onClose={() => setCombatModalOpen(false)}
        character={activeCharacter}
        onSave={(updates) => updateCharacter(updates, { autosave: true })}
      />
      <WeaponsModal
        isOpen={weaponsModalOpen}
        onClose={() => setWeaponsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <InfusionsModal
        isOpen={infusionsModalOpen}
        onClose={() => setInfusionsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <FeaturesModal
        isOpen={featuresModalOpen}
        onClose={() => setFeaturesModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <EquipmentModal
        isOpen={equipmentModalOpen}
        onClose={() => setEquipmentModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <LanguagesModal
        isOpen={languagesModalOpen}
        onClose={() => setLanguagesModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <ToolsModal
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <FeatsModal
        isOpen={featsModalOpen}
        onClose={() => setFeatsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />
      <SpellModal
        isOpen={spellModalOpen}
        onClose={() => setSpellModalOpen(false)}
        character={activeCharacter}
        onSave={updateSpellData}
      />
      <SpellListModal
        isOpen={spellListModalOpen}
        onClose={() => setSpellListModalOpen(false)}
        character={activeCharacter}
        onSave={updateSpellData}
      />
      <CharacterCreationModal
        isOpen={characterCreationModalOpen}
        onClose={() => setCharacterCreationModalOpen(false)}
        onCreateCharacter={handleCreateCharacter}
      />
      <Dialog open={featureModalOpen} onOpenChange={(open) => {
        setFeatureModalOpen(open)
        if (!open) {
          setFeatureNotesModalOpen(false)
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {featureModalContent?.title || "Feature"}
              {featureModalContent?.needsAttunement && (
                <Badge variant="outline" className="text-xs">
                  Requires Attunement
                </Badge>
              )}
            </DialogTitle>
            {/* Metadata Badges */}
            {(featureModalContent?.maxUses || featureModalContent?.dailyRecharge || featureModalContent?.usesPerLongRest || featureModalContent?.refuelingDie) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Magic Item Badges */}
                {featureModalContent.maxUses && featureModalContent.maxUses > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {featureModalContent.maxUses} use{featureModalContent.maxUses !== 1 ? 's' : ''} per day
                  </Badge>
                )}
                {featureModalContent.dailyRecharge && (
                  <Badge variant="secondary" className="text-xs">
                    Recharges: {featureModalContent.dailyRecharge}
                  </Badge>
                )}
                {/* Feature Badges */}
                {featureModalContent.usesPerLongRest && featureModalContent.usesPerLongRest !== 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {(() => {
                      const calculatedUses = getCalculatedUsesForModal(featureModalContent.usesPerLongRest)
                      return `${calculatedUses} use${calculatedUses !== 1 ? 's' : ''} per long rest`
                    })()}
                  </Badge>
                )}
                {featureModalContent.refuelingDie && (
                  <Badge variant="secondary" className="text-xs">
                    Replenishes: {featureModalContent.refuelingDie}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-3">
            {featureModalContent && (
              <>
                {/* Render custom notes (image + text) ABOVE the base description — only for class features */}
                {featureModalIsClassFeature && (() => {
                  const key = featureModalContent.title ?? ""
                  const note = activeCharacter.featureNotes?.[key]
                  const hasImage = Boolean(note?.imageUrl)
                  const hasContent = Boolean(note?.content)
                  return (
                    <div className="space-y-3 flex flex-col gap-1">
                      {hasImage && (
                        <img
                          src={note!.imageUrl as string}
                          alt="Feature illustration"
                          className="max-h-32 object-contain rounded"
                        />
                      )}
                      {hasContent ? (
                        <div className="rounded-lg w-full border text-sm p-3 bg-muted/30 col-span-2 flex flex-col gap-3">
                          <div className="text-md font-semibold text-black flex items-center gap-1"><NotebookPen className="w-4 h-4" />Custom notes</div>
                          <RichTextDisplay content={note!.content as string} className="text-sm font-mono" />
                        </div>
                      ) : (
                        <div className="rounded-lg w-full border text-sm font-mono text-muted-foreground p-3 bg-muted/30 col-span-2">
                          No custom notes yet. Click "Edit custom notes" to add your own text or an image.
                        </div>
                      )}
                      <div className="pt-1 border-t col-span-2" />
                    </div>
                  )
                })()}

                {/* Base description from class data */}
                <div className="space-y-3 flex flex-col gap-1">
                  <div className="text-md font-medium mb-0">Description</div>
                  <RichTextDisplay content={featureModalContent.description} className="text-sm text-muted-foreground" />
                </div>
              </>
            )}
          </div>

          {/* Footer (fixed above scroll, only for class features) */}
          {featureModalContent && featureModalIsClassFeature && (
            <div className="pt-3 mt-3 border-t flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => {
                  const key = featureModalContent.title ?? ""
                  setFeatureNotesDraft(activeCharacter.featureNotes?.[key]?.content || "")
                  setFeatureImageDraft(activeCharacter.featureNotes?.[key]?.imageUrl || "")
                  setFeatureNotesModalOpen(true)
                }}
              >
                <NotebookPen className="w-4 h-4" />Edit custom notes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Notes Editor Modal */}
      <Dialog open={featureNotesModalOpen} onOpenChange={setFeatureNotesModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><NotebookPen className="w-4 h-4" />Edit custom notes</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
              <RichTextEditor
                value={featureNotesDraft}
                onChange={setFeatureNotesDraft}
              />
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground">Image URL (optional)</label>
                <input
                  type="url"
                  value={featureImageDraft}
                  onChange={(e) => setFeatureImageDraft(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                  placeholder="https://example.com/image.png"
                />
              </div>
          </div>
          <div className="pt-3 mt-3 border-t flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setFeatureNotesModalOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!featureModalContent?.title) return
                const key = featureModalContent.title
                setCharacters(prev => prev.map(char =>
                  char.id === activeCharacter.id ? {
                    ...char,
                    featureNotes: {
                      ...(char.featureNotes || {}),
                      [key]: {
                        content: featureNotesDraft,
                        imageUrl: featureImageDraft || undefined,
                      },
                    },
                  } : char
                ))
                setFeatureNotesModalOpen(false)
                triggerAutoSave()
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portrait Modal */}
      <Dialog open={portraitModalOpen} onOpenChange={setPortraitModalOpen}>
        <DialogContent className="relative w-auto sm:max-w-none max-h-[90vh] p-2">
          <DialogClose className="absolute right-2 top-2 z-50 bg-white rounded shadow px-2 py-1 text-sm">Close</DialogClose>
          <div className="flex items-center justify-center">
            {activeCharacter.imageUrl && (
              <img
                src={activeCharacter.imageUrl}
                alt={activeCharacter.name}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Long Rest Modal */}
      <LongRestModal
        isOpen={longRestModalOpen}
        onClose={() => {
          setLongRestModalOpen(false)
          setCurrentLongRestEvent(null)
        }}
        characters={characters}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onConfirmLongRest={handleConfirmLongRest}
        longRestEvent={currentLongRestEvent}
        activeCharacterId={activeCharacterId}
      />

      {/* Long Rest Results Modal */}
      <LongRestResultsModal
        isOpen={longRestResultsModalOpen}
        onClose={() => {
          setLongRestResultsModalOpen(false)
          setLongRestResults(null)
        }}
        results={longRestResults}
      />

      {/* Eldritch Cannon Modal */}
      <EldritchCannonModal
        isOpen={eldritchCannonModalOpen}
        onClose={() => setEldritchCannonModalOpen(false)}
        character={activeCharacter}
        onSave={handleEldritchCannonSave}
      />

      {/* Eldritch Invocations Modal */}
      <EldritchInvocationsModal
        isOpen={eldritchInvocationsModalOpen}
        onClose={() => setEldritchInvocationsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={diceRollModalOpen}
        onClose={() => setDiceRollModalOpen(false)}
        character={activeCharacter}
        onUpdateHP={handleUpdateHP}
      />

      {/* Campaign Management Modal */}
      <CampaignManagementModal
        isOpen={campaignManagementModalOpen}
        onClose={() => setCampaignManagementModalOpen(false)}
        campaigns={campaigns}
        characters={characters}
        onCreateCampaign={handleCreateCampaign}
        onUpdateCampaign={handleUpdateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        onAssignCharacterToCampaign={handleAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={handleRemoveCharacterFromCampaign}
        onSetActiveCampaign={handleSetActiveCampaign}
      />
    </div>
  )
}
