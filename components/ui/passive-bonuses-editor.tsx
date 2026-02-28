"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { PassiveBonuses } from "@/lib/class-feature-types"

interface PassiveBonusesEditorProps {
  value: PassiveBonuses | null | undefined
  onChange: (value: PassiveBonuses | null) => void
  disabled?: boolean
}

const MODIFIER_TOKENS = [
  "dexterity_modifier",
  "constitution_modifier",
  "wisdom_modifier",
  "intelligence_modifier",
  "strength_modifier",
  "charisma_modifier",
]

export function PassiveBonusesEditor({ value, onChange, disabled = false }: PassiveBonusesEditorProps) {
  const profs = value ?? {}

  const update = (patch: Partial<PassiveBonuses>) => {
    const next = { ...profs, ...patch }
    // If all sections are null/undefined, return null
    const hasAny = next.ac_calculation || next.skill_bonus || next.tool_bonus
    onChange(hasAny ? next : null)
  }

  const toggleSection = (key: keyof PassiveBonuses, defaultValue: any) => {
    if (profs[key]) {
      const next = { ...profs }
      delete next[key]
      const hasAny = next.ac_calculation || next.skill_bonus || next.tool_bonus
      onChange(hasAny ? next : null)
    } else {
      update({ [key]: defaultValue })
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── AC Calculation ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">AC Calculation</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!profs.ac_calculation}
              onCheckedChange={() =>
                toggleSection("ac_calculation", {
                  formula: "10 + dexterity_modifier",
                  condition: "no_armor",
                  allows_shield: true,
                })
              }
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">Enable</span>
          </div>
        </div>
        {profs.ac_calculation && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Formula</Label>
              <Input
                value={profs.ac_calculation.formula}
                onChange={(e) =>
                  update({ ac_calculation: { ...profs.ac_calculation!, formula: e.target.value } })
                }
                placeholder="e.g. 10 + dexterity_modifier + constitution_modifier"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                Tokens: {MODIFIER_TOKENS.join(", ")}
              </p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Condition</Label>
                <Select
                  value={profs.ac_calculation.condition}
                  onValueChange={(v: any) =>
                    update({ ac_calculation: { ...profs.ac_calculation!, condition: v } })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_armor">No armor worn</SelectItem>
                    <SelectItem value="no_armor_no_shield">No armor and no shield</SelectItem>
                    <SelectItem value="always">Always (replaces armor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox
                  checked={profs.ac_calculation.allows_shield}
                  onCheckedChange={(v) =>
                    update({ ac_calculation: { ...profs.ac_calculation!, allows_shield: !!v } })
                  }
                  disabled={disabled}
                />
                <Label className="text-xs">Allows shield bonus</Label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Skill Bonus ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Skill Bonus</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!profs.skill_bonus}
              onCheckedChange={() =>
                toggleSection("skill_bonus", {
                  type: "half_proficiency",
                  condition: "not_proficient",
                  applies_to: "all_skills",
                })
              }
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">Enable</span>
          </div>
        </div>
        {profs.skill_bonus && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Type</Label>
                <Select
                  value={profs.skill_bonus.type}
                  onValueChange={(v: any) =>
                    update({ skill_bonus: { ...profs.skill_bonus!, type: v, flat_value: v !== "flat" ? undefined : (profs.skill_bonus!.flat_value ?? 1) } })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="half_proficiency">Half proficiency (Jack of All Trades)</SelectItem>
                    <SelectItem value="double_proficiency">Double proficiency (Expertise)</SelectItem>
                    <SelectItem value="flat">Flat bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Condition</Label>
                <Select
                  value={profs.skill_bonus.condition}
                  onValueChange={(v: any) =>
                    update({ skill_bonus: { ...profs.skill_bonus!, condition: v } })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_proficient">When not proficient</SelectItem>
                    <SelectItem value="proficient">When proficient</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-xs">Applies To</Label>
                <Input
                  value={profs.skill_bonus.applies_to}
                  onChange={(e) =>
                    update({ skill_bonus: { ...profs.skill_bonus!, applies_to: e.target.value } })
                  }
                  placeholder="all_skills, all_tools, or skill name"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code>all_skills</code>, <code>all_tools</code>, or a specific skill key (e.g.{" "}
                  <code>perception</code>)
                </p>
              </div>
              {profs.skill_bonus.type === "flat" && (
                <div className="flex flex-col gap-1 w-20">
                  <Label className="text-xs">Flat Value</Label>
                  <Input
                    type="number"
                    value={profs.skill_bonus.flat_value ?? 1}
                    onChange={(e) =>
                      update({ skill_bonus: { ...profs.skill_bonus!, flat_value: parseInt(e.target.value) || 0 } })
                    }
                    disabled={disabled}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Also Applies To (comma-separated)</Label>
              <Input
                value={(profs.skill_bonus.also_applies_to || []).join(", ")}
                onChange={(e) => {
                  const val = e.target.value.trim()
                  update({
                    skill_bonus: {
                      ...profs.skill_bonus!,
                      also_applies_to: val ? val.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
                    },
                  })
                }}
                placeholder="e.g. passive_perception, initiative"
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tool Bonus ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 p-3 border rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Tool Bonus</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!profs.tool_bonus}
              onCheckedChange={() =>
                toggleSection("tool_bonus", {
                  type: "double_proficiency",
                  condition: "proficient",
                  applies_to: "all_tools",
                })
              }
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">Enable</span>
          </div>
        </div>
        {profs.tool_bonus && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Type</Label>
                <Select
                  value={profs.tool_bonus.type}
                  onValueChange={(v: any) =>
                    update({ tool_bonus: { ...profs.tool_bonus!, type: v } })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="double_proficiency">Double proficiency (Expertise)</SelectItem>
                    <SelectItem value="flat">Flat bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Condition</Label>
                <Select
                  value={profs.tool_bonus.condition}
                  onValueChange={(v: any) =>
                    update({ tool_bonus: { ...profs.tool_bonus!, condition: v } })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proficient">When proficient with tool</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Applies To</Label>
              <Input
                value={profs.tool_bonus.applies_to}
                onChange={(e) =>
                  update({ tool_bonus: { ...profs.tool_bonus!, applies_to: e.target.value } })
                }
                placeholder="all_tools or specific tool name"
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
