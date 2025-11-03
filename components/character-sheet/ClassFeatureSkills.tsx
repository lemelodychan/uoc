"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import type { ClassFeatureSkill, FeatureSkillUsage } from "@/lib/class-feature-types"
import { calculateUsesFromFormula } from "@/lib/class-feature-templates"
import { getCombatColor } from "@/lib/color-mapping"
import { getClassSubclass } from "@/lib/character-data"

interface ClassFeatureSkillsProps {
  character: CharacterData
  featureSkills: ClassFeatureSkill[]
  usage: FeatureSkillUsage
  onUpdateUsage: (skillId: string, updates: Partial<FeatureSkillUsage[string]>) => void
  onOpenFeatureModal?: (content: { title: string; description: string }) => void
  canEdit?: boolean
}

export function ClassFeatureSkills({ 
  character, 
  featureSkills, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal,
  canEdit = true
}: ClassFeatureSkillsProps) {
  // Filter subclass-only skills to the character's selected subclass for that class
  const filteredSkills = (featureSkills || []).filter((skill) => {
    // If not gated by subclass, always include
    if (!skill.enabledBySubclass) return true

    const className = skill.className || character.class
    const selectedSubclass = getClassSubclass(character.classes || [], className) || (character as any).subclass
    if (!selectedSubclass) return false

    return selectedSubclass.toLowerCase() === String(skill.enabledBySubclass).toLowerCase()
  })

  if (!filteredSkills || filteredSkills.length === 0) {
    return null
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <Icon icon="lucide:sparkles" className="w-5 h-5" />
          Class Features
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {filteredSkills.map((skill) => (
          <FeatureSkillRenderer
            key={skill.id}
            skill={skill}
            character={character}
            usage={usage[skill.id]}
            onUpdateUsage={(updates) => onUpdateUsage(skill.id, updates)}
            onOpenFeatureModal={onOpenFeatureModal}
            canEdit={canEdit}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface FeatureSkillRendererProps {
  skill: ClassFeatureSkill
  character: CharacterData
  usage?: FeatureSkillUsage[string]
  onUpdateUsage: (updates: Partial<FeatureSkillUsage[string]>) => void
  onOpenFeatureModal?: (content: { title: string; description: string }) => void
  canEdit?: boolean
}

function FeatureSkillRenderer({ 
  skill, 
  character, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal,
  canEdit = true
}: FeatureSkillRendererProps) {
  const currentUsage = usage || {}

  switch (skill.featureType) {
    case 'slots':
      return <SlotsRenderer skill={skill} character={character} usage={currentUsage} onUpdateUsage={onUpdateUsage} onOpenFeatureModal={onOpenFeatureModal} canEdit={canEdit} />
    case 'points_pool':
      return <PointsPoolRenderer skill={skill} character={character} usage={currentUsage} onUpdateUsage={onUpdateUsage} onOpenFeatureModal={onOpenFeatureModal} canEdit={canEdit} />
    case 'options_list':
      return <OptionsListRenderer skill={skill} character={character} usage={currentUsage} onUpdateUsage={onUpdateUsage} onOpenFeatureModal={onOpenFeatureModal} canEdit={canEdit} />
    case 'special_ux':
      return <SpecialUXRenderer skill={skill} character={character} usage={currentUsage} onUpdateUsage={onUpdateUsage} onOpenFeatureModal={onOpenFeatureModal} canEdit={canEdit} />
    default:
      return null
  }
}

// Slots-based features (Bardic Inspiration, Divine Sense, etc.)
function SlotsRenderer({ 
  skill, 
  character, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal,
  canEdit = true
}: FeatureSkillRendererProps) {
  const config = skill.config as any
  const maxUses = calculateUsesFromFormula(config.usesFormula, character, skill.className)
  const currentUses = usage.currentUses ?? maxUses

  const handleToggleUse = (index: number) => {
    if (!canEdit) return
    const newCurrentUses = currentUses > index ? index : index + 1
    onUpdateUsage({ currentUses: newCurrentUses })
  }

  const getDieType = () => {
    if (config.dieType && Array.isArray(config.dieType)) {
      const levelIndex = Math.min(character.level - 1, config.dieType.length - 1)
      return config.dieType[levelIndex] || 'd6'
    }
    return 'd6'
  }

  return (
    <div className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-medium">{skill.title}</div>
          {skill.subtitle && (
            <div className="text-sm text-muted-foreground">{skill.subtitle}</div>
          )}
          {config.dieType && (
            <div className="text-xs text-muted-foreground">
              {getDieType()} die
            </div>
          )}
        </div>
        {onOpenFeatureModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenFeatureModal({ 
              title: skill.title, 
              description: skill.subtitle || '' 
            })}
          >
            <Icon icon="lucide:info" className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: maxUses }, (_, i) => {
            const isAvailable = i < currentUses
            return (
              <button
                key={i}
                onClick={() => handleToggleUse(i)}
                disabled={!canEdit}
                className={`w-6 h-6 rounded border-2 transition-colors ${
                  isAvailable
                    ? `${getCombatColor('featureAvailable')} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                    : `${getCombatColor('featureUsed')} ${canEdit ? 'hover:border-border/80 cursor-pointer' : 'cursor-not-allowed opacity-50'}`
                }`}
                title={isAvailable ? "Available" : "Used"}
              />
            )
          })}
        </div>
        <span className="text-sm text-muted-foreground">
          {currentUses}/{maxUses}
        </span>
      </div>
    </div>
  )
}

// Points pool features (Lay on Hands, Ki Points, etc.)
function PointsPoolRenderer({ 
  skill, 
  character, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal,
  canEdit = true
}: FeatureSkillRendererProps) {
  const config = skill.config as any
  const maxPoints = calculateUsesFromFormula(config.totalFormula, character, skill.className)
  const currentPoints = usage.currentPoints ?? maxPoints

  const handleIncrement = () => {
    if (!canEdit || currentPoints >= maxPoints) return
    onUpdateUsage({ currentPoints: currentPoints + 1 })
  }

  const handleDecrement = () => {
    if (!canEdit || currentPoints <= 0) return
    onUpdateUsage({ currentPoints: currentPoints - 1 })
  }

  return (
    <div className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-medium">{skill.title}</div>
          {skill.subtitle && (
            <div className="text-sm text-muted-foreground">{skill.subtitle}</div>
          )}
        </div>
        {onOpenFeatureModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenFeatureModal({ 
              title: skill.title, 
              description: skill.subtitle || '' 
            })}
          >
            <Icon icon="lucide:info" className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrement}
          disabled={!canEdit || currentPoints <= 0}
        >
          <Icon icon="lucide:minus" className="w-4 h-4" />
        </Button>
        
        <div className="flex flex-col items-center gap-1">
          <div className="text-2xl font-bold font-mono">
            {currentPoints}
          </div>
          <div className="text-xs text-muted-foreground">
            / {maxPoints}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrement}
          disabled={!canEdit || currentPoints >= maxPoints}
        >
          <Icon icon="lucide:plus" className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// Options list features (Eldritch Invocations, Infusions, etc.)
function OptionsListRenderer({ 
  skill, 
  character, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal 
}: FeatureSkillRendererProps) {
  const config = skill.config as any
  const maxSelections = calculateUsesFromFormula(config.maxSelectionsFormula, character, skill.className)
  const selectedOptions = usage.selectedOptions || []

  return (
    <div className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-medium">{skill.title}</div>
          {skill.subtitle && (
            <div className="text-sm text-muted-foreground">{skill.subtitle}</div>
          )}
          <div className="text-xs text-muted-foreground">
            {selectedOptions.length}/{maxSelections} selected
          </div>
        </div>
        {onOpenFeatureModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenFeatureModal({ 
              title: skill.title, 
              description: skill.subtitle || '' 
            })}
          >
            <Icon icon="lucide:info" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {option}
            </Badge>
          ))}
        </div>
      )}

      {selectedOptions.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-2">
          No options selected. Click Edit to choose {maxSelections} {skill.title.toLowerCase()}.
        </div>
      )}
    </div>
  )
}

// Special UX features (Eldritch Cannon, Wild Shape, etc.)
function SpecialUXRenderer({ 
  skill, 
  character, 
  usage, 
  onUpdateUsage,
  onOpenFeatureModal 
}: FeatureSkillRendererProps) {
  const config = skill.config as any

  // For now, render a placeholder for special UX features
  // In the future, this would dynamically load the appropriate component
  // based on config.componentId (e.g., 'eldritch-cannon', 'wild-shape')
  
  return (
    <div className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="font-medium">{skill.title}</div>
          {skill.subtitle && (
            <div className="text-sm text-muted-foreground">{skill.subtitle}</div>
          )}
          <div className="text-xs text-muted-foreground">
            Special Component: {config.componentId}
          </div>
        </div>
        {onOpenFeatureModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenFeatureModal({ 
              title: skill.title, 
              description: skill.subtitle || '' 
            })}
          >
            <Icon icon="lucide:info" className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground text-center py-2">
        Special UI component for {config.componentId} will be rendered here.
        {/* TODO: Implement dynamic component loading based on config.componentId */}
      </div>
    </div>
  )
}
