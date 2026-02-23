"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { CharacterSidebar } from "@/components/character-sidebar"
import { CampaignManagementModal } from "@/components/edit-modals/campaign-management-modal"
import { ManagementInterface } from "@/components/management-interface"
import { CampaignCreationModal } from "@/components/edit-modals/campaign-creation-modal"
import { BasicInfoModal } from "@/components/edit-modals/basic-info-modal"
import { CharacterCreationModal } from "@/components/edit-modals/character-creation-modal"
import { createDefaultSkills, createDefaultSavingThrowProficiencies, createClassBasedSavingThrowProficiencies, createClassBasedSkills, calculatePassivePerception, calculatePassiveInsight, calculateSavingThrowBonus, calculateSpellSaveDC, calculateSpellAttackBonus, getSpellsKnown, getArtificerInfusionsKnown, getArtificerMaxInfusedItems, getTotalAdditionalSpells, getDivineSenseData, getLayOnHandsData, getChannelDivinityData, getCleansingTouchData, getWarlockInvocationsKnown, type Campaign, createCampaign } from "@/lib/character-data"
import { AbilitiesModal } from "@/components/edit-modals/abilities-modal"
import { CombatModal } from "@/components/edit-modals/combat-modal"
import { WeaponsModal } from "@/components/edit-modals/weapons-modal"
import { InfusionsModal } from "@/components/edit-modals/infusions-modal"
import { FeaturesModal } from "@/components/edit-modals/features-modal"
import { EquipmentModal } from "@/components/edit-modals/equipment-modal"
import { LanguagesModal } from "@/components/edit-modals/languages-modal"
import { CharacterHeader } from "@/components/character-sheet/CharacterHeader"
import { AestheticImages } from "@/components/character-sheet/AestheticImages"
import { AbilityScores } from "@/components/character-sheet/AbilityScores"
import { SavingThrows } from "@/components/character-sheet/SavingThrows"
import { Skills } from "@/components/character-sheet/Skills"
import { FeaturesTraits } from "@/components/character-sheet/FeaturesTraits"
import { Feats } from "@/components/character-sheet/Feats"
import { Money } from "@/components/character-sheet/Money"
import { Languages } from "@/components/character-sheet/Languages"
import { CombatStats } from "@/components/character-sheet/CombatStats"
import { Weapons } from "@/components/character-sheet/Weapons"
import { Spellcasting } from "@/components/character-sheet/Spellcasting"
import { ToolsProficiencies } from "@/components/character-sheet/ToolsProficiencies"
import { ClassFeatures } from "@/components/character-sheet/ClassFeatures"
import { Infusions } from "@/components/character-sheet/Infusions"
import { EldritchInvocations } from "@/components/character-sheet/EldritchInvocations"
import { Metamagic } from "@/components/character-sheet/Metamagic"
import { EldritchCannon as EldritchCannonComponent } from "@/components/character-sheet/EldritchCannon"
import { MoneyModal } from "@/components/edit-modals/money-modal"
import { FeatsModal } from "@/components/edit-modals/feats-modal"
import { SpellModal } from "@/components/edit-modals/spell-modal"
import { SpellListModal } from "@/components/edit-modals/spell-list-modal"
import { SpellCreationModal } from "@/components/edit-modals/spell-creation-modal"
import { DiceRollModal } from "@/components/edit-modals/dice-roll-modal"
import { CharacterDetailsModal } from "@/components/edit-modals/character-details-modal"
import { CharacterDetailsContentModal } from "@/components/edit-modals/character-details-content-modal"
import { LongRestModal } from "@/components/edit-modals/long-rest-modal"
import { LongRestResultsModal } from "@/components/edit-modals/long-rest-results-modal"
import { EldritchCannonModal } from "@/components/edit-modals/eldritch-cannon-modal"
import { EldritchInvocationsModal } from "@/components/edit-modals/eldritch-invocations-modal"
import { MetamagicModal } from "@/components/edit-modals/metamagic-modal"
import { SpellLibraryModal, type SpellLibraryModalRef } from "@/components/edit-modals/spell-library-modal"
import { LevelUpModal } from "@/components/edit-modals/level-up-modal"
import { FeatureUsageMigrationModal } from "@/components/feature-usage-migration-modal"
import { 
  useFeatureSlot, 
  restoreFeatureSlot, 
  addFeatureOption, 
  removeFeatureOption,
  updateFeatureCustomState,
  updateFeatureNotes,
  toggleFeatureAvailability,
  getFeatureUsage,
  initializeFeatureUsage,
  updateFeatureUsage as updateFeatureUsageData,
  resetAllFeatureUsage,
  type FeatureUsageData
} from "@/lib/feature-usage-tracker"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import { AppHeader } from "@/components/app-header"
import { AccessDeniedOverlay } from "@/components/access-denied-overlay"
import { WikiPage } from "@/components/wiki-page"
import { useUser } from "@/lib/user-context"
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
import { saveCharacter, loadCharacter, loadAllCharacters, testConnection, loadClassData, loadClassFeatures, updatePartyStatus, createCampaign as createCampaignDB, loadAllCampaigns, updateCampaign as updateCampaignDB, deleteCampaign, assignCharacterToCampaign, removeCharacterFromCampaign, setActiveCampaign, getCurrentUser, canViewCharacter, canEditCharacter, canEditCharacterWithCampaign, getAllUsers, createCampaignNote, updateCampaignNote, deleteCampaignNote, type CampaignNote, getCampaignResources, createCampaignResource, updateCampaignResource, deleteCampaignResource, type CampaignResource, getCampaignLinks, createCampaignLink, deleteCampaignLink, type CampaignLink } from "@/lib/database"
import type { UserProfile } from "@/lib/user-profiles"
import { useClassFeaturesPreloader } from "@/hooks/use-class-features"
import { subscribeToLongRestEvents, broadcastLongRestEvent, confirmLongRestEvent, type LongRestEvent, type LongRestEventData } from "@/lib/realtime"
import { getBardicInspirationData, getSongOfRestData } from "@/lib/class-utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { CampaignHomepage } from "@/components/campaign-homepage"

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function CharacterSheetContent() {
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [resources, setResources] = useState<CampaignResource[]>([])
  const [links, setLinks] = useState<CampaignLink[]>([])
  
  // Class features preloader
  const { preloadForCharacters } = useClassFeaturesPreloader()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("all")
  const [activeCharacterId, setActiveCharacterId] = useState<string>("")
  const [superadminOverride, setSuperadminOverride] = useState(false)
  const [currentView, setCurrentView] = useState<'character' | 'campaign' | 'management'>('campaign')
  const [appView, setAppView] = useState<'campaign' | 'wiki' | 'management'>('campaign')
  
  // Ref for the main scrollable container
  const mainRef = useRef<HTMLElement>(null)
  
  // Helper function to scroll the main container to top
  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' })
    }
  }
  
  // Get URL search parameters
  const searchParams = useSearchParams()
  
  // Get user data from global context
  const { user: currentUser, userProfile: currentUserProfile, isSuperadmin: isUserSuperadmin, isLoading: userLoading } = useUser()

  
  const [basicInfoModalOpen, setBasicInfoModalOpen] = useState(false)
  const [abilitiesModalOpen, setAbilitiesModalOpen] = useState(false)
  const [combatModalOpen, setCombatModalOpen] = useState(false)
  const [weaponsModalOpen, setWeaponsModalOpen] = useState(false)
  const [infusionsModalOpen, setInfusionsModalOpen] = useState(false)
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false)
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
  const [languagesModalOpen, setLanguagesModalOpen] = useState(false)
  const [moneyModalOpen, setMoneyModalOpen] = useState(false)
  const [featsModalOpen, setFeatsModalOpen] = useState(false)
  const [spellModalOpen, setSpellModalOpen] = useState(false)
  const [spellListModalOpen, setSpellListModalOpen] = useState(false)
  const [spellLibraryModalOpen, setSpellLibraryModalOpen] = useState(false)
  const [spellCreationModalOpen, setSpellCreationModalOpen] = useState(false)
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
  const [uploadingFeatureImage, setUploadingFeatureImage] = useState(false)
  const featureImageInputRef = useRef<HTMLInputElement>(null)
  const [featureOverflowMap, setFeatureOverflowMap] = useState<Record<number, boolean>>({})
  const [portraitModalOpen, setPortraitModalOpen] = useState(false)
  const [longRestModalOpen, setLongRestModalOpen] = useState(false)
  const [currentLongRestEvent, setCurrentLongRestEvent] = useState<LongRestEvent | null>(null)
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null)
  const [eldritchCannonModalOpen, setEldritchCannonModalOpen] = useState(false)
  const [eldritchInvocationsModalOpen, setEldritchInvocationsModalOpen] = useState(false)
  const [metamagicModalOpen, setMetamagicModalOpen] = useState(false)
  const [diceRollModalOpen, setDiceRollModalOpen] = useState(false)
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false)
  const [campaignManagementModalOpen, setCampaignManagementModalOpen] = useState(false)
  const [campaignCreationModalOpen, setCampaignCreationModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
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
  const spellLibraryRef = useRef<SpellLibraryModalRef>(null)

  // Helper function to determine if a character has spellcasting abilities
  const hasSpellcastingAbilities = (character: CharacterData): boolean => {
    // Define classes that have spellcasting by default
    const fullSpellcastingClasses = ['wizard', 'sorcerer', 'warlock', 'bard', 'cleric', 'druid', 'ranger', 'paladin', 'artificer']
    
    // Define subclasses that add spellcasting to non-spellcasting base classes
    const spellcastingSubclasses = ['arcane trickster', 'eldritch knight', 'way of the four elements']
    
    // Check if the character has any spellcasting classes
    if (character.classes && character.classes.length > 0) {
      // Multiclassing - check if any class has spellcasting
      return character.classes.some(charClass => {
        const className = charClass.name.toLowerCase()
        const subclassName = charClass.subclass?.toLowerCase() || ''
        
        // Check if it's a full spellcasting class
        if (fullSpellcastingClasses.includes(className)) {
          return true
        }
        
        // Check if it's a subclass that adds spellcasting
        if (spellcastingSubclasses.includes(subclassName)) {
          return true
        }
        
        return false
      })
    } else {
      // Single class - check the main class and subclass
      const className = character.class.toLowerCase()
      const subclassName = character.subclass?.toLowerCase() || ''
      
      // Check if it's a full spellcasting class
      if (fullSpellcastingClasses.includes(className)) {
        return true
      }
      
      // Check if it's a subclass that adds spellcasting
      if (spellcastingSubclasses.includes(subclassName)) {
        return true
      }
      
      return false
    }
  }

  // Helper function to check if character is a monk
  const isMonk = (character: CharacterData): boolean => {
    if (character.classes && character.classes.length > 0) {
      return character.classes.some(cls => cls.name.toLowerCase() === 'monk')
    }
    return character.class.toLowerCase() === 'monk'
  }

  // Get current campaign data
  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId)
  
  // Load campaign data (resources, links) - notes are now handled by the hook
  const loadCampaignData = async (campaignId: string) => {
    if (campaignId === "all" || campaignId === "no-campaign") {
      setResources([])
      setLinks([])
      return
    }

    try {
      const [{ resources: res, error: resError } = {}, { links: lks, error: linkError } = {}] = await Promise.all([
        getCampaignResources(campaignId),
        getCampaignLinks(campaignId)
      ])
      if (resError) console.error("Failed to load campaign resources:", resError)
      if (linkError) console.error("Failed to load campaign links:", linkError)
      setResources(res || [])
      setLinks(lks || [])
    } catch (error) {
      console.error("Error loading campaign data:", error)
      setResources([])
      setLinks([])
    }
  }

  // Set initial view based on active campaign
  useEffect(() => {
    if (campaigns.length > 0 && selectedCampaignId === "all") {
      // Find the active campaign
      const activeCampaign = campaigns.find(c => c.isActive)
      if (activeCampaign) {
        setSelectedCampaignId(activeCampaign.id)
        setCurrentView('campaign')
      }
    }
  }, [campaigns, selectedCampaignId])

  // Load campaign data when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignData(selectedCampaignId)
    }
  }, [selectedCampaignId])

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
  
  // Access control checks
  const canViewActiveCharacter = activeCharacter ? (
    // Owner can always view
    activeCharacter.userId === currentUser?.id ||
    // Superadmin with override can view
    (isUserSuperadmin && superadminOverride) ||
    // Public characters can be viewed by anyone (no overlay for anyone)
    activeCharacter.visibility === 'public'
  ) : false

  
  // Get current campaign DM for campaign-aware editing
  const canEditActiveCharacter = activeCharacter ? canEditCharacterWithCampaign(
    activeCharacter, 
    currentUser?.id, 
    currentCampaign?.dungeonMasterId,
    selectedCampaignId,
    currentUserProfile?.permissionLevel
  ) : false

  
  // Reset superadmin override when switching to a different character
  const [previousCharacterId, setPreviousCharacterId] = useState<string>("")
  useEffect(() => {
    if (activeCharacterId !== previousCharacterId) {
      setSuperadminOverride(false)
      setPreviousCharacterId(activeCharacterId)
    }
  }, [activeCharacterId, previousCharacterId])


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

  const handleFeatureImageUpload = async (file: File) => {
    try {
      setUploadingFeatureImage(true)

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'feature-notes-images')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to upload image'
        throw new Error(errorMessage)
      }

      setFeatureImageDraft(result.url)
    } catch (error) {
      console.error('Error uploading feature image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingFeatureImage(false)
    }
  }

  const handleFeatureImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFeatureImageUpload(file)
    }
    // Reset input so same file can be selected again
    if (featureImageInputRef.current) {
      featureImageInputRef.current.value = ''
    }
  }

  const updateCharacter = (updates: Partial<CharacterData>, options?: { autosave?: boolean }) => {
    setCharacters((prev) => prev.map((char) => {
      if (char.id === activeCharacterId) {
        // Preserve backgroundData and backgroundId only if they're not being explicitly updated
        // This allows intentional updates while preventing accidental overwrites from other fields
        const preservedFields: Partial<CharacterData> = {}
        if (!('backgroundId' in updates)) {
          preservedFields.backgroundId = char.backgroundId
        }
        if (!('backgroundData' in updates)) {
          preservedFields.backgroundData = char.backgroundData
        }
        
        const updatedChar = { ...char, ...updates, ...preservedFields }
        
        // If level changed, update feature max uses that depend on proficiency bonus
        if (updates.level && updates.level !== char.level) {
          const { updateAllDynamicFeatures } = require('@/lib/feature-usage-tracker')
          updatedChar.classFeatureSkillsUsage = updateAllDynamicFeatures(updatedChar)
        }
        
        return updatedChar
      }
      return char
    }))
    
    if (options?.autosave !== false) {
      triggerAutoSave()
    }
  }

  // Helper function to update feature usage and save character
  const updateFeatureUsage = async (featureId: string, updates: any) => {
    const activeCharacter = characters.find(c => c.id === activeCharacterId)
    if (!activeCharacter) return

    let updatedUsage = activeCharacter.classFeatureSkillsUsage || {}
    
    // Apply the updates to the feature usage
    if (updates.type === 'use_slot') {
      updatedUsage = useFeatureSlot(activeCharacter, featureId, updates.amount || 1)
    } else if (updates.type === 'restore_slot') {
      updatedUsage = restoreFeatureSlot(activeCharacter, featureId, updates.amount || 1)
    } else if (updates.type === 'add_option') {
      updatedUsage = addFeatureOption(activeCharacter, featureId, updates.optionId)
    } else if (updates.type === 'remove_option') {
      updatedUsage = removeFeatureOption(activeCharacter, featureId, updates.optionId)
    } else if (updates.type === 'update_custom_state') {
      updatedUsage = updateFeatureCustomState(activeCharacter, featureId, updates.stateUpdates)
    } else if (updates.type === 'update_notes') {
      updatedUsage = updateFeatureNotes(activeCharacter, featureId, updates.notes)
    } else if (updates.type === 'toggle_availability') {
      updatedUsage = toggleFeatureAvailability(activeCharacter, featureId)
    } else if (updates.type === 'update_max_uses') {
      updatedUsage = updateFeatureUsageData(activeCharacter, featureId, {
        maxUses: updates.maxUses,
        currentUses: updates.currentUses
      })
    } else if (updates.type === 'direct_update') {
      updatedUsage = {
        ...updatedUsage,
        [featureId]: {
          ...updatedUsage[featureId],
          ...updates.updates,
          lastUpdated: new Date().toISOString()
        }
      }
    }

    // Always update the character with new usage data
    updateCharacter({ classFeatureSkillsUsage: updatedUsage })
  }

  // Helper function to get feature usage data
  const getFeatureUsageData = (featureId: string) => {
    const activeCharacter = characters.find(c => c.id === activeCharacterId)
    if (!activeCharacter) return null
    return getFeatureUsage(activeCharacter, featureId)
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

  // Force recalculation of max uses for all characters
  const recalculateAllCharactersMaxUses = useCallback(() => {
    const { forceRecalculateCharacterMaxUses } = require('@/lib/feature-usage-tracker')
    
    setCharacters((prev) => prev.map((character) => {
      const updatedCharacter = forceRecalculateCharacterMaxUses(character)
      return updatedCharacter
    }))
    
    toast({
      title: "Recalculated",
      description: "Max uses recalculated for all characters.",
    })
  }, [])

  // Spell slots are now calculated during initial character load for better performance

  const handlePartyStatusChange = async (status: 'active' | 'away' | 'deceased') => {
    if (!activeCharacterId || !activeCharacter) return

    const result = await updatePartyStatus(activeCharacterId, status, activeCharacter.class, activeCharacter.level)
    if (result.success) {
      // Update the character in the local state
      updateCharacter({ partyStatus: status })
      // Only show toast if status actually changed (avoid showing on non-critical errors)
      if (activeCharacter.partyStatus !== status) {
        toast({
          title: "Party Status Updated",
          description: `Character status changed to ${status}`,
        })
      }
    } else if (result.error && !result.error.includes('409') && !result.error.toLowerCase().includes('conflict')) {
      // Only show error toast for non-conflict errors (409 conflicts are non-critical)
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
    // Only load characters after user context is loaded
    if (!userLoading) {
      loadFromDatabaseFirst()
    }
  }, [userLoading])

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
        
        // Fetch users from API route to get last_login synced from Auth
        let dbUsers: UserProfile[] | undefined = undefined
        let usersLoadError: string | undefined = undefined
        try {
          const usersRes = await fetch('/api/users/list')
          if (usersRes.ok) {
            const data = await usersRes.json()
            dbUsers = data.users
          } else {
            const errorData = await usersRes.json().catch(() => ({}))
            usersLoadError = errorData.error || 'Failed to load users'
          }
        } catch (e: any) {
          usersLoadError = e?.message || 'Failed to load users'
        }
        
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
          setUsers(dbUsers || [])
          
          // Preload class features for all characters in the background
          preloadForCharacters(dbCharacters).catch(error => {
            // Failed to preload class features - non-critical
          })

          // Set campaign by default - prioritize default campaign, then first active campaign
          const defaultCampaign = (dbCampaigns || []).find(c => c.isDefault)
          const activeCampaign = defaultCampaign || (dbCampaigns || []).find(c => c.isActive)
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

          // Check for character ID in URL parameters first
          const characterFromUrl = searchParams.get('character')
          const savedActiveCharacterId = loadActiveCharacterFromLocalStorage()
          
          let validCharacterId: string | null = null
          
          // Priority 1: Character from URL parameter
          if (characterFromUrl && dbCharacters.find((c) => c.id === characterFromUrl)) {
            validCharacterId = characterFromUrl
          }
          // Priority 2: Saved character from localStorage
          else if (savedActiveCharacterId && dbCharacters.find((c) => c.id === savedActiveCharacterId)) {
            validCharacterId = savedActiveCharacterId
          }

          // If no valid character found or character is not in the filtered campaign, select first character from filtered list
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

  // Campaign Notes Functions
  const handleCreateNote = async (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { note: newNote, error } = await createCampaignNote(note)
      if (error) {
        console.error("Failed to create note:", error)
        toast({
          title: "Error",
          description: "Failed to create note. Please try again.",
          variant: "destructive",
        })
        return
      }

      if (newNote) {
        toast({
          title: "Success",
          description: "Note created successfully!",
        })
      }
    } catch (error) {
      console.error("Error creating note:", error)
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateNote = async (id: string, updates: Partial<Pick<CampaignNote, 'title' | 'content'>>) => {
    try {
      const { note: updatedNote, error } = await updateCampaignNote(id, updates)
      if (error) {
        console.error("Failed to update note:", error)
        toast({
          title: "Error",
          description: "Failed to update note. Please try again.",
          variant: "destructive",
        })
        return
      }

      if (updatedNote) {
        toast({
          title: "Success",
          description: "Note updated successfully!",
        })
      }
    } catch (error) {
      console.error("Error updating note:", error)
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const { success, error } = await deleteCampaignNote(id, selectedCampaignId)
      if (error || !success) {
        console.error("Failed to delete note:", error)
        toast({
          title: "Error",
          description: "Failed to delete note. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Note deleted successfully!",
      })
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Campaign Resources Functions
  const handleCreateResource = async (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>) => {
    const { resource: newResource, error } = await createCampaignResource(resource)
    if (error || !newResource) {
      console.error("Failed to create resource:", error)
      toast({ title: "Error", description: "Failed to create resource.", variant: "destructive" })
      throw new Error(error || 'createResourceFailed')
    }
    setResources(prev => [newResource, ...prev])
    toast({ title: "Success", description: "Resource created." })
    return newResource
  }

  const handleUpdateResource = async (id: string, updates: Partial<Pick<CampaignResource, 'title' | 'content'>>) => {
    try {
      const { resource: updated, error } = await updateCampaignResource(id, updates)
      if (!error && updated) {
        setResources(prev => prev.map(r => r.id === id ? updated : r))
        toast({ title: "Success", description: "Resource updated." })
      }
    } catch (error) {
      console.error("Error updating resource:", error)
    }
  }

  const handleDeleteResource = async (id: string) => {
    try {
      const { success } = await deleteCampaignResource(id)
      if (success) {
        setResources(prev => prev.filter(r => r.id !== id))
        toast({ title: "Success", description: "Resource deleted." })
      }
    } catch (error) {
      console.error("Error deleting resource:", error)
    }
  }

  // Campaign Links Functions
  const handleCreateLink = async (link: Omit<CampaignLink, 'id' | 'created_at' | 'updated_at'>) => {
    const { link: created, error } = await createCampaignLink(link)
    if (error || !created) {
      console.error("Failed to create link:", error)
      toast({ title: "Error", description: "Failed to add link.", variant: "destructive" })
      throw new Error(error || 'createLinkFailed')
    }
    setLinks(prev => [created, ...prev])
    toast({ title: "Success", description: "Link added." })
    return created
  }

  const handleDeleteLink = async (id: string) => {
    try {
      const { success } = await deleteCampaignLink(id)
      if (success) {
        setLinks(prev => prev.filter(l => l.id !== id))
        toast({ title: "Success", description: "Link removed." })
      }
    } catch (error) {
      console.error("Error deleting link:", error)
    }
  }

  // Dice Roll Functions
  const handleOpenDiceRoll = () => {
    setDiceRollModalOpen(true)
  }

  // Campaign Management Functions
  const handleOpenCampaignManagement = () => {
    setCampaignManagementModalOpen(true)
  }

  const handleEditCampaign = () => {
    setEditingCampaign(currentCampaign || null)
    setCampaignCreationModalOpen(true)
  }

  const handleEditCampaignSave = async (campaign: Campaign) => {
    try {
      const { error } = await updateCampaignDB(campaign)
      if (error) {
        console.error("Failed to update campaign:", error)
        return
      }
      
      // Update the campaigns list
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c))
      
      // Close the modal
      setCampaignCreationModalOpen(false)
      setEditingCampaign(null)
    } catch (error) {
      console.error("Error updating campaign:", error)
    }
  }

  const handleOpenSpellLibrary = () => {
    setSpellLibraryModalOpen(true)
  }

  const handleAddSpell = (spell: any, characterId: string) => {
    const targetCharacter = characters.find(c => c.id === characterId)
    if (!targetCharacter) return
    
    const updatedSpellData = {
      ...targetCharacter.spellData,
      spells: [...(targetCharacter.spellData.spells || []), spell]
    }
    
    // Update the specific character
    setCharacters(prev => prev.map(char => 
      char.id === characterId 
        ? { ...char, spellData: updatedSpellData }
        : char
    ))
    
    // Trigger save for that character
    triggerAutoSave()
    
    // Show toast notification
    toast({
      title: "Spell Added",
      description: `${spell.name} has been added to ${targetCharacter.name}'s spell list.`,
    })
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

  const handleToggleLevelUpMode = async () => {
    if (!currentCampaign) return
    
    const newLevelUpMode = !currentCampaign.levelUpModeEnabled
    const updatedCampaign = { ...currentCampaign, levelUpModeEnabled: newLevelUpMode }
    
    try {
      const { error } = await updateCampaignDB(updatedCampaign)
      if (error) {
        console.error("Failed to toggle level up mode:", error)
        toast({
          title: "Error",
          description: "Failed to toggle level up mode.",
          variant: "destructive",
        })
        return
      }
      
      // Update the campaigns list
      setCampaigns(prev => prev.map(c => c.id === currentCampaign.id ? updatedCampaign : c))
      
      // If disabling level up mode, reset all character level up completion flags
      if (!newLevelUpMode) {
        const campaignCharacters = characters.filter(char => char.campaignId === currentCampaign.id)
        const resetPromises = campaignCharacters.map(char => 
          saveCharacter({ ...char, levelUpCompleted: false })
        )
        await Promise.all(resetPromises)
        
        // Update local state
        setCharacters(prev => prev.map(char => 
          char.campaignId === currentCampaign.id ? { ...char, levelUpCompleted: false } : char
        ))
      }
      
      toast({
        title: newLevelUpMode ? "Level Up Enabled" : "Level Up Disabled",
        description: newLevelUpMode 
          ? "Characters can now level up." 
          : "Level up has been disabled and completion flags reset.",
      })
    } catch (error) {
      console.error("Error toggling level up mode:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
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

  const handleConvertToNPC = async (characterId: string) => {
    try {
      const character = characters.find(c => c.id === characterId)
      if (!character) return

      const updatedCharacter = {
        ...character,
        isNPC: true,
        visibility: 'private' as const,
        userId: currentCampaign?.dungeonMasterId || character.userId
      }

      const result = await saveCharacter(updatedCharacter)
      if (result.success) {
        setCharacters(prev => prev.map(char => 
          char.id === characterId ? updatedCharacter : char
        ))
        toast({
          title: "Converted to NPC",
          description: `${character.name} has been converted to an NPC.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to convert character to NPC.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error converting character to NPC:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while converting the character.",
        variant: "destructive",
      })
    }
  }

  const handleConvertFromNPC = async (characterId: string) => {
    try {
      const character = characters.find(c => c.id === characterId)
      if (!character) return

      const updatedCharacter = {
        ...character,
        isNPC: false,
        visibility: 'public' as const
      }

      const result = await saveCharacter(updatedCharacter)
      if (result.success) {
        setCharacters(prev => prev.map(char => 
          char.id === characterId ? updatedCharacter : char
        ))
        toast({
          title: "Converted to PC",
          description: `${character.name} has been converted to a player character.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to convert NPC to PC.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error converting NPC to PC:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while converting the NPC.",
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

      // CRITICAL: Fetch fresh character data from database before applying long rest effects
      // This ensures we're working with the most up-to-date data and don't overwrite
      // any changes that were made since the modal was opened (by this user or others)
      const freshCharacterPromises = selectedCharacterIds.map(id => loadCharacter(id))
      const freshCharacterResults = await Promise.all(freshCharacterPromises)
      
      // Create a map of fresh character data
      const freshCharactersMap = new Map<string, CharacterData>()
      freshCharacterResults.forEach((result: { character?: CharacterData; error?: string }) => {
        if (result.character) {
          freshCharactersMap.set(result.character.id, result.character)
        } else if (result.error) {
          console.error('[Long Rest] Failed to load character:', result.error)
        }
      })
      
      // Merge fresh data with existing characters state
      // Use fresh data for selected characters, keep existing data for others
      const charactersToProcess = characters.map(character => {
        if (freshCharactersMap.has(character.id)) {
          return freshCharactersMap.get(character.id)!
        }
        return character
      })


      // Update all selected characters to restore their hit points and replenish magic items
      const updatedCharacters = charactersToProcess.map(character => {
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

          // Legacy Warlock columns have been dropped - using unified system only

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

          // Replenish all unified class feature skills usage (new system)
          // This handles all features tracked in classFeatureSkillsUsage: slots, points pools, availability toggles
          const updatedClassFeatureSkillsUsage = resetAllFeatureUsage(character, 'long_rest')
          
          // Track class feature replenishments from unified system for results display
          if (updatedClassFeatureSkillsUsage) {
            Object.entries(updatedClassFeatureSkillsUsage).forEach(([featureId, featureData]: [string, FeatureUsageData[string]]) => {
              // Track slots-based features
              if (featureData.featureType === 'slots' && featureData.maxUses) {
                const currentUsage = character.classFeatureSkillsUsage?.[featureId]
                const previousUses = currentUsage?.currentUses ?? featureData.maxUses
                const usesRestored = featureData.maxUses - previousUses
                
                if (usesRestored > 0) {
                  classAbilityReplenishments.push({
                    abilityName: featureData.featureName || featureId,
                    usesRestored,
                    maxUses: featureData.maxUses
                  })
                }
              }
              
              // Track points pool features
              if (featureData.featureType === 'points_pool' && featureData.maxPoints) {
                const currentUsage = character.classFeatureSkillsUsage?.[featureId]
                const previousPoints = currentUsage?.currentPoints ?? featureData.maxPoints
                const pointsRestored = featureData.maxPoints - previousPoints
                
                if (pointsRestored > 0) {
                  classAbilityReplenishments.push({
                    abilityName: featureData.featureName || featureId,
                    usesRestored: pointsRestored,
                    maxUses: featureData.maxPoints
                  })
                }
              }
              
              // Track availability toggle features
              if (featureData.featureType === 'availability_toggle') {
                const currentUsage = character.classFeatureSkillsUsage?.[featureId]
                const wasAvailable = currentUsage?.isAvailable ?? true
                
                if (!wasAvailable && featureData.isAvailable) {
                  classAbilityReplenishments.push({
                    abilityName: featureData.featureName || featureId,
                    usesRestored: 1,
                    maxUses: 1
                  })
                }
              }
            })
          }

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
            classFeatureSkillsUsage: updatedClassFeatureSkillsUsage,
            exhaustion: Math.max(0, (character.exhaustion || 0) - 1), // Reduce exhaustion by 1 (minimum 0)
            deathSaves: { successes: 0, failures: 0 }, // Reset death saves on long rest
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
  }, [characters, toast]) // Note: characters is used only for merging with fresh DB data, not for the actual rest effects

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
      const { users: dbUsers, error: usersLoadError } = await getAllUsers()
      
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
        setUsers(dbUsers || [])
        
        // Preload class features for all characters in the background
        preloadForCharacters(dbCharacters).catch(error => {
          // Failed to preload class features - non-critical
        })
        
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
    
    if (!activeCharacterId) {
      return
    }
    
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) {
      return
    }
    
    const updatedSpellData = {
      ...currentCharacter.spellData,
      ...spellDataUpdates,
    }
    
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
          // Calculate paladin features for single class
          if (updates.class?.toLowerCase() === "paladin" || currentCharacter.class.toLowerCase() === "paladin") {
            const paladinCharacter = { ...currentCharacter, ...updates, level: newLevel }
            divineSenseSlot = getDivineSenseData(paladinCharacter)
            layOnHands = getLayOnHandsData(paladinCharacter)
            channelDivinitySlot = getChannelDivinityData(paladinCharacter)
            cleansingTouchSlot = getCleansingTouchData(paladinCharacter)
          }
        }

        // Create comprehensive updates
        const comprehensiveUpdates: Partial<CharacterData> = {
          ...updates,
          class_id: classData?.id,
          classFeatures: classFeatures.map(feature => ({
            id: `feature-${Date.now()}-${Math.random()}`,
            class_id: classData?.id || '',
            level: feature.level,
            title: feature.name,
            description: feature.description,
            feature_type: 'class_feature',
            name: feature.name,
            source: feature.source,
            className: updates.class || currentCharacter.class
          })),
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
            // Legacy Warlock columns have been dropped - using unified system only
          },
          // Clear class-specific equipment when class changes
          ...(classChanged || multiclassChanged ? {
            infusions: [],
            infusionNotes: "",
            classFeatureSkillsUsage: {}, // Clear old class feature usage data
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
    classes?: Array<{name: string, subclass?: string, class_id?: string, level: number, selectedSkillProficiencies?: string[]}>
    background: string
    race: string
    raceIds?: Array<{id: string, isMain: boolean}>
    alignment: string
    isNPC?: boolean
    campaignId?: string
    selectedFeatures?: string[]
    abilityScores?: {
      strength: number
      dexterity: number
      constitution: number
      intelligence: number
      wisdom: number
      charisma: number
    }
    skills?: Array<{name: string, ability: string, proficiency: 'none' | 'proficient' | 'expertise'}>
    savingThrowProficiencies?: Array<{ability: string, proficient: boolean}>
    maxHitPoints?: number
    currentHitPoints?: number
    speed?: number
    armorClass?: number
    initiative?: number
    features?: Array<{name: string, description: string, usesPerLongRest?: number | string, currentUses?: number, refuelingDie?: string}>
    feats?: Array<{name: string, description: string}>
    languages?: string
    imageUrl?: string
    toolsProficiencies?: Array<{name: string, proficiency: 'none' | 'proficient' | 'expertise'}>
    equipment?: string
    money?: { gold: number; silver: number; copper: number }
    equipmentProficiencies?: {
      lightArmor: boolean
      mediumArmor: boolean
      heavyArmor: boolean
      shields: boolean
      simpleWeapons: boolean
      martialWeapons: boolean
      firearms: boolean
      handCrossbows: boolean
      longswords: boolean
      rapiers: boolean
      shortswords: boolean
      scimitars: boolean
      lightCrossbows: boolean
      darts: boolean
      slings: boolean
      quarterstaffs: boolean
    }
  }) => {
    const newId = (characters.length + 1).toString()
    
    // Get current user for ownership
    const { user, error: userError } = await getCurrentUser()
    if (userError) {
      toast({
        title: "Error",
        description: `Failed to get user information: ${userError}`,
        variant: "destructive",
      })
      return
    }
    
    // For NPCs, use DM as owner if available, otherwise current user
    const ownerId = characterData.isNPC && currentCampaign?.dungeonMasterId 
      ? currentCampaign.dungeonMasterId 
      : user?.id
    
    // Use multiclass data if available, otherwise use single class
    const classesToUse = characterData.classes && characterData.classes.length > 0 
      ? characterData.classes 
      : [{
          name: characterData.class,
          subclass: characterData.subclass,
          class_id: characterData.classId,
          level: characterData.level
        }]
    
    // Load class data for the first class to get primary ability for spell calculations
    const { classData } = await loadClassData(characterData.class, characterData.subclass)
    const proficiencyBonus = calculateProficiencyBonus(characterData.level)
    
    // Load class features from database for all selected features
    let classFeatures: Array<{name: string, description: string, source: string, level: number}> = []
    if (characterData.selectedFeatures && characterData.selectedFeatures.length > 0) {
      // Load features for all classes if multiclassing
      for (const charClass of classesToUse) {
        if (charClass.class_id) {
          const { features, error: featuresError } = await loadClassFeatures(
            charClass.class_id, 
            charClass.level,
            charClass.subclass,
            true // includeHidden to get ASI features
          )
          if (!featuresError && features) {
            // Only include selected features
            const selectedForThisClass = features.filter(f => 
              characterData.selectedFeatures?.includes(f.id)
            )
            classFeatures.push(...selectedForThisClass.map(f => ({
              name: f.name || f.title || '',
              description: f.description || '',
              source: f.source || charClass.name,
              level: f.level || 1
            })))
          }
        }
      }
    } else if (classData?.id) {
      // Fallback: load all features if no specific selection
      const { features, error: featuresError } = await loadClassFeatures(classData.id, characterData.level)
      if (featuresError) {
        console.error("Error loading class features:", featuresError)
      } else {
        classFeatures = features || []
      }
    }
    
    // Use passed ability scores, or default to 10
    const abilityScores = characterData.abilityScores || {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }
    
    // Use passed skills or create from class data
    const skills = characterData.skills || (classData?.skill_proficiencies 
      ? createClassBasedSkills(classData.skill_proficiencies) as any 
      : createDefaultSkills())
    
    // Use passed saving throw proficiencies or create from class
    const savingThrowProficiencies: Array<{ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', proficient: boolean}> = 
      characterData.savingThrowProficiencies?.map(st => ({
        ability: st.ability as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma',
        proficient: st.proficient
      })) || createClassBasedSavingThrowProficiencies(characterData.class)
    
    // Calculate hit dice for multiclassing
    const hitDieTypes: Record<string, number> = {
      'barbarian': 12, 'fighter': 10, 'paladin': 10, 'ranger': 10,
      'artificer': 8, 'bard': 8, 'cleric': 8, 'druid': 8, 'monk': 8,
      'rogue': 8, 'warlock': 8, 'wizard': 6, 'sorcerer': 6
    }
    
    const hitDiceByClass = classesToUse.map(charClass => ({
      className: charClass.name,
      dieType: `d${hitDieTypes[charClass.name.toLowerCase()] || 8}`,
      total: charClass.level,
      used: 0
    }))
    
    // Calculate total hit dice
    const totalHitDice = classesToUse.reduce((sum, c) => sum + c.level, 0)
    
    // Create a temporary character object for calculations
    const tempCharacter: CharacterData = {
      id: newId,
      name: characterData.name,
      class: characterData.class, // Legacy field
      subclass: characterData.subclass, // Legacy field
      class_id: characterData.classId, // Legacy field
      level: characterData.level,
      classes: classesToUse, // Multiclass support
      background: characterData.background,
      backgroundId: characterData.backgroundId,
      backgroundData: characterData.backgroundData,
      race: characterData.raceIds && characterData.raceIds.length > 0
        ? (characterData.raceIds.find(r => r.isMain)?.id || characterData.raceIds[0]?.id || characterData.race)
        : characterData.race, // Legacy field
      raceIds: characterData.raceIds, // New field
      alignment: characterData.alignment,
      userId: ownerId,
      visibility: characterData.isNPC ? 'private' : 'public',
      isNPC: characterData.isNPC || false,
      // Use the campaignId from characterData if provided (from campaign homepage), otherwise undefined
      campaignId: characterData.campaignId || undefined,
      strength: abilityScores.strength,
      dexterity: abilityScores.dexterity,
      constitution: abilityScores.constitution,
      intelligence: abilityScores.intelligence,
      wisdom: abilityScores.wisdom,
      charisma: abilityScores.charisma,
      armorClass: characterData.armorClass || 10,
      initiative: characterData.initiative || 0,
      speed: characterData.speed || 30,
      currentHitPoints: characterData.currentHitPoints || 8,
      maxHitPoints: characterData.maxHitPoints || 8,
      exhaustion: 0,
      hitDice: {
        total: totalHitDice,
        used: 0,
        dieType: classData?.hit_die ? `d${classData.hit_die}` : "d8", // Use actual class hit die
      },
      hitDiceByClass: hitDiceByClass,
      weapons: [],
      weaponNotes: "",
      features: characterData.features || [], // Race-based features
      savingThrowProficiencies: savingThrowProficiencies as any, // Type assertion needed for passed data
      skills: skills,
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
      classFeatures: classFeatures.map(feature => ({
        id: `feature-${Date.now()}-${Math.random()}`,
        class_id: characterData.classId,
        level: feature.level,
        title: feature.name,
        description: feature.description,
        feature_type: 'class_feature',
        name: feature.name,
        source: feature.source,
        className: characterData.class
      })),
      toolsProficiencies: characterData.toolsProficiencies || [],
      feats: characterData.feats || [],
      equipment: characterData.equipment || "",
      magicItems: [],
      languages: characterData.languages || "",
      otherTools: "",
      money: characterData.money || {
        gold: 0,
        silver: 0,
        copper: 0,
      },
      equipmentProficiencies: characterData.equipmentProficiencies || {
        lightArmor: false,
        mediumArmor: false,
        heavyArmor: false,
        shields: false,
        simpleWeapons: false,
        martialWeapons: false,
        firearms: false,
        handCrossbows: false,
        longswords: false,
        rapiers: false,
        shortswords: false,
        scimitars: false,
        lightCrossbows: false,
        darts: false,
        slings: false,
        quarterstaffs: false,
      },
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
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
      }
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
        // Legacy Warlock columns have been dropped - using unified system only
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
        const finalCharacterId = characterId || newId
        
        // Reload character from database to ensure we have the latest data including backgroundData
        await reloadCharacterFromDatabase(finalCharacterId)
        
        // If a new UUID was generated, update the character's ID in local state
        if (characterId && characterId !== newId) {
          setActiveCharacterId(characterId)
          saveActiveCharacterToLocalStorage(characterId)
        } else {
          saveActiveCharacterToLocalStorage(newId)
        }
        
        // Get the campaign name for the toast message
        const addedCampaign = characterData.campaignId 
          ? campaigns.find(c => c.id === characterData.campaignId)
          : null
        
        // Show success toast
        toast({
          title: "Success",
          description: addedCampaign
            ? `${characterData.name} created and added to ${addedCampaign.name}!`
            : `${characterData.name} created successfully!`,
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

  const toggleDeathSave = (type: 'successes' | 'failures', index: number) => {
    if (!activeCharacter) return
    const current = activeCharacter.deathSaves ?? { successes: 0, failures: 0 }
    const currentCount = current[type]
    // If clicking a filled slot, remove it (and all after); if clicking an empty slot, fill up to it
    const newCount = index < currentCount ? index : index + 1
    const updatedDeathSaves = { ...current, [type]: Math.max(0, Math.min(3, newCount)) }
    updateCharacter({ deathSaves: updatedDeathSaves })
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

  // Warlock toggle functions

  // Legacy Warlock toggle functions have been removed - using unified system only

  const toggleSanctuaryVessel = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.sanctuaryVessel) return

    const sanctuaryVessel = activeCharacter.spellData.sanctuaryVessel
    const isAvailable = sanctuaryVessel.hoursRemaining > 0
    const newHoursRemaining = isAvailable ? sanctuaryVessel.hoursRemaining - 1 : sanctuaryVessel.hoursRemaining + 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      sanctuaryVessel: {
        ...sanctuaryVessel,
        hoursRemaining: Math.max(0, Math.min(sanctuaryVessel.maxHours, newHoursRemaining)),
      },
    }

    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleLimitedWish = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.limitedWish) return

    const limitedWish = activeCharacter.spellData.limitedWish
    const isAvailable = index < (limitedWish.usesPerLongRest - limitedWish.currentUses)
    const newCurrentUses = isAvailable ? limitedWish.currentUses + 1 : limitedWish.currentUses - 1

    const updatedSpellData = {
      ...activeCharacter.spellData,
      limitedWish: {
        ...limitedWish,
        currentUses: Math.max(0, Math.min(limitedWish.usesPerLongRest, newCurrentUses)),
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

  const handleEldritchCannonSave = (updates: Partial<CharacterData>) => {
    // Unified system only (legacy eldritchCannon column has been dropped)
    updateCharacter(updates)
    triggerAutoSave()
  }


  if (isInitialLoading || userLoading || !activeCharacter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon icon="lucide:refresh-cw" className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading character data...</p>
          <p className="text-sm text-muted-foreground">
            {userLoading ? "Loading user permissions..." : isInitialLoading ? "Connecting to database..." : "No characters available"}
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="h-screen bg-background flex flex-col">
      <AppHeader 
        currentView={appView}
        onViewChange={(view) => {
          setAppView(view)
          if (view === 'campaign') {
            setCurrentView('campaign')
          } else if (view === 'wiki') {
            // Wiki view doesn't need to set currentView
          } else {
            setCurrentView('management')
          }
        }}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        onCampaignSelect={(campaignId) => {
          setSelectedCampaignId(campaignId)
          if (campaignId !== "all" && campaignId !== "no-campaign") {
            setCurrentView('campaign')
          } else {
            setCurrentView('character')
            scrollToTop()
          }
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {appView === 'campaign' && (
          <CharacterSidebar
            characters={characters}
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            onCampaignChange={(id) => {
              setSelectedCampaignId(id)
              if (id !== "all" && id !== "no-campaign") {
                setCurrentView('campaign')
              } else {
                setCurrentView('character')
                // Scroll to top when switching to character view
                scrollToTop()
              }
            }}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={(id) => {
              setActiveCharacterIdWithStorage(id)
              setCurrentView('character')
              // Scroll to top when opening a character sheet
              scrollToTop()
            }}
            onCreateCharacter={createNewCharacter}
            onStartLongRest={handleStartLongRest}
            onOpenDiceRoll={handleOpenDiceRoll}
            onOpenManagement={() => setCurrentView('management')}
            onOpenSpellLibrary={handleOpenSpellLibrary}
            currentUserId={currentUser?.id}
            currentView={currentView}
            onViewChange={setCurrentView}
            canEdit={currentUserProfile?.permissionLevel !== 'viewer'}
          />
        )}

        <main ref={mainRef} className={`flex-1 ${appView !== 'management' && appView !== 'wiki' ? 'p-6' : ''} relative ${currentView === 'character' && !canViewActiveCharacter ? 'overflow-hidden' : 'overflow-auto'}`}>
          {appView === 'wiki' ? (
            <WikiPage />
          ) : appView === 'management' ? (
            <ManagementInterface
              campaigns={campaigns}
              characters={characters}
              users={users}
              onCreateCampaign={handleCreateCampaign}
              onUpdateCampaign={handleUpdateCampaign}
              onDeleteCampaign={(campaign) => handleDeleteCampaign(campaign.id)}
              onAssignCharacterToCampaign={handleAssignCharacterToCampaign}
              onRemoveCharacterFromCampaign={(characterId) => handleRemoveCharacterFromCampaign(characterId, selectedCampaignId)}
              onSetActiveCampaign={handleSetActiveCampaign}
            />
          ) : currentView === 'character' ? (
            <>
              {/* Breadcrumbs */}
              <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
                <button
                  onClick={() => setCurrentView('campaign')}
                  className="hover:text-primary transition-colors hover:cursor-pointer"
                >
                  {currentCampaign?.name || 'Campaign'}
                </button>
                <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                <span className="text-muted-foreground">
                  {activeCharacter.isNPC ? `NPC: ${activeCharacter.name}` : `Character: ${activeCharacter.name}`}
                </span>
              </div>
              
              <div className={!canViewActiveCharacter ? 'blur-sm pointer-events-none' : ''}>
                <div className="mb-6 rounded-lg border rounded-lg flex flex-col gap-0 overflow-hidden">
                  <AestheticImages character={activeCharacter} />
                  <CharacterHeader
                    character={activeCharacter}
                    proficiencyBonus={proficiencyBonus}
                    onEdit={() => setBasicInfoModalOpen(true)}
                    onOpenBiography={() => setCharacterDetailsContentModalOpen(true)}
                    onOpenPortrait={() => setPortraitModalOpen(true)}
                    onLevelUp={() => setLevelUpModalOpen(true)}
                    canEdit={canEditActiveCharacter}
                    levelUpEnabled={currentCampaign?.levelUpModeEnabled || false}
                    campaign={currentCampaign}
                  />
                </div>
                
                {/* Migration Button - only show if character needs migration */}
{/*                 <div className="mb-4">
                  <FeatureUsageMigrationModal
                    characters={[activeCharacter]}
                    onCharacterUpdate={async (character) => updateCharacter(character)}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Icon icon="lucide:database" className="w-4 h-4 mr-2" />
                        Migrate Feature Usage
                      </Button>
                    }
                  />
                </div> */}

                {/* Recalculate Max Uses Button - Superadmin only */}
                {/* {isUserSuperadmin && (
                  <div className="mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={recalculateAllCharactersMaxUses}
                    >
                      <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                      Recalculate Max Uses
                    </Button>
                  </div>
                )} */}
              </div>

              <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 ${!canViewActiveCharacter ? 'blur-sm pointer-events-none' : ''}`}>
            {/* COLUMN 1: Abilities, Skills, Features, Equipment, Languages */}
            <div className="space-y-6">
              <AbilityScores
                character={activeCharacter}
                strengthMod={strengthMod}
                dexterityMod={dexterityMod}
                constitutionMod={constitutionMod}
                intelligenceMod={intelligenceMod}
                wisdomMod={wisdomMod}
                charismaMod={charismaMod}
                onEdit={() => setAbilitiesModalOpen(true)}
                canEdit={canEditActiveCharacter}
              />

              <SavingThrows
                character={activeCharacter}
                proficiencyBonus={proficiencyBonus}
                onUpdateSavingThrows={(savingThrowProficiencies) => updateCharacter({ savingThrowProficiencies })}
                onTriggerAutoSave={triggerAutoSave}
                canEdit={canEditActiveCharacter}
              />

              <Skills
                character={activeCharacter}
                proficiencyBonus={proficiencyBonus}
                skillSortMode={skillSortMode}
                onSetSkillSortMode={setSkillSortMode}
                onUpdateSkillProficiency={updateSkillProficiency}
                canEdit={canEditActiveCharacter}
              />

              <FeaturesTraits
                character={activeCharacter}
                onEdit={() => setFeaturesModalOpen(true)}
                onToggleFeatureUse={toggleFeatureUse}
                onOpenFeatureModal={(content) => {
                  setFeatureModalContent(content)
                  setFeatureModalIsClassFeature(false)
                  setFeatureModalOpen(true)
                }}
                canEdit={canEditActiveCharacter}
              />

              <Feats
                character={activeCharacter}
                onEdit={() => setFeatsModalOpen(true)}
                onOpenFeatureModal={(content) => {
                  setFeatureModalContent(content)
                  setFeatureModalIsClassFeature(false)
                  setFeatureModalOpen(true)
                }}
                canEdit={canEditActiveCharacter}
              />

              <Money
                character={activeCharacter}
                onEdit={() => setMoneyModalOpen(true)}
                canEdit={canEditActiveCharacter}
              />

              <Languages
                character={activeCharacter}
                onEdit={() => setLanguagesModalOpen(true)}
                canEdit={canEditActiveCharacter}
              />

          </div>

          {/* COLUMN 2: Combat, Weapons, Spells, Tools Proficiencies */}
          <div className="space-y-6 flex flex-col gap-1">
            <CombatStats
              character={activeCharacter}
              onEdit={() => setCombatModalOpen(true)}
              onToggleHitDie={toggleHitDie}
              onToggleDeathSave={toggleDeathSave}
              canEdit={canEditActiveCharacter}
            />

            <Weapons
              character={activeCharacter}
              onEdit={() => setWeaponsModalOpen(true)}
              canEdit={canEditActiveCharacter}
            />

            <EldritchCannonComponent
              character={activeCharacter}
              onEdit={() => setEldritchCannonModalOpen(true)}
              onUpdateFeatureUsage={updateFeatureUsage}
              canEdit={canEditActiveCharacter}
            />

            <Spellcasting
              key={`spellcasting-${activeCharacter.id}`}
              character={activeCharacter}
              strengthMod={strengthMod}
              dexterityMod={dexterityMod}
              constitutionMod={constitutionMod}
              intelligenceMod={intelligenceMod}
              wisdomMod={wisdomMod}
              charismaMod={charismaMod}
              proficiencyBonus={proficiencyBonus}
              onEdit={() => setSpellModalOpen(true)}
              onOpenSpellList={() => setSpellListModalOpen(true)}
              onToggleSpellSlot={toggleSpellSlot}
              onToggleFeatSpellSlot={toggleFeatSpellSlot}
              hasSpellcastingAbilities={hasSpellcastingAbilities}
              onUpdateFeatureUsage={updateFeatureUsage}
              canEdit={canEditActiveCharacter}
            />

            <ToolsProficiencies
              character={activeCharacter}
              onEdit={() => setEquipmentModalOpen(true)}
              onUpdateEquipmentProficiencies={(equipmentProficiencies) => updateCharacter({ equipmentProficiencies })}
              onUpdateToolProficiency={updateToolProficiency}
              onToggleMagicItemUse={toggleMagicItemUse}
              onOpenFeatureModal={(content) => {
                setFeatureModalContent(content)
                setFeatureModalOpen(true)
              }}
              onTriggerAutoSave={triggerAutoSave}
              canEdit={canEditActiveCharacter}
            />

          </div>

          {/* COLUMN 3: Class Features, Feats */}
          <div className="space-y-6 flex flex-col gap-1">
            <ClassFeatures
              character={activeCharacter}
              onOpenFeatureModal={(content) => {
                setFeatureModalContent(content)
                setFeatureModalIsClassFeature(true)
                setFeatureModalOpen(true)
              }}
              onRefreshFeatures={async () => {
                // Refresh logic is handled in the component
              }}
              onUpdateFeatureUsage={updateFeatureUsage}
              canEdit={canEditActiveCharacter}
            />

            <Infusions
              character={activeCharacter}
              onEdit={() => setInfusionsModalOpen(true)}
              onOpenFeatureModal={(content) => {
                setFeatureModalContent(content)
                setFeatureModalOpen(true)
              }}
              onUpdateFeatureUsage={updateFeatureUsage}
              canEdit={canEditActiveCharacter}
            />

            <EldritchInvocations
              character={activeCharacter}
              onEdit={() => setEldritchInvocationsModalOpen(true)}
              onOpenFeatureModal={(content) => {
                setFeatureModalContent(content)
                setFeatureModalOpen(true)
              }}
              canEdit={canEditActiveCharacter}
            />

            <Metamagic
              character={activeCharacter}
              onEdit={() => setMetamagicModalOpen(true)}
              onOpenFeatureModal={(content) => {
                setFeatureModalContent(content)
                setFeatureModalOpen(true)
              }}
              canEdit={canEditActiveCharacter}
            />
          </div>

            </div>
          </>
          ) : (
            <CampaignHomepage
              campaign={currentCampaign}
              characters={characters}
              users={users}
              resources={resources}
              links={links}
              onSelectCharacter={(id) => {
                setActiveCharacterId(id)
                setCurrentView('character')
                // Scroll to top when opening a character sheet
                scrollToTop()
              }}
              onBackToCharacters={() => {
                setCurrentView('character')
                // Scroll to top when going back to characters
                scrollToTop()
              }}
              onEditCampaign={handleEditCampaign}
              onCreateCharacter={createNewCharacter}
              currentUserId={currentUser?.id}
              onStartLongRest={handleStartLongRest}
              onToggleLevelUpMode={handleToggleLevelUpMode}
              levelUpModeEnabled={currentCampaign?.levelUpModeEnabled || false}
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

          {/* Access Denied Overlay - positioned relative to main content area */}
          <AccessDeniedOverlay
            isVisible={(() => {
              const isVisible = currentView === 'character' && activeCharacter && !canViewActiveCharacter
              return isVisible
            })()}
            currentUserProfile={currentUserProfile}
            character={activeCharacter}
            onSuperadminAccess={() => {
              setSuperadminOverride(true)
              // Force a re-render to see the state change
              setTimeout(() => {
              }, 100)
            }}
          />

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
        canEdit={canEditActiveCharacter}
      />
      <CharacterDetailsContentModal
        isOpen={characterDetailsContentModalOpen}
        onClose={() => setCharacterDetailsContentModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
        canEdit={canEditActiveCharacter}
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
      <MoneyModal
        isOpen={moneyModalOpen}
        onClose={() => setMoneyModalOpen(false)}
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
        canEdit={canEditActiveCharacter}
      />
      <CharacterCreationModal
        isOpen={characterCreationModalOpen}
        onClose={() => setCharacterCreationModalOpen(false)}
        onCreateCharacter={handleCreateCharacter}
        currentUserId={currentUser?.id}
        dungeonMasterId={currentCampaign?.dungeonMasterId}
        campaignId={currentCampaign?.id}
      />
      <Dialog open={featureModalOpen} onOpenChange={(open) => {
        setFeatureModalOpen(open)
        if (!open) {
          setFeatureNotesModalOpen(false)
        }
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
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
          <div className="flex flex-col gap-4 overflow-y-auto p-4 max-h-[50vh]">
            {featureModalContent && (
              <>
                {/* Render custom notes (image + text) ABOVE the base description — only for class features */}
                {featureModalIsClassFeature && (() => {
                  const key = featureModalContent.title ?? ""
                  const note = activeCharacter.featureNotes?.[key]
                  const hasImage = Boolean(note?.imageUrl)
                  const hasContent = Boolean(note?.content)
                  return (
                    <div className="flex flex-col gap-4">
                      {hasImage && (
                        <img
                          src={note!.imageUrl as string}
                          alt="Feature illustration"
                          className="max-h-32 object-contain rounded"
                        />
                      )}
                      {hasContent ? (
                        <div className="rounded-lg w-full border text-sm p-3 bg-card col-span-2 flex flex-col gap-3">
                          <div className="text-md font-semibold flex items-center gap-1"><Icon icon="lucide:notebook-pen" className="w-4 h-4" />Custom notes</div>
                          <RichTextDisplay content={note!.content as string} className="text-sm font-mono" />
                        </div>
                      ) : (
                        <div className="rounded-lg w-full border text-sm font-mono text-muted-foreground p-3 bg-card col-span-2">
                          No custom notes yet. Click "Edit custom notes" to add your own text or an image.
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Base description from class data */}
                <div className="flex flex-col gap-2">
                  <div className="text-md font-medium">Description</div>
                  <RichTextDisplay content={featureModalContent.description} className="text-sm text-muted-foreground" />
                </div>
              </>
            )}
          </div>

          {/* Footer (fixed above scroll, only for class features) */}
          {featureModalContent && featureModalIsClassFeature && canEditActiveCharacter && (
            <div className="p-4 bg-card border-t flex items-center justify-end gap-2">
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
                <Icon icon="lucide:notebook-pen" className="w-4 h-4" />Edit custom notes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom Notes Editor Modal */}
      <Dialog open={featureNotesModalOpen} onOpenChange={setFeatureNotesModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">Edit custom notes</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-4 overflow-y-auto p-4 max-h-[50vh]">
              <RichTextEditor
                value={featureNotesDraft}
                onChange={(value) => canEditActiveCharacter && setFeatureNotesDraft(value)}
              />
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground">Image URL (optional)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={featureImageDraft}
                      onChange={(e) => canEditActiveCharacter && setFeatureImageDraft(e.target.value)}
                      disabled={!canEditActiveCharacter}
                      className="flex-1 p-2 text-sm border rounded bg-card"
                      placeholder="https://... or upload an image"
                    />
                    <input
                      ref={featureImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFeatureImageFileChange}
                      className="hidden"
                      id="featureImageFileInput"
                      disabled={!canEditActiveCharacter}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => featureImageInputRef.current?.click()}
                      disabled={uploadingFeatureImage || !canEditActiveCharacter}
                      className="h-[38px] whitespace-nowrap"
                    >
                      {uploadingFeatureImage ? (
                        <>
                          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:upload" className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                  {featureImageDraft && (
                    <div className="relative w-full h-32 border rounded-md overflow-hidden bg-muted">
                      <img
                        src={featureImageDraft}
                        alt="Feature image preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
          </div>
          {canEditActiveCharacter && (
            <div className="p-4 bg-card border-t flex items-center justify-end gap-2">
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
          )}
        </DialogContent>
      </Dialog>

      {/* Portrait Modal */}
      <Dialog open={portraitModalOpen} onOpenChange={setPortraitModalOpen}>
        <DialogContent className="relative w-auto sm:max-w-none w-fit h-fit max-w-[50vw] max-h-[50vh] top-[-50vh] p-2">
          <DialogClose className="absolute right-4 top-4 z-50 bg-card border border-border rounded shadow px-2 py-2 text-sm">
            <Icon icon="lucide:x" className="w-4 h-4" />
          </DialogClose>
          <div className="flex items-center justify-center">
            {activeCharacter.imageUrl && (
              <img
                src={activeCharacter.imageUrl}
                alt={activeCharacter.name}
                className="max-h-[48vh] max-w-[48vw] object-contain rounded"
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

      {/* Metamagic Modal */}
      <MetamagicModal
        isOpen={metamagicModalOpen}
        onClose={() => setMetamagicModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={diceRollModalOpen}
        onClose={() => setDiceRollModalOpen(false)}
        character={activeCharacter}
        onUpdateHP={handleUpdateHP}
        canEdit={canEditActiveCharacter}
      />

      {/* Campaign Management Modal */}
      <CampaignManagementModal
        isOpen={campaignManagementModalOpen}
        onClose={() => setCampaignManagementModalOpen(false)}
        campaigns={campaigns}
        characters={characters}
        users={users}
        onCreateCampaign={handleCreateCampaign}
        onUpdateCampaign={handleUpdateCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        onAssignCharacterToCampaign={handleAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={handleRemoveCharacterFromCampaign}
        onConvertToNPC={handleConvertToNPC}
        onConvertFromNPC={handleConvertFromNPC}
        onSetActiveCampaign={handleSetActiveCampaign}
      />

      {/* Campaign Creation/Edit Modal */}
      <CampaignCreationModal
        isOpen={campaignCreationModalOpen}
        onClose={() => {
          setCampaignCreationModalOpen(false)
          setEditingCampaign(null)
        }}
        onSave={handleEditCampaignSave}
        editingCampaign={editingCampaign}
        characters={characters}
        users={users}
        onAssignCharacterToCampaign={handleAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={handleRemoveCharacterFromCampaign}
        onConvertToNPC={handleConvertToNPC}
        onConvertFromNPC={handleConvertFromNPC}
      />

      {/* Spell Library Modal */}
      <SpellLibraryModal
        ref={spellLibraryRef}
        isOpen={spellLibraryModalOpen}
        onClose={() => setSpellLibraryModalOpen(false)}
        character={activeCharacter}
        characters={characters}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        currentUserId={currentUser?.id}
        isSuperadmin={isUserSuperadmin}
        onAddSpell={handleAddSpell}
        onCreateNewSpell={() => setSpellCreationModalOpen(true)}
        canEdit={currentUserProfile?.permissionLevel !== 'viewer'}
      />

      {/* Spell Creation Modal */}
      <SpellCreationModal
        isOpen={spellCreationModalOpen}
        onClose={() => setSpellCreationModalOpen(false)}
        character={activeCharacter}
        characters={characters}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        currentUserId={currentUser?.id}
        isSuperadmin={isUserSuperadmin}
        onSave={async (spell, classes, characterId) => {
          try {
            // First, save to library via API
            const response = await fetch('/api/spells', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spell,
                classes
              })
            })

            if (response.ok) {
              // Then add to character's spell list
              handleAddSpell(spell, characterId)
              
              // Refresh the spell library to show the new spell
              if (spellLibraryRef.current) {
                spellLibraryRef.current.refreshLibrary()
              }
              
              toast({
                title: "Spell Created",
                description: `${spell.name} has been added to the spell library and character's spell list.`,
              })
            } else {
              const errorData = await response.json().catch(() => ({}))
              toast({
                title: "Failed to Create Spell",
                description: errorData.error || "An error occurred while creating the spell.",
                variant: "destructive",
              })
            }
          } catch (error) {
            console.error('Error creating spell:', error)
            toast({
              title: "Error",
              description: "An unexpected error occurred while creating the spell.",
              variant: "destructive",
            })
          }
          setSpellCreationModalOpen(false)
        }}
        onSaveToLibraryOnly={async (spell, classes) => {
          try {
            // Save to library via API
            const response = await fetch('/api/spells', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                spell,
                classes
              })
            })

            if (response.ok) {
              // Refresh the spell library to show the new spell
              if (spellLibraryRef.current) {
                spellLibraryRef.current.refreshLibrary()
              }
              
              toast({
                title: "Spell Created",
                description: `${spell.name} has been added to the spell library.`,
              })
            } else {
              const errorData = await response.json().catch(() => ({}))
              toast({
                title: "Failed to Create Spell",
                description: errorData.error || "An error occurred while creating the spell.",
                variant: "destructive",
              })
            }
          } catch (error) {
            console.error('Error creating spell:', error)
            toast({
              title: "Error",
              description: "An unexpected error occurred while creating the spell.",
              variant: "destructive",
            })
          }
          setSpellCreationModalOpen(false)
        }}
      />

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={levelUpModalOpen}
        onClose={() => setLevelUpModalOpen(false)}
        character={activeCharacter}
        onSave={(updates) => {
          updateCharacter({ ...updates, levelUpCompleted: true })
        }}
      />
      </div>
    </div>
  )
}

export default function CharacterSheet() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CharacterSheetContent />
    </Suspense>
  )
}
