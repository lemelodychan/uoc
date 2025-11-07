"use client"

import { useState, useEffect, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProficiencyCheckboxesProps {
  value: string[]
  onChange: (value: string[]) => void
  options: Array<{ value: string; label: string; description?: string }>
  title: string
  description?: string
  readonly?: boolean
  maxSelections?: number
  disabledValues?: string[]
}

export function ProficiencyCheckboxes({
  value = [],
  onChange,
  options,
  title,
  description,
  readonly = false,
  maxSelections,
  disabledValues = []
}: ProficiencyCheckboxesProps) {
  const [selectedValues, setSelectedValues] = useState<string[]>(value)
  const [unmatchedValues, setUnmatchedValues] = useState<string[]>([])
  const prevValueRef = useRef<string>(JSON.stringify(value))
  const prevDisabledValuesRef = useRef<string>(JSON.stringify(disabledValues))
  const selectedValuesRef = useRef<string[]>(value)

  // Keep ref in sync with state
  useEffect(() => {
    selectedValuesRef.current = selectedValues
  }, [selectedValues])

  // Debug logging
  useEffect(() => {
    if (!title) {
      console.warn('ProficiencyCheckboxes: title prop is missing or empty', { title, options: options?.length })
    }
  }, [title, options])

  useEffect(() => {
    // Check if value or disabledValues actually changed
    const currentValueStr = JSON.stringify(value)
    const currentDisabledStr = JSON.stringify(disabledValues)
    
    // Only process if value or disabledValues changed
    if (currentValueStr === prevValueRef.current && currentDisabledStr === prevDisabledValuesRef.current) {
      return
    }
    
    prevValueRef.current = currentValueStr
    prevDisabledValuesRef.current = currentDisabledStr
    
    // Normalize the incoming value to match our options
    const unmatched: string[] = []
    const normalizedValue = value.map(val => {
      // Try exact match first
      const exactMatch = options.find(opt => opt.value === val)
      if (exactMatch) return exactMatch.value
      
      // Try case-insensitive match
      const caseInsensitiveMatch = options.find(opt => 
        opt.value.toLowerCase() === val.toLowerCase()
      )
      if (caseInsensitiveMatch) return caseInsensitiveMatch.value
      
      // Try label match (case-insensitive)
      const labelMatch = options.find(opt => 
        opt.label.toLowerCase() === val.toLowerCase()
      )
      if (labelMatch) return labelMatch.value
      
      // Try normalized match (handle apostrophes, spaces, etc.)
      const normalizedVal = val.toLowerCase()
        .replace(/['']/g, '') // Remove apostrophes
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, '') // Remove special characters
      const normalizedMatch = options.find(opt => 
        opt.value.toLowerCase() === normalizedVal
      )
      if (normalizedMatch) return normalizedMatch.value
      
      // If no match found, add to unmatched list
      unmatched.push(val)
      console.warn(`Proficiency value "${val}" not found in options for ${title}`)
      return null
    }).filter(Boolean) as string[]
    
    // Filter out disabled values from the normalized value
    const filteredValue = normalizedValue.filter(val => !disabledValues.includes(val))
    
    // Only update if the filtered value is different from current state (using ref to avoid dependency)
    const currentSelectedStr = JSON.stringify([...selectedValuesRef.current].sort())
    const filteredValueStr = JSON.stringify([...filteredValue].sort())
    if (currentSelectedStr !== filteredValueStr) {
      setSelectedValues(filteredValue)
    }
    setUnmatchedValues(unmatched)
  }, [value, options, title, disabledValues])

  const handleToggle = (optionValue: string) => {
    if (readonly) return
    
    // Don't allow toggling disabled values
    if (disabledValues && disabledValues.includes(optionValue)) {
      return
    }

    let newSelection: string[]
    if (selectedValues.includes(optionValue)) {
      // Remove from selection
      newSelection = selectedValues.filter(v => v !== optionValue)
    } else {
      // Add to selection (check max selections)
      if (maxSelections && selectedValues.length >= maxSelections) {
        return // Don't add if at max
      }
      newSelection = [...selectedValues, optionValue]
    }

    // Filter out disabled values before calling onChange
    const filteredSelection = disabledValues 
      ? newSelection.filter(v => !disabledValues.includes(v))
      : newSelection

    setSelectedValues(filteredSelection)
    onChange(filteredSelection)
  }

  const isAtMax = maxSelections ? selectedValues.length >= maxSelections : false

  return (
    <Card className="!bg-background !shadow-none flex flex-col gap-6">
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="text-md font-bold">{title || 'Proficiencies'}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">
            {description} 
            {maxSelections && (
              <span>
                &nbsp;({selectedValues.length}/{maxSelections} selected)
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-row flex-wrap gap-4">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            const isDisabledByMax = readonly || (!isSelected && isAtMax)
            const isDisabledByFixed = disabledValues.includes(option.value)
            const isDisabled = isDisabledByMax || isDisabledByFixed
            
            return (
              <div key={option.value} className="flex items-start w-[calc(33.33%-0.75rem)] gap-3">
                <Checkbox
                  id={option.value}
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(option.value)}
                  disabled={isDisabled}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={option.value}
                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                      isDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                    }`}
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Predefined options for different proficiency types
export const SAVING_THROW_OPTIONS = [
  { value: 'strength', label: 'Strength', description: 'Athletic feats, breaking objects' },
  { value: 'dexterity', label: 'Dexterity', description: 'Acrobatics, stealth, reflexes' },
  { value: 'constitution', label: 'Constitution', description: 'Endurance, poison resistance' },
  { value: 'intelligence', label: 'Intelligence', description: 'Memory, reasoning, investigation' },
  { value: 'wisdom', label: 'Wisdom', description: 'Awareness, insight, survival' },
  { value: 'charisma', label: 'Charisma', description: 'Leadership, intimidation, performance' }
]

export const SKILL_OPTIONS = [
  { value: 'acrobatics', label: 'Acrobatics', description: 'Dexterity - Tumbling, balancing' },
  { value: 'animal_handling', label: 'Animal Handling', description: 'Wisdom - Calming animals' },
  { value: 'arcana', label: 'Arcana', description: 'Intelligence - Magical knowledge' },
  { value: 'athletics', label: 'Athletics', description: 'Strength - Climbing, jumping' },
  { value: 'deception', label: 'Deception', description: 'Charisma - Lying, misdirection' },
  { value: 'history', label: 'History', description: 'Intelligence - Historical knowledge' },
  { value: 'insight', label: 'Insight', description: 'Wisdom - Reading people' },
  { value: 'intimidation', label: 'Intimidation', description: 'Charisma - Frightening others' },
  { value: 'investigation', label: 'Investigation', description: 'Intelligence - Finding clues' },
  { value: 'medicine', label: 'Medicine', description: 'Wisdom - Healing, diagnosis' },
  { value: 'nature', label: 'Nature', description: 'Intelligence - Natural world' },
  { value: 'perception', label: 'Perception', description: 'Wisdom - Noticing details' },
  { value: 'performance', label: 'Performance', description: 'Charisma - Entertaining' },
  { value: 'persuasion', label: 'Persuasion', description: 'Charisma - Convincing others' },
  { value: 'religion', label: 'Religion', description: 'Intelligence - Religious knowledge' },
  { value: 'sleight_of_hand', label: 'Sleight of Hand', description: 'Dexterity - Pickpocketing' },
  { value: 'stealth', label: 'Stealth', description: 'Dexterity - Hiding, sneaking' },
  { value: 'survival', label: 'Survival', description: 'Wisdom - Tracking, foraging' }
]

export const EQUIPMENT_OPTIONS = [
  { value: 'light_armor', label: 'Light Armor', description: 'Leather, studded leather' },
  { value: 'medium_armor', label: 'Medium Armor', description: 'Hide, chain shirt, scale mail' },
  { value: 'heavy_armor', label: 'Heavy Armor', description: 'Ring mail, chain mail, splint, plate' },
  { value: 'shields', label: 'Shields', description: 'All shields except tower shields' },
  { value: 'simple_weapons', label: 'Simple Weapons', description: 'Clubs, daggers, darts, etc.' },
  { value: 'martial_weapons', label: 'Martial Weapons', description: 'Swords, axes, bows, etc.' },
  { value: 'firearms', label: 'Firearms', description: 'Pistols, rifles, etc.' }
]
