"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface DefensesModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: {
    darkvision?: number | null
    damageVulnerabilities?: string[]
    damageResistances?: string[]
    damageImmunities?: string[]
    conditionImmunities?: string[]
    conditionAdvantages?: string[]
    conditionDisadvantages?: string[]
  }) => void
}

const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']
const CONDITION_TYPES = ['blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious']

export function DefensesModal({ isOpen, onClose, character, onSave }: DefensesModalProps) {
  const [darkvision, setDarkvision] = useState<string>("")
  const [damageVulnerabilities, setDamageVulnerabilities] = useState<string[]>([])
  const [damageResistances, setDamageResistances] = useState<string[]>([])
  const [damageImmunities, setDamageImmunities] = useState<string[]>([])
  const [conditionImmunities, setConditionImmunities] = useState<string[]>([])
  const [conditionAdvantages, setConditionAdvantages] = useState<string[]>([])
  const [conditionDisadvantages, setConditionDisadvantages] = useState<string[]>([])
  const [customVulnerability, setCustomVulnerability] = useState("")
  const [customResistance, setCustomResistance] = useState("")
  const [customImmunity, setCustomImmunity] = useState("")

  useEffect(() => {
    setDarkvision(character.darkvision != null ? String(character.darkvision) : "")
    setDamageVulnerabilities(character.damageVulnerabilities ?? [])
    setDamageResistances(character.damageResistances ?? [])
    setDamageImmunities(character.damageImmunities ?? [])
    setConditionImmunities(character.conditionImmunities ?? [])
    setConditionAdvantages(character.conditionAdvantages ?? [])
    setConditionDisadvantages(character.conditionDisadvantages ?? [])
    setCustomVulnerability("")
    setCustomResistance("")
    setCustomImmunity("")
  }, [character.darkvision, character.damageVulnerabilities, character.damageResistances, character.damageImmunities, character.conditionImmunities, character.conditionAdvantages, character.conditionDisadvantages])

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const addCustom = (list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) => {
    const trimmed = value.trim().toLowerCase()
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed])
    }
    setInput("")
  }

  const handleSave = () => {
    onSave({
      darkvision: darkvision === "" ? null : parseInt(darkvision) || null,
      damageVulnerabilities,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      conditionAdvantages,
      conditionDisadvantages,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <DialogTitle>Edit Defenses & Senses</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 p-4 flex-1 overflow-y-auto min-h-0">
          {/* Darkvision */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Darkvision (ft)</Label>
            <Input
              type="number"
              value={darkvision}
              onChange={(e) => setDarkvision(e.target.value)}
              placeholder="None"
              className="w-32"
              min={0}
              step={30}
            />
          </div>

          {/* Damage Vulnerabilities */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Damage Vulnerabilities</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={damageVulnerabilities.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageVulnerabilities, setDamageVulnerabilities, type)}
                >
                  {type}
                </Badge>
              ))}
              {damageVulnerabilities.filter(r => !DAMAGE_TYPES.includes(r)).map(type => (
                <Badge
                  key={type}
                  variant="default"
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageVulnerabilities, setDamageVulnerabilities, type)}
                >
                  {type} <Icon icon="lucide:x" className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customVulnerability}
                onChange={(e) => setCustomVulnerability(e.target.value)}
                placeholder="Add custom vulnerability..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustom(damageVulnerabilities, setDamageVulnerabilities, customVulnerability, setCustomVulnerability)
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCustom(damageVulnerabilities, setDamageVulnerabilities, customVulnerability, setCustomVulnerability)}
                disabled={!customVulnerability.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Damage Resistances */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Damage Resistances</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={damageResistances.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageResistances, setDamageResistances, type)}
                >
                  {type}
                </Badge>
              ))}
              {/* Show custom entries not in standard list */}
              {damageResistances.filter(r => !DAMAGE_TYPES.includes(r)).map(type => (
                <Badge
                  key={type}
                  variant="default"
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageResistances, setDamageResistances, type)}
                >
                  {type} <Icon icon="lucide:x" className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customResistance}
                onChange={(e) => setCustomResistance(e.target.value)}
                placeholder="Add custom resistance..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustom(damageResistances, setDamageResistances, customResistance, setCustomResistance)
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCustom(damageResistances, setDamageResistances, customResistance, setCustomResistance)}
                disabled={!customResistance.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Damage Immunities */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Damage Immunities</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={damageImmunities.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageImmunities, setDamageImmunities, type)}
                >
                  {type}
                </Badge>
              ))}
              {damageImmunities.filter(r => !DAMAGE_TYPES.includes(r)).map(type => (
                <Badge
                  key={type}
                  variant="default"
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(damageImmunities, setDamageImmunities, type)}
                >
                  {type} <Icon icon="lucide:x" className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customImmunity}
                onChange={(e) => setCustomImmunity(e.target.value)}
                placeholder="Add custom immunity..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustom(damageImmunities, setDamageImmunities, customImmunity, setCustomImmunity)
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCustom(damageImmunities, setDamageImmunities, customImmunity, setCustomImmunity)}
                disabled={!customImmunity.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Condition Immunities */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Condition Immunities</Label>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={conditionImmunities.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(conditionImmunities, setConditionImmunities, type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Condition Advantages */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Condition Saving Throw Advantages</Label>
            <p className="text-xs text-muted-foreground">Conditions the character has advantage on saving throws against</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={conditionAdvantages.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(conditionAdvantages, setConditionAdvantages, type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Condition Disadvantages */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Condition Saving Throw Disadvantages</Label>
            <p className="text-xs text-muted-foreground">Conditions the character has disadvantage on saving throws against</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={conditionDisadvantages.includes(type) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleItem(conditionDisadvantages, setConditionDisadvantages, type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
