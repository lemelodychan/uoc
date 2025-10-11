"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import { CharacterSidebar } from "@/components/character-sidebar"
import { BasicInfoModal } from "@/components/edit-modals/basic-info-modal"
import { AbilitiesModal } from "@/components/edit-modals/abilities-modal"
import { CombatModal } from "@/components/edit-modals/combat-modal"
import { WeaponsModal } from "@/components/edit-modals/weapons-modal"
import { FeaturesModal } from "@/components/edit-modals/features-modal"
import { EquipmentModal } from "@/components/edit-modals/equipment-modal"
import { LanguagesModal } from "@/components/edit-modals/languages-modal"
import { ToolsModal } from "@/components/edit-modals/tools-modal"
import { FeatsModal } from "@/components/edit-modals/feats-modal"
import { SpellModal } from "@/components/edit-modals/spell-modal"
import { CharacterDetailsModal } from "@/components/edit-modals/character-details-modal"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { useToast } from "@/hooks/use-toast"
import {
  sampleCharacters,
  calculateModifier,
  calculateSkillBonus,
  calculateToolBonus,
  calculateProficiencyBonus,
  type CharacterData,
} from "@/lib/character-data"
import { saveCharacter, loadAllCharacters, testConnection } from "@/lib/database"
import {
  calculateSpellSlotsFromClass,
  getCantripsKnownFromClass,
  getSpellsKnownFromClass,
  getBardicInspirationFromClass,
  fetchClassData,
  fetchClassDataById,
  testClassesTableAccess, // Added missing import for fetchClassDataById and testClassesTableAccess
} from "../lib/spell-slot-calculator"

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export default function CharacterSheet() {
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [activeCharacterId, setActiveCharacterId] = useState<string>("")
  const [basicInfoModalOpen, setBasicInfoModalOpen] = useState(false)
  const [abilitiesModalOpen, setAbilitiesModalOpen] = useState(false)
  const [combatModalOpen, setCombatModalOpen] = useState(false)
  const [weaponsModalOpen, setWeaponsModalOpen] = useState(false)
  const [featuresModalOpen, setFeaturesModalOpen] = useState(false)
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
  const [languagesModalOpen, setLanguagesModalOpen] = useState(false)
  const [toolsModalOpen, setToolsModalOpen] = useState(false)
  const [featsModalOpen, setFeatsModalOpen] = useState(false)
  const [spellModalOpen, setSpellModalOpen] = useState(false)
  const [characterDetailsModalOpen, setCharacterDetailsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [dbConnected, setDbConnected] = useState<boolean | null>(null)

  const { toast } = useToast()

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateSpellSlotsRef = useRef<string | null>(null)

  const activeCharacter = characters.find((c) => c.id === activeCharacterId) || characters[0]
  

  const debouncedAutoSave = useCallback(async () => {
    console.log("[v0] debouncedAutoSave called - characters length:", characters.length, "activeCharacterId:", activeCharacterId)
    
    if (!dbConnected || !activeCharacterId) {
      console.log("[v0] Skipping auto-save - database not connected or no active character ID")
      return
    }

    // Get the current character from state at the time of execution
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) {
      console.log("[v0] Skipping auto-save - character not found")
      return
    }

    console.log("[v0] Auto-saving character...")
    console.log("[v0] Character spell data being saved:", currentCharacter.spellData)
    console.log("[v0] Characters array at save time:", characters.map(c => ({ id: c.id, name: c.name, spellAttackBonus: c.spellData?.spellAttackBonus })))
    console.log("[v0] Creating saving toast...")
    const savingToast = toast({
      title: "Saving...",
      description: "Auto-saving your character changes",
    })
    console.log("[v0] Saving toast created with ID:", savingToast.id)

    try {
      const { success, error, characterId } = await saveCharacter(currentCharacter)
      if (success) {
        // If a new UUID was generated, update the character's ID in local state
        if (characterId && characterId !== currentCharacter.id) {
          updateCharacter({ id: characterId })
          setActiveCharacterId(characterId)
        }
        console.log("[v0] Auto-save successful")
        console.log("[v0] Updating toast to success state...")
        savingToast.update({
          id: savingToast.id,
          title: "Saved!",
          description: "Character changes saved successfully",
        })
        setTimeout(() => {
          console.log("[v0] Dismissing success toast...")
          savingToast.dismiss()
        }, 2000)
      } else {
        console.error("[v0] Auto-save failed:", error)
        console.log("[v0] Updating toast to error state...")
        savingToast.update({
          id: savingToast.id,
          title: "Save failed",
          description: error || "Failed to save character changes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Auto-save error:", error)
      console.log("[v0] Updating toast to error state...")
      savingToast.update({
        id: savingToast.id,
        title: "Save failed",
        description: "An error occurred while saving",
        variant: "destructive",
      })
    }
  }, [characters, activeCharacterId, dbConnected, toast])

  const triggerAutoSave = useCallback(() => {
    console.log("[v0] Auto-save triggered")
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      console.log("[v0] Cleared previous auto-save timeout")
    }

    // Set new timeout for 1 second delay
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log("[v0] Auto-save timeout reached, executing save...")
      debouncedAutoSave()
    }, 1000)
    console.log("[v0] Auto-save scheduled for 1 second")
  }, [debouncedAutoSave])

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

  useEffect(() => {
    console.log("[v0] useEffect running - checking conditions:", {
      hasActiveCharacter: !!activeCharacter,
      hasActiveCharacterId: !!activeCharacterId,
      hasCharacterId: !!(activeCharacter?.id),
      hasClass: !!(activeCharacter?.class_id || activeCharacter?.class),
      characterName: activeCharacter?.name,
      characterClass: activeCharacter?.class,
      characterClassId: activeCharacter?.class_id
    })
    
    if (activeCharacter && activeCharacterId && activeCharacter.id && (activeCharacter.class_id || activeCharacter.class)) {
      console.log("[v0] useEffect triggered - updating spell slots from class for character:", activeCharacter.name, "ID:", activeCharacter.id)
      // Add a small delay to ensure character data is fully loaded
      const timeoutId = setTimeout(() => {
        updateSpellSlotsFromClass()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    } else {
      console.log("[v0] useEffect skipped - conditions not met")
    }
  }, [activeCharacterId, activeCharacter?.id, activeCharacter?.class_id, activeCharacter?.class, activeCharacter?.level]) // Trigger when active character changes

  const loadFromDatabaseFirst = async () => {
    setIsInitialLoading(true)
    console.log("[v0] Attempting to load from database first...")

    // Test connection first
    const { success, error } = await testConnection()
    setDbConnected(success)

    if (success) {
      console.log("[v0] Database connected, loading characters...")
      await testClassesTableAccess()

      try {
        const { characters: dbCharacters, error: loadError } = await loadAllCharacters()
        if (loadError) {
          console.error("Failed to load characters:", loadError)
          console.log("[v0] Falling back to sample data due to load error")
          setCharacters(sampleCharacters)
          setActiveCharacterId("1")
          toast({
            title: "Database Error",
            description: "Failed to load characters from database. Using sample data.",
            variant: "destructive",
          })
        } else if (dbCharacters && dbCharacters.length > 0) {
          console.log("[v0] Successfully loaded characters from database")
          console.log("[v0] Loaded characters with IDs:", dbCharacters.map(c => ({ id: c.id, name: c.name })))
          setCharacters(dbCharacters)

          const savedActiveCharacterId = loadActiveCharacterFromLocalStorage()
          const validCharacterId =
            savedActiveCharacterId && dbCharacters.find((c) => c.id === savedActiveCharacterId)
              ? savedActiveCharacterId
              : dbCharacters[0].id

          console.log("[v0] Setting active character ID to:", validCharacterId)
          setActiveCharacterId(validCharacterId)
          saveActiveCharacterToLocalStorage(validCharacterId)

          // Update spell slots for the active character
          setTimeout(() => {
            const activeChar = dbCharacters.find((c) => c.id === validCharacterId)
            if (activeChar?.class_id) {
              updateSpellSlotsFromClass()
            }
          }, 100)
          toast({
            title: "Success",
            description: `Loaded ${dbCharacters.length} character(s) from database.`,
          })
        } else {
          console.log("[v0] No characters found in database, using sample data")
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
      console.log("[v0] Database connection failed, using sample data")
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
      if (error) {
        console.error("Failed to load characters:", error)
        toast({
          title: "Error",
          description: "Failed to reload characters from database.",
          variant: "destructive",
        })
      } else if (dbCharacters && dbCharacters.length > 0) {
        setCharacters(dbCharacters)
        const savedActiveCharacterId = loadActiveCharacterFromLocalStorage()
        const validCharacterId =
          savedActiveCharacterId && dbCharacters.find((c) => c.id === savedActiveCharacterId)
            ? savedActiveCharacterId
            : dbCharacters[0].id

        setActiveCharacterId(validCharacterId)
        saveActiveCharacterToLocalStorage(validCharacterId)

        setTimeout(() => {
          const activeChar = dbCharacters.find((c) => c.id === validCharacterId)
          if (activeChar?.class_id) {
            updateSpellSlotsFromClass()
          }
        }, 100)
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
        if (characterId && characterId !== currentCharacter.id) {
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

  const updateCharacter = (updates: Partial<CharacterData>) => {
    console.log("[v0] updateCharacter called with updates:", updates)
    console.log("[v0] Characters array before state update:", characters.map(c => ({ id: c.id, name: c.name, spellAttackBonus: c.spellData?.spellAttackBonus })))
    
    setCharacters((prev) => {
      const updated = prev.map((char) => (char.id === activeCharacterId ? { ...char, ...updates } : char))
      console.log("[v0] Characters array after state update:", updated.map(c => ({ id: c.id, name: c.name, spellAttackBonus: c.spellData?.spellAttackBonus })))
      return updated
    })
    triggerAutoSave()
  }

  const updateSpellData = (spellDataUpdates: Partial<SpellData>) => {
    if (!activeCharacterId) return
    
    // Get the current character from state
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) return
    
    console.log("[v0] updateSpellData called with:", spellDataUpdates)
    console.log("[v0] Current character spell data before update:", currentCharacter.spellData)
    console.log("[v0] Characters array before update:", characters.map(c => ({ id: c.id, name: c.name, spellAttackBonus: c.spellData?.spellAttackBonus })))
    
    // Merge spell data updates while preserving existing spell slots
    const updatedSpellData = {
      ...currentCharacter.spellData,
      ...spellDataUpdates,
      // Preserve spell slots from class data
      spellSlots: currentCharacter.spellData.spellSlots,
    }
    
    console.log("[v0] Updated spell data:", updatedSpellData)
    
    updateCharacter({ spellData: updatedSpellData })
  }

  const updateBasicInfo = (updates: Partial<CharacterData>) => {
    updateCharacter(updates)
    
    // If class or level changed, update spell slots
    if (updates.class || updates.level || updates.class_id) {
      setTimeout(() => {
        updateSpellSlotsFromClass()
      }, 100)
    }
  }

  const updateSkillProficiency = (skillName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => {
    if (!activeCharacterId) return
    
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    if (!currentCharacter) return

    const updatedSkills = currentCharacter.skills.map((skill) => {
      if (skill.name === skillName) {
        if (proficiencyType === "proficient") {
          if (checked) {
            // If proficient is checked and expertise was already on, keep expertise
            return { ...skill, proficiency: skill.proficiency === "expertise" ? "expertise" : "proficient" }
          } else {
            // If proficient is unchecked, remove proficiency (but keep expertise if it was on)
            return { ...skill, proficiency: skill.proficiency === "expertise" ? "expertise" : "none" }
          }
        } else {
          // expertise
          if (checked) {
            // If expertise is checked, set to expertise (proficient is implied)
            return { ...skill, proficiency: "expertise" }
          } else {
            // If expertise is unchecked, set to proficient if it was on, otherwise none
            return { ...skill, proficiency: skill.proficiency !== "none" ? "proficient" : "none" }
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

    const updatedTools = currentCharacter.toolsProficiencies.map((tool) => {
      if (tool.name === toolName) {
        if (proficiencyType === "proficient") {
          if (checked) {
            // If proficient is checked and expertise was already on, keep expertise
            return { ...tool, proficiency: tool.proficiency === "expertise" ? "expertise" : "proficient" }
          } else {
            // If proficient is unchecked, remove proficiency (but keep expertise if it was on)
            return { ...tool, proficiency: tool.proficiency === "expertise" ? "expertise" : "none" }
          }
        } else {
          // expertise
          if (checked) {
            // If expertise is checked, set to expertise (proficient is implied)
            return { ...tool, proficiency: "expertise" }
          } else {
            // If expertise is unchecked, set to proficient if it was on, otherwise none
            return { ...tool, proficiency: tool.proficiency !== "none" ? "proficient" : "none" }
          }
        }
      }
      return tool
    })
    updateCharacter({ toolsProficiencies: updatedTools })
    triggerAutoSave()
  }

  const createNewCharacter = () => {
    const newId = (characters.length + 1).toString()
    const newCharacter: CharacterData = {
      id: newId,
      name: "New Character",
      class: "Fighter",
      level: 1,
      background: "Folk Hero",
      race: "Human",
      alignment: "Neutral",
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
      weapons: [],
      weaponNotes: "",
      features: [],
      skills: [],
      spellData: {
        spellAttackBonus: 0,
        spellSaveDC: 8,
        cantripsKnown: 0,
        spellsKnown: 0,
        spellSlots: [],
        spellNotes: "",
        bardicInspirationSlot: null,
        songOfRest: null,
        featSpellSlots: [],
      },
      classFeatures: [],
      toolsProficiencies: [],
      feats: [],
      equipment: "",
      languages: "",
      otherTools: "",
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      backstory: "",
      notes: "",
      bardicInspirationUsed: 0,
    }
    setCharacters((prev) => [...prev, newCharacter])
    setActiveCharacterId(newId)
    
    // Update spell slots for the new character after a short delay
    setTimeout(() => {
      updateSpellSlotsFromClass()
    }, 100)
  }

  const strengthMod = activeCharacter ? calculateModifier(activeCharacter.strength) : 0
  const dexterityMod = activeCharacter ? calculateModifier(activeCharacter.dexterity) : 0
  const constitutionMod = activeCharacter ? calculateModifier(activeCharacter.constitution) : 0
  const intelligenceMod = activeCharacter ? calculateModifier(activeCharacter.intelligence) : 0
  const wisdomMod = activeCharacter ? calculateModifier(activeCharacter.wisdom) : 0
  const charismaMod = activeCharacter ? calculateModifier(activeCharacter.charisma) : 0

  const proficiencyBonus = activeCharacter ? calculateProficiencyBonus(activeCharacter.level) : 0

  const perceptionSkill = activeCharacter?.skills.find((skill) => skill.name === "Perception")
  const insightSkill = activeCharacter?.skills.find((skill) => skill.name === "Insight")

  const passivePerception =
    10 + (perceptionSkill && activeCharacter ? calculateSkillBonus(activeCharacter, perceptionSkill) : wisdomMod)
  const passiveInsight =
    10 + (insightSkill && activeCharacter ? calculateSkillBonus(activeCharacter, insightSkill) : wisdomMod)

  const toggleSpellSlot = (level: number, slotIndex: number) => {
    if (!activeCharacter) return

    const updatedSpellData = {
      ...activeCharacter.spellData,
      spellSlots: activeCharacter.spellData.spellSlots.map((slot) => {
        if (slot.level === level) {
          const newUsed = slotIndex < slot.used ? slot.used - 1 : slot.used + 1
          return { ...slot, used: Math.max(0, Math.min(slot.total, newUsed)) }
        }
        return slot
      }),
    }
    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleFeatSpellSlot = (featIndex: number) => {
    if (!activeCharacter) return

    const updatedSpellData = {
      ...activeCharacter.spellData,
      featSpellSlots: activeCharacter.spellData.featSpellSlots.map((feat, index) => {
        if (index === featIndex) {
          const newUses = feat.currentUses > 0 ? feat.currentUses - 1 : feat.usesPerLongRest
          return { ...feat, currentUses: newUses }
        }
        return feat
      }),
    }
    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const toggleBardicInspiration = (index: number) => {
    if (!activeCharacter || !activeCharacter.spellData.bardicInspirationSlot) return

    const bardicSlot = activeCharacter.spellData.bardicInspirationSlot
    const usedCount = bardicSlot.usesPerRest - bardicSlot.currentUses
    
    // Toggle the specific checkbox
    let newUsedCount
    if (index >= usedCount) {
      // Clicking an available slot (purple/checked) - consume it
      newUsedCount = usedCount + 1
    } else {
      // Clicking a used slot (white/unchecked) - restore it
      newUsedCount = usedCount - 1
    }
    
    // Clamp to valid range
    newUsedCount = Math.max(0, Math.min(bardicSlot.usesPerRest, newUsedCount))
    const newCurrentUses = bardicSlot.usesPerRest - newUsedCount

    const updatedSpellData = {
      ...activeCharacter.spellData,
      bardicInspirationSlot: {
        ...bardicSlot,
        currentUses: newCurrentUses,
      },
    }
    updateCharacter({ spellData: updatedSpellData })
    triggerAutoSave()
  }

  const updateSpellSlotsFromClass = async () => {
    // Guard against empty characters array (React StrictMode issue)
    if (characters.length === 0) {
      console.log("[v0] Skipping spell slot update - characters array is empty")
      return
    }
    
    // Capture the character data at the start to avoid race conditions
    const currentCharacter = characters.find((c) => c.id === activeCharacterId)
    
    console.log("[v0] updateSpellSlotsFromClass - characters array:", characters.length, "activeCharacterId:", activeCharacterId, "found character:", currentCharacter?.name)
    
    if (!currentCharacter || !currentCharacter.id) {
      console.log("[v0] No active character or character ID available for spell slot update - characters:", characters.length, "activeCharacterId:", activeCharacterId)
      return
    }
    
    // Prevent multiple simultaneous executions for the same character
    const executionKey = `${currentCharacter.id}-${currentCharacter.level}-${currentCharacter.class_id}`
    if (updateSpellSlotsRef.current === executionKey) {
      console.log("[v0] Skipping spell slot update - already in progress for this character")
      return
    }
    
    // Set flag to prevent multiple executions
    updateSpellSlotsRef.current = executionKey
    
    try {
      console.log("[v0] Updating spell slots for character:", {
        class_id: currentCharacter.class_id,
        class: currentCharacter.class,
        subclass: currentCharacter.subclass,
        level: currentCharacter.level,
      })

      let classData: any = null

      // Use class_id if available, otherwise fallback to old method
      if (currentCharacter.class_id) {
        console.log("[v0] Using class_id to fetch class data:", currentCharacter.class_id)
        classData = await fetchClassDataById(currentCharacter.class_id)
      } else {
        console.log("[v0] Using class name to fetch class data:", currentCharacter.class, currentCharacter.subclass)
        classData = await fetchClassData(currentCharacter.class, currentCharacter.subclass)
      }

      if (!classData) {
        console.log("[v0] No class data found")
        return
      }

      console.log("[v0] Found class data:", classData)

      // Calculate new spell slots from class data
      const newSpellSlots = calculateSpellSlotsFromClass(classData, currentCharacter.level)
      console.log("[v0] Calculated spell slots:", newSpellSlots)

      const updatedSpellSlots = newSpellSlots.map((newSlot) => {
        // Get used count from database-stored spellSlotsUsed
        const usedCount = currentCharacter.spellSlotsUsed?.[newSlot.level as keyof typeof currentCharacter.spellSlotsUsed] || 0
        return {
          ...newSlot,
          used: usedCount, // Restore used count from database
        }
      })

      const newBardicInspiration = getBardicInspirationFromClass(classData, currentCharacter.level)
      const existingBardicInspiration = currentCharacter.spellData?.bardicInspirationSlot

      // Calculate current uses based on database stored used count
      // The database stores bardic_inspiration_used as the number of checkboxes that are UNCHECKED
      let updatedBardicInspiration = null
      if (newBardicInspiration) {
        // Get the used count from the database (this represents unchecked checkboxes)
        const usedCount = currentCharacter.bardicInspirationUsed || 0
        const currentUses = Math.max(0, newBardicInspiration.usesPerRest - usedCount)
        
        updatedBardicInspiration = {
          ...newBardicInspiration,
          currentUses: existingBardicInspiration?.currentUses ?? currentUses,
        }
      }

      // Update character with new spell data
      const updatedCharacter = {
        ...currentCharacter,
        spellData: {
          ...currentCharacter.spellData,
          spellSlots: updatedSpellSlots,
          cantripsKnown: getCantripsKnownFromClass(classData, currentCharacter.level),
          spellsKnown: getSpellsKnownFromClass(classData, currentCharacter.level),
          bardicInspirationSlot: updatedBardicInspiration,
        },
      }
      

      // Update the character in state
      setCharacters((prev) => prev.map((char) => (char.id === currentCharacter.id ? updatedCharacter : char)))

      toast({
        title: "Spell Slots Updated",
        description: "Spell slots have been updated based on your class and level.",
      })
    } catch (error) {
      console.error("[v0] Error updating spell slots:", error)
      toast({
        title: "Error",
        description: "Failed to update spell slots from class data.",
        variant: "destructive",
      })
    } finally {
      // Reset the flag to allow future executions
      updateSpellSlotsRef.current = null
    }
  }

  const setActiveCharacterIdWithStorage = (characterId: string) => {
    setActiveCharacterId(characterId)
    saveActiveCharacterToLocalStorage(characterId)
  }

  if (isInitialLoading || !activeCharacter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon icon="lucide:refresh-cw" className="h-8 w-8 animate-spin mx-auto mb-4" />
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
        activeCharacterId={activeCharacterId}
        onSelectCharacter={setActiveCharacterIdWithStorage}
        onCreateCharacter={createNewCharacter}
      />

      <main className="flex-1 p-6 overflow-auto">
        {/* Character Header */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{activeCharacter.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">Level {activeCharacter.level}</Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Proficiency:</span>
                    <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {formatModifier(proficiencyBonus)}
                    </div>
                  </div>
                  <Badge variant="outline">{activeCharacter.class}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {activeCharacter.race} • {activeCharacter.background} • {activeCharacter.alignment}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${dbConnected === true ? "bg-green-500" : dbConnected === false ? "bg-red-500" : "bg-yellow-500"}`}
                  title={
                    dbConnected === true
                      ? "Database Connected"
                      : dbConnected === false
                        ? "Database Offline"
                        : "Connecting..."
                  }
                />
                <Button variant="outline" size="sm" onClick={saveCurrentCharacter} disabled={isSaving || !dbConnected}>
                  <Icon icon="lucide:save" className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={loadCharactersFromDatabase} disabled={isLoading}>
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
                  {isLoading ? "Loading..." : "Refresh"}
                </Button>
                <Button variant="outline" size="sm" onClick={updateSpellSlotsFromClass}>
                  <Icon icon="lucide:sparkles" className="w-4 h-4 mr-2" />
                  Update Spells
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBasicInfoModalOpen(true)}>
                  <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* COLUMN 1: Abilities, Skills, Features, Equipment, Languages */}
          <div className="space-y-6">
            {/* Ability Scores */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Ability Scores</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setAbilitiesModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "STR", fullName: "STRENGTH", score: activeCharacter.strength, modifier: strengthMod },
                    { name: "DEX", fullName: "DEXTERITY", score: activeCharacter.dexterity, modifier: dexterityMod },
                    {
                      name: "CON",
                      fullName: "CONSTITUTION",
                      score: activeCharacter.constitution,
                      modifier: constitutionMod,
                    },
                    {
                      name: "INT",
                      fullName: "INTELLIGENCE",
                      score: activeCharacter.intelligence,
                      modifier: intelligenceMod,
                    },
                    { name: "WIS", fullName: "WISDOM", score: activeCharacter.wisdom, modifier: wisdomMod },
                    { name: "CHA", fullName: "CHARISMA", score: activeCharacter.charisma, modifier: charismaMod },
                  ].map((ability) => (
                    <div key={ability.name} className="text-center">
                      <div className="text-xs font-bold mb-2 text-muted-foreground">{ability.fullName}</div>
                      <div className="text-2xl font-bold mb-2">{ability.score}</div>
                      <div className="bg-black text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto text-sm font-bold">
                        {formatModifier(ability.modifier)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.skills.map((skill) => {
                    const skillBonus = calculateSkillBonus(activeCharacter, skill)
                    const isProficient = skill.proficiency === "proficient" || skill.proficiency === "expertise"
                    const hasExpertise = skill.proficiency === "expertise"

                    return (
                      <div key={skill.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                id={`${skill.name}-prof`}
                                checked={isProficient}
                                onChange={(e) => updateSkillProficiency(skill.name, "proficient", e.target.checked)}
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
                                onChange={(e) => updateSkillProficiency(skill.name, "expertise", e.target.checked)}
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
                        <div className="font-mono text-sm font-bold">{formatModifier(skillBonus)}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Passive Skills Section */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-3">Passive Skills</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Passive Perception</span>
                      <div className="font-mono text-sm font-bold">{passivePerception}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Passive Insight</span>
                      <div className="font-mono text-sm font-bold">{passiveInsight}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features & Traits */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Features & Traits</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setFeaturesModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.features.map((feature, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium mb-1">{feature.name}</div>
                      <div className="text-sm text-muted-foreground">{feature.description}</div>
                    </div>
                  ))}
                  {activeCharacter.features.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No features or traits</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Equipment */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Equipment</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setEquipmentModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <RichTextDisplay
                  content={activeCharacter.equipment || "No equipment listed"}
                  className={!activeCharacter.equipment ? "text-muted-foreground text-center py-4" : ""}
                />
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Languages</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setLanguagesModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
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

            {/* Personality & Backstory Section */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="lucide:user" className="w-5 h-5" />
                    Character Details
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setCharacterDetailsModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeCharacter.personalityTraits && (
                    <div>
                      <h4 className="font-medium mb-2">Personality Traits</h4>
                      <RichTextDisplay content={activeCharacter.personalityTraits} />
                    </div>
                  )}

                  {activeCharacter.ideals && (
                    <div>
                      <h4 className="font-medium mb-2">Ideals</h4>
                      <RichTextDisplay content={activeCharacter.ideals} />
                    </div>
                  )}

                  {activeCharacter.bonds && (
                    <div>
                      <h4 className="font-medium mb-2">Bonds</h4>
                      <RichTextDisplay content={activeCharacter.bonds} />
                    </div>
                  )}

                  {activeCharacter.flaws && (
                    <div>
                      <h4 className="font-medium mb-2">Flaws</h4>
                      <RichTextDisplay content={activeCharacter.flaws} />
                    </div>
                  )}

                  {activeCharacter.backstory && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">Backstory</h4>
                      <RichTextDisplay content={activeCharacter.backstory} />
                    </div>
                  )}

                  {activeCharacter.notes && (
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">Notes</h4>
                      <RichTextDisplay content={activeCharacter.notes} />
                    </div>
                  )}

                  {!activeCharacter.personalityTraits &&
                    !activeCharacter.ideals &&
                    !activeCharacter.bonds &&
                    !activeCharacter.flaws &&
                    !activeCharacter.backstory &&
                    !activeCharacter.notes && (
                      <div className="md:col-span-2 text-sm text-muted-foreground text-center py-4">
                        No character details added yet. Click Edit to add personality traits, backstory, and more.
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUMN 2: Combat, Weapons, Spells, Tools Proficiencies */}
          <div className="space-y-6">
            {/* Combat Stats */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Combat</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setCombatModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon icon="lucide:shield" className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-muted-foreground">Armor Class</div>
                    <div className="text-xl font-bold">{activeCharacter.armorClass}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon="lucide:zap" className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="text-sm text-muted-foreground">Initiative</div>
                    <div className="text-xl font-bold">{formatModifier(activeCharacter.initiative)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon="lucide:footprints" className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm text-muted-foreground">Speed</div>
                    <div className="text-xl font-bold">{activeCharacter.speed} ft</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon="lucide:heart" className="w-5 h-5 text-red-600" />
                  <div>
                    <div className="text-sm text-muted-foreground">Hit Points</div>
                    <div className="text-xl font-bold">
                      {activeCharacter.currentHitPoints}/{activeCharacter.maxHitPoints}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weapons */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="lucide:sword" className="w-5 h-5" />
                    Weapons
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setWeaponsModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.weapons.map((weapon, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium">{weapon.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {weapon.attackBonus} • {weapon.damageType}
                      </div>
                    </div>
                  ))}
                  {activeCharacter.weapons.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No weapons equipped</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
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
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="lucide:sparkles" className="w-5 h-5" />
                    Spells & Magic
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSpellModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Spell Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Spell Attack</div>
                    <div className="text-xl font-bold">
                      {formatModifier(activeCharacter.spellData.spellAttackBonus)}
                    </div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Spell Save DC</div>
                    <div className="text-xl font-bold">{activeCharacter.spellData.spellSaveDC}</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Cantrips Known</div>
                    <div className="text-xl font-bold">{activeCharacter.spellData.cantripsKnown}</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Spells Known</div>
                    <div className="text-xl font-bold">{activeCharacter.spellData.spellsKnown}</div>
                  </div>
                </div>

                {/* Bardic Inspiration Slot */}
                {activeCharacter.class.toLowerCase() === "bard" && activeCharacter.spellData.bardicInspirationSlot && (
                  <div>
                    <div className="text-sm font-medium mb-3">Bardic Inspiration</div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">
                        {activeCharacter.spellData.bardicInspirationSlot.dieType} • Inspiration
                      </span>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: activeCharacter.spellData.bardicInspirationSlot.usesPerRest }, (_, i) => {
                          const usedCount = activeCharacter.spellData.bardicInspirationSlot!.usesPerRest - activeCharacter.spellData.bardicInspirationSlot!.currentUses
                          const isAvailable = i >= usedCount
                          return (
                            <button
                              key={i}
                              onClick={() => toggleBardicInspiration(i)}
                              className={`w-4 h-4 rounded border-2 cursor-pointer transition-colors ${
                                isAvailable
                                  ? "bg-purple-500 border-purple-500"
                                  : "bg-white border-gray-300 hover:border-gray-400"
                              }`}
                              title={isAvailable ? "Available" : "Used"}
                            />
                          )
                        })}
                        <span className="text-xs text-muted-foreground ml-2">
                          {activeCharacter.spellData.bardicInspirationSlot.currentUses}/
                          {activeCharacter.spellData.bardicInspirationSlot.usesPerRest}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Song of Rest */}
                {activeCharacter.class.toLowerCase() === "bard" && activeCharacter.spellData.songOfRest && (
                  <div>
                    <div className="text-sm font-medium mb-3">Song of Rest</div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {activeCharacter.spellData.songOfRest.healingDie} healing
                        </span>
                        <Badge variant={activeCharacter.spellData.songOfRest.available ? "default" : "secondary"}>
                          {activeCharacter.spellData.songOfRest.available ? "Available" : "Used"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {activeCharacter.spellData.spellSlots.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-3">Spell Slots</div>
                    <div className="space-y-2">
                      {activeCharacter.spellData.spellSlots
                        .sort((a, b) => a.level - b.level)
                        .map((slot) => (
                          <div key={slot.level} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">Level {slot.level}</span>
                            <div className="flex items-center gap-2">
                              {Array.from({ length: slot.total }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => toggleSpellSlot(slot.level, i)}
                                  className={`w-4 h-4 rounded border-2 cursor-pointer transition-colors ${
                                    i < slot.used
                                      ? "bg-gray-400 border-gray-400"
                                      : "bg-white border-gray-300 hover:border-gray-400"
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-muted-foreground ml-2">
                                {slot.total - slot.used}/{slot.total}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {activeCharacter.spellData.featSpellSlots.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-3">Feat Spells</div>
                    <div className="space-y-2">
                      {activeCharacter.spellData.featSpellSlots.map((feat, featIndex) => (
                        <div key={featIndex} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{feat.name}</span>
                            <button
                              onClick={() => toggleFeatSpellSlot(featIndex)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                feat.currentUses > 0
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {feat.currentUses}/{feat.usesPerLongRest} uses
                            </button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {feat.spells.join(", ") || "No spells configured"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spell Notes */}
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Spell Notes</div>
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

            {/* Tools Proficiencies */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon icon="lucide:wrench" className="w-5 h-5" />
                    Tools Proficiencies
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setToolsModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.toolsProficiencies.map((tool, index) => {
                    const toolBonus = calculateToolBonus(activeCharacter, tool)
                    const isProficient = tool.proficiency === "proficient" || tool.proficiency === "expertise"
                    const hasExpertise = tool.proficiency === "expertise"

                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                            <span className="font-medium">{tool.name}</span>
                          </div>
                        </div>
                        {toolBonus !== 0 && (
                          <div className="font-mono text-sm font-bold">{formatModifier(toolBonus)}</div>
                        )}
                      </div>
                    )
                  })}
                  {activeCharacter.toolsProficiencies.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No tool proficiencies</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Other Tools & Items</h4>
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
          </div>

          {/* COLUMN 3: Class Features, Feats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon icon="lucide:star" className="w-5 h-5" />
                  Class Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.classFeatures.map((feature, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{feature.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {feature.source}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Level {feature.level}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{feature.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feats */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Feats</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setFeatsModalOpen(true)}>
                    <Icon icon="lucide:edit" className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeCharacter.feats.map((feat, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="font-medium mb-1">{feat.name}</div>
                      <div className="text-sm text-muted-foreground">{feat.description}</div>
                    </div>
                  ))}
                  {activeCharacter.feats.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">No feats</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Modals */}
      <BasicInfoModal
        isOpen={basicInfoModalOpen}
        onClose={() => setBasicInfoModalOpen(false)}
        character={activeCharacter}
        onSave={updateBasicInfo}
      />
      <CharacterDetailsModal
        isOpen={characterDetailsModalOpen}
        onClose={() => setCharacterDetailsModalOpen(false)}
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
        onSave={updateCharacter}
      />
      <WeaponsModal
        isOpen={weaponsModalOpen}
        onClose={() => setWeaponsModalOpen(false)}
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
    </div>
  )
}
