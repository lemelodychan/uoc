"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { CharacterSidebar } from "@/components/character-sidebar"
import { CharacterSheet as CharacterSheetComponent } from "@/components/character-sheet"
import { BasicInfoModal } from "@/components/edit-modals/basic-info-modal"
import { CharacterCreationModal } from "@/components/edit-modals/character-creation-modal"
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
import { useToast } from "@/hooks/use-toast"
import {
  sampleCharacters,
  calculateProficiencyBonus,
  type CharacterData,
} from "@/lib/character-data"
import { saveCharacter, loadAllCharacters, testConnection, updatePartyStatus } from "@/lib/database"
import { subscribeToLongRestEvents, broadcastLongRestEvent, confirmLongRestEvent, type LongRestEvent, type LongRestEventData } from "@/lib/realtime"

export default function CharacterSheet() {
  const [characters, setCharacters] = useState<CharacterData[]>([])
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
  const [longRestResults, setLongRestResults] = useState<any[] | null>(null)
  const [longRestResultsModalOpen, setLongRestResultsModalOpen] = useState(false)

  const { toast } = useToast()

  // Get active character
  const activeCharacter = characters.find(c => c.id === activeCharacterId) || characters[0]
  const proficiencyBonus = activeCharacter ? calculateProficiencyBonus(activeCharacter.level) : 2

  // Character management functions
  const updateCharacter = useCallback(async (updates: Partial<CharacterData>) => {
    if (!activeCharacter) return
    
    const updatedCharacter = { ...activeCharacter, ...updates }
    setCharacters(prev => prev.map(c => c.id === activeCharacter.id ? updatedCharacter : c))
    
    try {
      setIsSaving(true)
      const result = await saveCharacter(updatedCharacter)
      if (!result.success) {
        console.error("Failed to save character:", result.error)
        toast({
          title: "Save Failed",
          description: result.error || "Failed to save character",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving character:", error)
      toast({
        title: "Save Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }, [activeCharacter, toast])

  const setActiveCharacterIdWithStorage = useCallback((id: string) => {
    setActiveCharacterId(id)
    localStorage.setItem('activeCharacterId', id)
  }, [])

  // Long Rest Functions
  const handleStartLongRest = () => {
    setCurrentLongRestEvent(null)
    setLongRestModalOpen(true)
  }

  // Dice Roll Functions
  const handleOpenDiceRoll = () => {
    setDiceRollModalOpen(true)
  }

  const handleUpdateHP = (newHP: number) => {
    if (!activeCharacter) return
    
    const updatedCharacter = {
      ...activeCharacter,
      currentHitPoints: newHP
    }
    
    updateCharacter(updatedCharacter)
  }

  // Initialize characters
  useEffect(() => {
    const initializeCharacters = async () => {
      try {
        const result = await loadAllCharacters()
        if (result.characters) {
          setCharacters(result.characters)
          
          // Set active character from localStorage or first character
          const savedActiveId = localStorage.getItem('activeCharacterId')
          if (savedActiveId && result.characters.find(c => c.id === savedActiveId)) {
            setActiveCharacterId(savedActiveId)
          } else if (result.characters.length > 0) {
            setActiveCharacterId(result.characters[0].id)
          }
      } else {
          // Fallback to sample characters
          setCharacters(sampleCharacters)
          if (sampleCharacters.length > 0) {
            setActiveCharacterId(sampleCharacters[0].id)
          }
      }
    } catch (error) {
      console.error("Error loading characters:", error)
        setCharacters(sampleCharacters)
        if (sampleCharacters.length > 0) {
          setActiveCharacterId(sampleCharacters[0].id)
        }
    } finally {
        setIsInitialLoading(false)
      }
    }

    initializeCharacters()
  }, [])

  // Loading state
  if (isInitialLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading Character Sheet...</div>
          <div className="text-sm text-muted-foreground">Please wait while we load your characters.</div>
        </div>
      </div>
    )
  }

  // No characters state
  if (!activeCharacter) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Characters Found</div>
          <div className="text-sm text-muted-foreground mb-4">Create your first character to get started.</div>
          <button 
            onClick={() => setCharacterCreationModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Create Character
          </button>
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
        onCreateCharacter={() => setCharacterCreationModalOpen(true)}
        onStartLongRest={handleStartLongRest}
        onOpenDiceRoll={handleOpenDiceRoll}
      />

      <main className="flex-1 p-6 overflow-auto">
        <CharacterSheetComponent
          character={activeCharacter}
          proficiencyBonus={proficiencyBonus}
          onOpenBiography={() => setCharacterDetailsContentModalOpen(true)}
          onOpenPortrait={() => setPortraitModalOpen(true)}
          onOpenAbilitiesModal={() => setAbilitiesModalOpen(true)}
          onOpenCombatModal={() => setCombatModalOpen(true)}
        />
      </main>

      {/* Edit Modals */}
      <BasicInfoModal
        isOpen={basicInfoModalOpen}
        onClose={() => setBasicInfoModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
        onPartyStatusChange={(status) => {
          if (activeCharacter) {
            updatePartyStatus(activeCharacter.id, status, activeCharacter.class, activeCharacter.level)
          }
        }}
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
        onSave={updateCharacter}
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
        onSave={(spellData) => updateCharacter({ spellData: { ...activeCharacter.spellData, ...spellData } })}
      />

      <SpellListModal
        isOpen={spellListModalOpen}
        onClose={() => setSpellListModalOpen(false)}
        character={activeCharacter}
        onSave={(spellData) => updateCharacter({ spellData: { ...activeCharacter.spellData, ...spellData } })}
      />

      <CharacterCreationModal
        isOpen={characterCreationModalOpen}
        onClose={() => setCharacterCreationModalOpen(false)}
        onCreateCharacter={(newCharacter) => {
          setCharacters(prev => [...prev, newCharacter as unknown as CharacterData])
          setActiveCharacterId((newCharacter as unknown as CharacterData).id)
          setCharacterCreationModalOpen(false)
        }}
      />

      <LongRestModal
        isOpen={longRestModalOpen}
        onClose={() => {
          setLongRestModalOpen(false)
          setCurrentLongRestEvent(null)
        }}
        characters={characters}
        onConfirmLongRest={() => {}}
        longRestEvent={currentLongRestEvent}
        activeCharacterId={activeCharacterId}
      />

      <LongRestResultsModal
        isOpen={longRestResultsModalOpen}
        onClose={() => {
          setLongRestResultsModalOpen(false)
          setLongRestResults(null)
        }}
        results={longRestResults}
      />

      <EldritchCannonModal
        isOpen={eldritchCannonModalOpen}
        onClose={() => setEldritchCannonModalOpen(false)}
        character={activeCharacter}
        onSave={(cannon) => updateCharacter({ eldritchCannon: cannon || undefined })}
      />

      <EldritchInvocationsModal
        isOpen={eldritchInvocationsModalOpen}
        onClose={() => setEldritchInvocationsModalOpen(false)}
        character={activeCharacter}
        onSave={updateCharacter}
      />

      <DiceRollModal
        isOpen={diceRollModalOpen}
        onClose={() => setDiceRollModalOpen(false)}
        character={activeCharacter}
        onUpdateHP={handleUpdateHP}
      />
    </div>
  )
}
