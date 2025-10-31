"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { CharacterData } from "@/lib/character-data"
import { calculateSkillBonus, calculatePassivePerception, calculatePassiveInsight } from "@/lib/character-data"
import { Icon } from "@iconify/react"

interface SkillsProps {
  character: CharacterData
  proficiencyBonus: number
  skillSortMode: 'alpha' | 'ability'
  onSetSkillSortMode: (mode: 'alpha' | 'ability') => void
  onUpdateSkillProficiency: (skillName: string, proficiencyType: "proficient" | "expertise", checked: boolean) => void
  canEdit?: boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function Skills({ 
  character, 
  proficiencyBonus, 
  skillSortMode, 
  onSetSkillSortMode, 
  onUpdateSkillProficiency,
  canEdit = true
}: SkillsProps) {
  const abilityOrder = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const
  const sortedSkills = [...character.skills].sort((a, b) => {
    if (skillSortMode === 'alpha') {
      return a.name.localeCompare(b.name)
    }
    const abilityCompare = abilityOrder.indexOf(a.ability as typeof abilityOrder[number]) - abilityOrder.indexOf(b.ability as typeof abilityOrder[number])
    if (abilityCompare !== 0) return abilityCompare
    return a.name.localeCompare(b.name)
  })

  const passivePerception = calculatePassivePerception(character, proficiencyBonus)
  const passiveInsight = calculatePassiveInsight(character, proficiencyBonus)

  return (
    <Card className="flex flex-col gap-4 relative">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:brain" className="w-5 h-5" />
            Skills
          </CardTitle>
          {canEdit && (
            <div className="inline-flex gap-1 rounded-md bg-muted p-1 absolute right-4 top-4">
              <Button size="sm" className="text-xs px-2 py-1 h-6" variant={skillSortMode === 'alpha' ? 'outline' : 'ghost'} onClick={() => onSetSkillSortMode('alpha')}>A–Z</Button>
              <Button size="sm" className="text-xs px-2 py-1 h-6" variant={skillSortMode === 'ability' ? 'outline' : 'ghost'} onClick={() => onSetSkillSortMode('ability')}>Ability</Button>
            </div>
          )}
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
                      const skillBonus = calculateSkillBonus(character, skill)
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
                                  onChange={(e) => {
                                    if (!canEdit) return
                                    onUpdateSkillProficiency(skill.name, 'proficient', e.target.checked)
                                  }}
                                  disabled={!canEdit}
                                  className="w-3 h-3 rounded border-border"
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
                                  onChange={(e) => {
                                    if (!canEdit) return
                                    onUpdateSkillProficiency(skill.name, 'expertise', e.target.checked)
                                  }}
                                  disabled={!canEdit}
                                  className="w-3 h-3 rounded border-border"
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
                const skillBonus = calculateSkillBonus(character, skill)
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
                            onChange={(e) => onUpdateSkillProficiency(skill.name, 'proficient', e.target.checked)}
                            className="w-3 h-3 rounded border-border"
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
                            onChange={(e) => onUpdateSkillProficiency(skill.name, 'expertise', e.target.checked)}
                            className="w-3 h-3 rounded border-border"
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
  )
}
