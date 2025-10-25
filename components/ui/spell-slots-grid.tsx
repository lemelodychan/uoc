"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@iconify/react'

interface SpellSlotsGridProps {
  value: {
    cantripsKnown: number[]  // 20 levels
    spellsKnown?: number[]  // 20 levels (optional)
    spellSlots: {
      spell_slots_1: number[]  // 20 levels
      spell_slots_2: number[]  // 20 levels
      spell_slots_3: number[]  // 20 levels
      spell_slots_4: number[]  // 20 levels
      spell_slots_5: number[]  // 20 levels
      spell_slots_6: number[]  // 20 levels
      spell_slots_7: number[]  // 20 levels
      spell_slots_8: number[]  // 20 levels
      spell_slots_9: number[]  // 20 levels
    }
    // Special progression fields
    sorceryPoints?: number[]  // 20 levels
    martialArtsDice?: number[]  // 20 levels (stored as die size: 4, 6, 8, 10, 12)
    kiPoints?: number[]  // 20 levels
    unarmoredMovement?: number[]  // 20 levels (feet)
    rageUses?: number[]  // 20 levels
    rageDamage?: number[]  // 20 levels
  }
  onChange: (value: { 
    cantripsKnown: number[], 
    spellsKnown?: number[],
    spellSlots: {
      spell_slots_1: number[]
      spell_slots_2: number[]
      spell_slots_3: number[]
      spell_slots_4: number[]
      spell_slots_5: number[]
      spell_slots_6: number[]
      spell_slots_7: number[]
      spell_slots_8: number[]
      spell_slots_9: number[]
    }
    sorceryPoints?: number[]
    martialArtsDice?: number[]
    kiPoints?: number[]
    unarmoredMovement?: number[]
    rageUses?: number[]
    rageDamage?: number[]
  }) => void
  readonly?: boolean
  title?: string
  // Individual column toggles
  showSpellsKnown?: boolean
  showSorceryPoints?: boolean
  showMartialArts?: boolean
  showKiPoints?: boolean
  showUnarmoredMovement?: boolean
  showRage?: boolean
  showRageDamage?: boolean
}

export function SpellSlotsGrid({ 
  value, 
  onChange, 
  readonly = false, 
  title = "Spell Progression", 
  showSpellsKnown = false,
  showSorceryPoints = false,
  showMartialArts = false,
  showKiPoints = false,
  showUnarmoredMovement = false,
  showRage = false,
  showRageDamage = false
}: SpellSlotsGridProps) {
  const [cantripsKnown, setCantripsKnown] = useState<number[]>(value?.cantripsKnown || createEmptyArray())
  const [spellsKnown, setSpellsKnown] = useState<number[]>(value?.spellsKnown || createEmptyArray())
  const [spellSlots, setSpellSlots] = useState({
    spell_slots_1: value?.spellSlots?.spell_slots_1 || createEmptyArray(),
    spell_slots_2: value?.spellSlots?.spell_slots_2 || createEmptyArray(),
    spell_slots_3: value?.spellSlots?.spell_slots_3 || createEmptyArray(),
    spell_slots_4: value?.spellSlots?.spell_slots_4 || createEmptyArray(),
    spell_slots_5: value?.spellSlots?.spell_slots_5 || createEmptyArray(),
    spell_slots_6: value?.spellSlots?.spell_slots_6 || createEmptyArray(),
    spell_slots_7: value?.spellSlots?.spell_slots_7 || createEmptyArray(),
    spell_slots_8: value?.spellSlots?.spell_slots_8 || createEmptyArray(),
    spell_slots_9: value?.spellSlots?.spell_slots_9 || createEmptyArray(),
  })
  // Sorcerer-specific state
  const [sorceryPoints, setSorceryPoints] = useState<number[]>(value?.sorceryPoints || createEmptyArray())
  // Monk-specific state
  const [martialArtsDice, setMartialArtsDice] = useState<number[]>(value?.martialArtsDice || createEmptyArray())
  const [kiPoints, setKiPoints] = useState<number[]>(value?.kiPoints || createEmptyArray())
  const [unarmoredMovement, setUnarmoredMovement] = useState<number[]>(value?.unarmoredMovement || createEmptyArray())
  const [rageUses, setRageUses] = useState<number[]>(value?.rageUses || createEmptyArray())
  const [rageDamage, setRageDamage] = useState<number[]>(value?.rageDamage || createEmptyArray())
  const [errors, setErrors] = useState<string[]>([])
  const [draggedRow, setDraggedRow] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  function createEmptyArray(): number[] {
    return Array(20).fill(0)
  }


  // Update state when value prop changes
  useEffect(() => {
    if (value) {
      setCantripsKnown(value.cantripsKnown || createEmptyArray())
      setSpellsKnown(value.spellsKnown || createEmptyArray())
      setSpellSlots({
        spell_slots_1: value.spellSlots?.spell_slots_1 || createEmptyArray(),
        spell_slots_2: value.spellSlots?.spell_slots_2 || createEmptyArray(),
        spell_slots_3: value.spellSlots?.spell_slots_3 || createEmptyArray(),
        spell_slots_4: value.spellSlots?.spell_slots_4 || createEmptyArray(),
        spell_slots_5: value.spellSlots?.spell_slots_5 || createEmptyArray(),
        spell_slots_6: value.spellSlots?.spell_slots_6 || createEmptyArray(),
        spell_slots_7: value.spellSlots?.spell_slots_7 || createEmptyArray(),
        spell_slots_8: value.spellSlots?.spell_slots_8 || createEmptyArray(),
        spell_slots_9: value.spellSlots?.spell_slots_9 || createEmptyArray(),
      })
    }
  }, [value])


  function handleCantripsChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newCantrips = [...cantripsKnown]
    newCantrips[charLevel] = Math.max(0, newValue)
    setCantripsKnown(newCantrips)
    
    // Update parent component immediately without debouncing
    onChange({ 
      cantripsKnown: newCantrips, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  function handleSpellsKnownChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newSpellsKnown = [...spellsKnown]
    newSpellsKnown[charLevel] = Math.max(0, newValue)
    setSpellsKnown(newSpellsKnown)
    
    // Update parent component immediately without debouncing
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? newSpellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  function handleSpellSlotChange(charLevel: number, spellLevel: number, newValue: number) {
    if (readonly) return
    
    const spellSlotKey = `spell_slots_${spellLevel + 1}` as keyof typeof spellSlots
    const newSpellSlots = {
      ...spellSlots,
      [spellSlotKey]: [...spellSlots[spellSlotKey]]
    }
    
    newSpellSlots[spellSlotKey][charLevel] = Math.max(0, Math.min(4, newValue))
    setSpellSlots(newSpellSlots)
    
    // Update parent component immediately without debouncing
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots: newSpellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  // Sorcerer-specific handlers
  function handleSorceryPointsChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newSorceryPoints = [...sorceryPoints]
    newSorceryPoints[charLevel] = Math.max(0, newValue)
    setSorceryPoints(newSorceryPoints)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? newSorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  // Monk-specific handlers
  function handleMartialArtsDiceChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newMartialArtsDice = [...martialArtsDice]
    newMartialArtsDice[charLevel] = Math.max(4, Math.min(12, newValue)) // d4 to d12
    setMartialArtsDice(newMartialArtsDice)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? newMartialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  function handleKiPointsChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newKiPoints = [...kiPoints]
    newKiPoints[charLevel] = Math.max(0, newValue)
    setKiPoints(newKiPoints)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? newKiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  function handleUnarmoredMovementChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newUnarmoredMovement = [...unarmoredMovement]
    newUnarmoredMovement[charLevel] = Math.max(0, newValue)
    setUnarmoredMovement(newUnarmoredMovement)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? newUnarmoredMovement : undefined,
      rageUses: showRage ? rageUses : undefined,
      rageDamage: showRageDamage ? rageDamage : undefined
    })
  }

  function handleRageUsesChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newRageUses = [...rageUses]
    newRageUses[charLevel] = Math.max(0, newValue)
    setRageUses(newRageUses)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined,
      rageUses: showRage ? newRageUses : undefined,
      rageDamage: showRageDamage ? rageDamage : undefined
    })
  }

  function handleRageDamageChange(charLevel: number, newValue: number) {
    if (readonly) return
    
    const newRageDamage = [...rageDamage]
    newRageDamage[charLevel] = Math.max(0, newValue)
    setRageDamage(newRageDamage)
    
    onChange({ 
      cantripsKnown, 
      spellsKnown: showSpellsKnown ? spellsKnown : undefined,
      spellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined,
      rageUses: showRage ? rageUses : undefined,
      rageDamage: showRageDamage ? newRageDamage : undefined
    })
  }


  function loadPreset(className: 'wizard' | 'sorcerer' | 'bard' | 'cleric' | 'paladin' | 'ranger' | 'artificer') {
    if (readonly) return
    
    const presets: Record<string, { cantripsKnown: number[], spellSlots: number[][] }> = {
      wizard: WIZARD_SPELL_SLOTS,
      sorcerer: SORCERER_SPELL_SLOTS,
      bard: BARD_SPELL_SLOTS,
      cleric: CLERIC_SPELL_SLOTS,
      ranger: RANGER_SPELL_SLOTS,
      artificer: ARTIFICER_SPELL_SLOTS
    }
    
    const preset = presets[className]
    if (preset) {
      // Convert row-based preset to column-based structure
      const columnBasedSpellSlots = {
        spell_slots_1: Array(20).fill(0),
        spell_slots_2: Array(20).fill(0),
        spell_slots_3: Array(20).fill(0),
        spell_slots_4: Array(20).fill(0),
        spell_slots_5: Array(20).fill(0),
        spell_slots_6: Array(20).fill(0),
        spell_slots_7: Array(20).fill(0),
        spell_slots_8: Array(20).fill(0),
        spell_slots_9: Array(20).fill(0),
      }
      
      // Convert from row-based to column-based
      preset.spellSlots.forEach((row, charLevel) => {
        row.forEach((slots, spellLevel) => {
          const spellSlotKey = `spell_slots_${spellLevel + 1}` as keyof typeof columnBasedSpellSlots
          columnBasedSpellSlots[spellSlotKey][charLevel] = slots
        })
      })
      
      setCantripsKnown(preset.cantripsKnown)
      setSpellSlots(columnBasedSpellSlots)
      onChange({ 
        cantripsKnown: preset.cantripsKnown, 
        spellsKnown: showSpellsKnown ? spellsKnown : undefined,
        spellSlots: columnBasedSpellSlots,
        sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
        martialArtsDice: showMartialArts ? martialArtsDice : undefined,
        kiPoints: showKiPoints ? kiPoints : undefined,
        unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
      })
    }
  }

  function handleRowReset(charLevel: number) {
    if (readonly) return
    
    const newCantrips = [...cantripsKnown]
    const newSpellsKnown = [...spellsKnown]
    const newSpellSlots = {
      spell_slots_1: [...spellSlots.spell_slots_1],
      spell_slots_2: [...spellSlots.spell_slots_2],
      spell_slots_3: [...spellSlots.spell_slots_3],
      spell_slots_4: [...spellSlots.spell_slots_4],
      spell_slots_5: [...spellSlots.spell_slots_5],
      spell_slots_6: [...spellSlots.spell_slots_6],
      spell_slots_7: [...spellSlots.spell_slots_7],
      spell_slots_8: [...spellSlots.spell_slots_8],
      spell_slots_9: [...spellSlots.spell_slots_9],
    }
    
    newCantrips[charLevel] = 0
    newSpellsKnown[charLevel] = 0
    newSpellSlots.spell_slots_1[charLevel] = 0
    newSpellSlots.spell_slots_2[charLevel] = 0
    newSpellSlots.spell_slots_3[charLevel] = 0
    newSpellSlots.spell_slots_4[charLevel] = 0
    newSpellSlots.spell_slots_5[charLevel] = 0
    newSpellSlots.spell_slots_6[charLevel] = 0
    newSpellSlots.spell_slots_7[charLevel] = 0
    newSpellSlots.spell_slots_8[charLevel] = 0
    newSpellSlots.spell_slots_9[charLevel] = 0
    
    setCantripsKnown(newCantrips)
    setSpellsKnown(newSpellsKnown)
    setSpellSlots(newSpellSlots)
    onChange({ 
      cantripsKnown: newCantrips, 
      spellsKnown: showSpellsKnown ? newSpellsKnown : undefined,
      spellSlots: newSpellSlots,
      sorceryPoints: showSorceryPoints ? sorceryPoints : undefined,
      martialArtsDice: showMartialArts ? martialArtsDice : undefined,
      kiPoints: showKiPoints ? kiPoints : undefined,
      unarmoredMovement: showUnarmoredMovement ? unarmoredMovement : undefined
    })
  }

  function handleKeyDown(event: React.KeyboardEvent, charLevel: number, columnIndex: number) {
    if (readonly) return
    
    const totalColumns = 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0) + (showKiPoints ? 1 : 0) + (showUnarmoredMovement ? 1 : 0) + (showRage ? 1 : 0) + (showRageDamage ? 1 : 0) + 9 // Level, Cantrips, special columns, 1st-9th
    const totalRows = 20
    
    let newRow = charLevel
    let newCol = columnIndex
    
    switch (event.key) {
      case 'Tab':
        event.preventDefault()
        event.stopPropagation() // Prevent modal from handling the Tab key
        
        if (event.shiftKey) {
          // Shift+Tab: move backward
          if (columnIndex > 0) {
            newCol = columnIndex - 1
          } else if (charLevel > 0) {
            newRow = charLevel - 1
            newCol = totalColumns - 1
          } else {
            // At the beginning, loop to the end
            newRow = totalRows - 1
            newCol = totalColumns - 1
          }
        } else {
          // Tab: move forward
          if (columnIndex < totalColumns - 1) {
            newCol = columnIndex + 1
          } else if (charLevel < totalRows - 1) {
            newRow = charLevel + 1
            newCol = 0
          } else {
            // At the end, loop to the beginning
            newRow = 0
            newCol = 0
          }
        }
        
        // Focus the new input
        const newInputId = `input-${newRow}-${newCol}`
        const newInput = document.getElementById(newInputId)
        if (newInput) {
          (newInput as HTMLInputElement).focus()
        }
        break
    }
  }

  function handleDragStart(event: React.DragEvent, rowIndex: number) {
    if (readonly) return
    setDraggedRow(rowIndex)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', '')
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event: React.DragEvent, targetRowIndex: number) {
    if (readonly || draggedRow === null) return
    
    event.preventDefault()
    
    if (draggedRow === targetRowIndex) {
      setDraggedRow(null)
      return
    }

    // Create new arrays with swapped rows
    const newCantrips = [...cantripsKnown]
    const newSpellsKnown = [...spellsKnown]
    const newSpellSlots = {
      spell_slots_1: [...spellSlots.spell_slots_1],
      spell_slots_2: [...spellSlots.spell_slots_2],
      spell_slots_3: [...spellSlots.spell_slots_3],
      spell_slots_4: [...spellSlots.spell_slots_4],
      spell_slots_5: [...spellSlots.spell_slots_5],
      spell_slots_6: [...spellSlots.spell_slots_6],
      spell_slots_7: [...spellSlots.spell_slots_7],
      spell_slots_8: [...spellSlots.spell_slots_8],
      spell_slots_9: [...spellSlots.spell_slots_9],
    }
    
    // Swap cantrips
    const tempCantrip = newCantrips[draggedRow]
    newCantrips[draggedRow] = newCantrips[targetRowIndex]
    newCantrips[targetRowIndex] = tempCantrip
    
    // Swap spells known
    const tempSpellsKnown = newSpellsKnown[draggedRow]
    newSpellsKnown[draggedRow] = newSpellsKnown[targetRowIndex]
    newSpellsKnown[targetRowIndex] = tempSpellsKnown
    
    // Swap spell slots for each level
    const spellSlotKeys = ['spell_slots_1', 'spell_slots_2', 'spell_slots_3', 'spell_slots_4', 'spell_slots_5', 'spell_slots_6', 'spell_slots_7', 'spell_slots_8', 'spell_slots_9'] as const
    spellSlotKeys.forEach(key => {
      const temp = newSpellSlots[key][draggedRow]
      newSpellSlots[key][draggedRow] = newSpellSlots[key][targetRowIndex]
      newSpellSlots[key][targetRowIndex] = temp
    })
    
    setCantripsKnown(newCantrips)
    setSpellsKnown(newSpellsKnown)
    setSpellSlots(newSpellSlots)
    handleSaveWithFeedback({ 
      cantripsKnown: newCantrips, 
      spellsKnown: showSpellsKnown ? newSpellsKnown : undefined,
      spellSlots: newSpellSlots 
    })
    setDraggedRow(null)
  }

  function handleDragEnd() {
    setDraggedRow(null)
  }

  return (
    <div className="flex flex-col gap-2">

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div 
        ref={gridRef}
        className="border rounded-lg"
        data-spell-grid
      >
        <table className="w-full text-sm bg-background">
          <thead className="bg-muted border-b">
            <tr>
              {!readonly && <th className="p-2 text-left font-medium w-8"></th>}
              <th className="p-2 text-left font-medium">Level</th>
              
            {/* Dynamic columns based on toggles */}
            <th className="p-2 text-left font-medium">Cantrips</th>
            {showSpellsKnown && <th className="p-2 text-left font-medium">Spells Known</th>}
            {showSorceryPoints && <th className="p-2 text-left font-medium">Sorcery Points</th>}
            {showMartialArts && <th className="p-2 text-left font-medium">Martial Arts</th>}
            {showKiPoints && <th className="p-2 text-left font-medium">Ki Points</th>}
            {showUnarmoredMovement && <th className="p-2 text-left font-medium">Unarmored Movement</th>}
            {showRage && <th className="p-2 text-left font-medium">Rage</th>}
            {showRageDamage && <th className="p-2 text-left font-medium">Rage Damage</th>}
            <th className="p-2 text-left font-medium">1st</th>
            <th className="p-2 text-left font-medium">2nd</th>
            <th className="p-2 text-left font-medium">3rd</th>
            <th className="p-2 text-left font-medium">4th</th>
            <th className="p-2 text-left font-medium">5th</th>
            <th className="p-2 text-left font-medium">6th</th>
            <th className="p-2 text-left font-medium">7th</th>
            <th className="p-2 text-left font-medium">8th</th>
            <th className="p-2 text-left font-medium">9th</th>
              
              {!readonly && <th className="p-2 text-left font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }, (_, charLevel) => (
              <tr 
                key={charLevel} 
                className={`border-b hover:bg-muted/50 ${draggedRow === charLevel ? 'opacity-50' : ''}`}
                draggable={!readonly}
                onDragStart={(e) => handleDragStart(e, charLevel)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, charLevel)}
                onDragEnd={handleDragEnd}
              >
                {!readonly && (
                  <td className="p-1 w-8">
                    <div 
                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      title="Drag to reorder rows"
                    >
                      <Icon icon="lucide:grip-vertical" className="h-4 w-4" />
                    </div>
                  </td>
                )}
                <td className="p-2 font-medium">{charLevel + 1}</td>
                
                {/* Dynamic columns based on toggles */}
                {/* Cantrips Known */}
                <td className="p-1">
                  <Input
                    id={`input-${charLevel}-cantrips`}
                    type="number"
                    min="0"
                    value={cantripsKnown[charLevel]}
                    onChange={(e) => handleCantripsChange(charLevel, parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, charLevel, 1)}
                    className="w-15 text-center"
                    disabled={readonly}
                  />
                </td>
                
                {/* Spells Known */}
                {showSpellsKnown && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-spells`}
                      type="number"
                      min="0"
                      value={spellsKnown[charLevel]}
                      onChange={(e) => handleSpellsKnownChange(charLevel, parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2)}
                      className="w-15 text-center"
                      disabled={readonly}
                    />
                  </td>
                )}
                
                {/* Sorcery Points */}
                {showSorceryPoints && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-sorcery`}
                      type="number"
                      min="0"
                      value={sorceryPoints[charLevel] || 0}
                      onChange={(e) => handleSorceryPointsChange(charLevel, parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0))}
                      className="w-15 text-center"
                      disabled={readonly}
                    />
                  </td>
                )}
                
                {/* Martial Arts Dice */}
                {showMartialArts && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-martial`}
                      type="number"
                      min="4"
                      max="12"
                      value={martialArtsDice[charLevel] || 4}
                      onChange={(e) => handleMartialArtsDiceChange(charLevel, parseInt(e.target.value) || 4)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0))}
                      className="w-15 text-center"
                      disabled={readonly}
                      title="Martial Arts Die Size (d4-d12)"
                    />
                  </td>
                )}
                
                {/* Ki Points */}
                {showKiPoints && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-ki`}
                      type="number"
                      min="0"
                      value={kiPoints[charLevel] || 0}
                      onChange={(e) => handleKiPointsChange(charLevel, parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0))}
                      className="w-15 text-center"
                      disabled={readonly}
                    />
                  </td>
                )}
                
                {/* Unarmored Movement */}
                {showUnarmoredMovement && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-movement`}
                      type="number"
                      min="0"
                      value={unarmoredMovement[charLevel] || 0}
                      onChange={(e) => handleUnarmoredMovementChange(charLevel, parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0) + (showKiPoints ? 1 : 0))}
                      className="w-15 text-center"
                      disabled={readonly}
                      title="Additional movement speed in feet"
                    />
                  </td>
                )}
                
                {/* Rage */}
                {showRage && (
                  <td className="p-1">
                    {readonly ? (
                      <div className="w-15 text-center py-2 px-1 text-sm font-mono">
                        {(rageUses[charLevel] || 0) === 0 ? "Unlimited" : (rageUses[charLevel] || 0)}
                      </div>
                    ) : (
                      <Input
                        id={`input-${charLevel}-rage`}
                        type="number"
                        min="0"
                        value={rageUses[charLevel] || 0}
                        onChange={(e) => handleRageUsesChange(charLevel, parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0) + (showKiPoints ? 1 : 0) + (showUnarmoredMovement ? 1 : 0))}
                        className="w-15 text-center"
                        disabled={readonly}
                        title="Number of rage uses per long rest (0 = Unlimited)"
                      />
                    )}
                  </td>
                )}
                
                {/* Rage Damage */}
                {showRageDamage && (
                  <td className="p-1">
                    <Input
                      id={`input-${charLevel}-rage-damage`}
                      type="number"
                      min="0"
                      value={rageDamage[charLevel] || 0}
                      onChange={(e) => handleRageDamageChange(charLevel, parseInt(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, charLevel, 2 + (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0) + (showKiPoints ? 1 : 0) + (showUnarmoredMovement ? 1 : 0) + (showRage ? 1 : 0))}
                      className="w-15 text-center"
                      disabled={readonly}
                      title="Bonus damage from rage"
                    />
                  </td>
                )}
                
                {/* Spell Slots */}
                {Array.from({ length: 9 }, (_, spellLevel) => {
                  const spellSlotKey = `spell_slots_${spellLevel + 1}` as keyof typeof spellSlots
                  const specialColumnsCount = (showSpellsKnown ? 1 : 0) + (showSorceryPoints ? 1 : 0) + (showMartialArts ? 1 : 0) + (showKiPoints ? 1 : 0) + (showUnarmoredMovement ? 1 : 0) + (showRage ? 1 : 0) + (showRageDamage ? 1 : 0)
                  const columnIndex = spellLevel + 2 + specialColumnsCount
                  return (
                    <td key={spellLevel} className="p-1">
                      <Input
                        id={`input-${charLevel}-${spellLevel + 2}`}
                        type="number"
                        min="0"
                        max="4"
                        value={spellSlots[spellSlotKey][charLevel] || 0}
                        onChange={(e) => handleSpellSlotChange(charLevel, spellLevel, parseInt(e.target.value) || 0)}
                        onKeyDown={(e) => handleKeyDown(e, charLevel, columnIndex)}
                        className="w-15 text-center"
                        disabled={readonly}
                      />
                    </td>
                  )
                })}
                
                {/* Actions */}
                {!readonly && (
                  <td className="p-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                      onClick={() => handleRowReset(charLevel)}
                      title="Reset row to zero"
                    >
                      <Icon icon="lucide:rotate-ccw" className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Preset spell slot progressions (from D&D 5e SRD)
const WIZARD_SPELL_SLOTS = {
  cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  spellSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]
}

const SORCERER_SPELL_SLOTS = {
  cantripsKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  spellSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]
}

const BARD_SPELL_SLOTS = {
  cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  spellSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]
}

const CLERIC_SPELL_SLOTS = {
  cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  spellSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
  ]
}


const RANGER_SPELL_SLOTS = {
  cantripsKnown: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  spellSlots: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 1, 0, 0, 0, 0, 0, 0], [4, 3, 1, 0, 0, 0, 0, 0, 0], [4, 3, 1, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0]
  ]
}

const ARTIFICER_SPELL_SLOTS = {
  cantripsKnown: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  spellSlots: [
    [2, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0]
  ]
}