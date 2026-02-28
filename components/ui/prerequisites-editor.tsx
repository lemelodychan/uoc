"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Icon } from "@iconify/react"

interface Prerequisites {
  min_level?: number | null
  ability_scores?: Partial<Record<'strength'|'dexterity'|'constitution'|'intelligence'|'wisdom'|'charisma', number>>
  spellcasting?: boolean
  proficiency?: string[]
  other?: string
}

interface PrerequisitesEditorProps {
  value: Prerequisites | null
  onChange: (value: Prerequisites | null) => void
  disabled?: boolean
}

const ABILITY_LABELS: { key: 'strength'|'dexterity'|'constitution'|'intelligence'|'wisdom'|'charisma'; label: string }[] = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
]

function isEffectivelyEmpty(prereqs: Prerequisites): boolean {
  const hasLevel = prereqs.min_level && prereqs.min_level > 0
  const hasAbilityScores = prereqs.ability_scores && Object.values(prereqs.ability_scores).some(v => v && v > 0)
  const hasSpellcasting = prereqs.spellcasting === true
  const hasProficiency = prereqs.proficiency && prereqs.proficiency.length > 0
  const hasOther = prereqs.other && prereqs.other.trim().length > 0
  return !hasLevel && !hasAbilityScores && !hasSpellcasting && !hasProficiency && !hasOther
}

export function PrerequisitesEditor({ value, onChange, disabled = false }: PrerequisitesEditorProps) {
  const prereqs = value ?? {}
  const [profInput, setProfInput] = useState("")

  const update = (patch: Partial<Prerequisites>) => {
    const next = { ...prereqs, ...patch }
    onChange(isEffectivelyEmpty(next) ? null : next)
  }

  const addProficiency = () => {
    const trimmed = profInput.trim()
    if (!trimmed) return
    const current = prereqs.proficiency || []
    if (!current.includes(trimmed)) {
      update({ proficiency: [...current, trimmed] })
    }
    setProfInput("")
  }

  const removeProficiency = (prof: string) => {
    const current = prereqs.proficiency || []
    const updated = current.filter(p => p !== prof)
    update({ proficiency: updated.length > 0 ? updated : undefined })
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Minimum Level */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Minimum Level</Label>
          <span className="text-xs text-muted-foreground">0 = not required</span>
        </div>
        <Input
          type="number"
          min={0}
          max={20}
          value={prereqs.min_level ?? 0}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0
            update({ min_level: val > 0 ? val : undefined })
          }}
          disabled={disabled}
          className="w-24"
        />
      </div>

      {/* Ability Scores */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Minimum Ability Scores</Label>
          <span className="text-xs text-muted-foreground">0 = not required</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {ABILITY_LABELS.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <Label className="text-xs font-medium">{label}</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={prereqs.ability_scores?.[key] ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0
                  const current = prereqs.ability_scores || {}
                  const updated = { ...current, [key]: val }
                  // Remove zero entries
                  const filtered = Object.fromEntries(
                    Object.entries(updated).filter(([, v]) => v && v > 0)
                  ) as Prerequisites['ability_scores']
                  update({ ability_scores: Object.keys(filtered || {}).length > 0 ? filtered : undefined })
                }}
                disabled={disabled}
                className="w-full text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Spellcasting */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={prereqs.spellcasting === true}
            onCheckedChange={(checked) => {
              update({ spellcasting: checked ? true : undefined })
            }}
            disabled={disabled}
          />
          <Label className="text-sm font-semibold cursor-pointer">
            Requires the ability to cast at least one spell
          </Label>
        </div>
      </div>

      {/* Required Proficiencies */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <Label className="text-sm font-semibold">Required Proficiencies</Label>
        <div className="flex gap-2">
          <Input
            value={profInput}
            onChange={(e) => setProfInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addProficiency()
              }
            }}
            placeholder="e.g. medium armor, longswords"
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addProficiency}
            disabled={disabled || !profInput.trim()}
          >
            Add
          </Button>
        </div>
        {(prereqs.proficiency && prereqs.proficiency.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {prereqs.proficiency.map((prof) => (
              <Badge key={prof} variant="secondary" className="flex items-center gap-1">
                {prof}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeProficiency(prof)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Icon icon="lucide:x" className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Other Requirements */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <Label className="text-sm font-semibold">Other Requirements (free text)</Label>
        <Textarea
          value={prereqs.other ?? ""}
          onChange={(e) => {
            const val = e.target.value
            update({ other: val.trim() ? val : undefined })
          }}
          placeholder="e.g. Must be a member of the Harpers faction"
          disabled={disabled}
          rows={2}
        />
      </div>
    </div>
  )
}
