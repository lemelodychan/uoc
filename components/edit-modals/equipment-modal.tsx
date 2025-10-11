"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { MagicItemsModal } from "./magic-items-modal"
import { Icon } from "@iconify/react"
import type { CharacterData, ToolProficiency } from "@/lib/character-data"

interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function EquipmentModal({ isOpen, onClose, character, onSave }: EquipmentModalProps) {
  const [equipment, setEquipment] = useState(character.equipment)
  const [magicItems, setMagicItems] = useState(character.magicItems || [])
  const [toolsProficiencies, setToolsProficiencies] = useState<ToolProficiency[]>(character.toolsProficiencies)
  const [isMagicItemsModalOpen, setIsMagicItemsModalOpen] = useState(false)
  const [editingMagicItemIndex, setEditingMagicItemIndex] = useState<number | null>(null)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setEquipment(character.equipment)
    setMagicItems(character.magicItems || [])
    setToolsProficiencies(character.toolsProficiencies)
  }, [character.equipment, character.magicItems, character.toolsProficiencies])

  const handleSave = () => {
    onSave({ equipment, magicItems, toolsProficiencies })
    onClose()
  }

  const handleMagicItemsSave = (updatedMagicItems: typeof magicItems) => {
    setMagicItems(updatedMagicItems)
    setEditingMagicItemIndex(null)
  }

  const addMagicItem = () => {
    setEditingMagicItemIndex(-1) // -1 indicates adding a new item
    setIsMagicItemsModalOpen(true)
  }

  const editMagicItem = (index: number) => {
    setEditingMagicItemIndex(index)
    setIsMagicItemsModalOpen(true)
  }

  const removeMagicItem = (index: number) => {
    setMagicItems(magicItems.filter((_, i) => i !== index))
  }

  // Tools proficiencies functions
  const calculateToolBonusForTool = (tool: ToolProficiency): number => {
    const proficiencyBonus = Math.ceil(character.level / 4) + 1

    switch (tool.proficiency) {
      case "proficient":
        return proficiencyBonus
      case "expertise":
        return proficiencyBonus * 2
      default:
        return 0
    }
  }

  const addTool = () => {
    setToolsProficiencies([...toolsProficiencies, { name: "", proficiency: "none" }])
  }

  const removeTool = (index: number) => {
    setToolsProficiencies(toolsProficiencies.filter((_, i) => i !== index))
  }

  const updateToolName = (index: number, name: string) => {
    const updated = toolsProficiencies.map((tool, i) => (i === index ? { ...tool, name } : tool))
    setToolsProficiencies(updated)
  }

  const updateToolModifier = (index: number, modifier: string) => {
    const numModifier = modifier === "" ? undefined : Number.parseInt(modifier) || 0
    const updated = toolsProficiencies.map((tool, i) => (i === index ? { ...tool, manualModifier: numModifier } : tool))
    setToolsProficiencies(updated)
  }

  const updateToolProficiency = (index: number, proficiencyType: "proficient" | "expertise", checked: boolean) => {
    const updated = toolsProficiencies.map((tool, i) => {
      if (i === index) {
        const newTool = { ...tool }

        if (proficiencyType === "proficient") {
          if (checked) {
            newTool.proficiency = tool.proficiency === "expertise" ? "expertise" : "proficient"
          } else {
            newTool.proficiency = tool.proficiency === "expertise" ? "expertise" : "none"
          }
        } else {
          // expertise
          if (checked) {
            newTool.proficiency = "expertise"
          } else {
            newTool.proficiency = tool.proficiency !== "none" ? "proficient" : "none"
          }
        }

        if (newTool.manualModifier === undefined || newTool.manualModifier === calculateToolBonusForTool(tool)) {
          const calculatedBonus = calculateToolBonusForTool(newTool)
          newTool.manualModifier = calculatedBonus !== 0 ? calculatedBonus : undefined
        }

        return newTool
      }
      return tool
    })
    setToolsProficiencies(updated)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment & Tools</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {/* Tools Proficiencies Section */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Tools Proficiencies</Label>
            <div className="space-y-3">
              {toolsProficiencies.map((tool, index) => {
                const isProficient = tool.proficiency === "proficient" || tool.proficiency === "expertise"
                const hasExpertise = tool.proficiency === "expertise"

                const currentCalculatedValue =
                  tool.manualModifier !== undefined ? tool.manualModifier : calculateToolBonusForTool(tool)

                return (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id={`tool-${index}-prof`}
                          checked={isProficient}
                          onChange={(e) => updateToolProficiency(index, "proficient", e.target.checked)}
                          className="w-3 h-3 rounded border-gray-300"
                        />
                        <Label htmlFor={`tool-${index}-prof`} className="text-sm">
                          Proficient
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id={`tool-${index}-exp`}
                          checked={hasExpertise}
                          onChange={(e) => updateToolProficiency(index, "expertise", e.target.checked)}
                          className="w-3 h-3 rounded border-gray-300"
                        />
                        <Label htmlFor={`tool-${index}-exp`} className="text-sm">
                          Expertise
                        </Label>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={tool.name}
                        onChange={(e) => updateToolName(index, e.target.value)}
                        placeholder="e.g., Thieves' Tools, Smith's Tools"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        value={currentCalculatedValue !== 0 ? currentCalculatedValue.toString() : ""}
                        onChange={(e) => updateToolModifier(index, e.target.value)}
                        placeholder="Mod"
                        className="text-center text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTool(index)}
                      className="text-destructive hover:text-destructive w-9 h-9"
                    >
                      <Icon icon="lucide:trash-2" className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
              <Button variant="outline" onClick={addTool} className="w-full bg-transparent">
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </div>

          {/* Magic Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Magic Items</Label>
              <Button variant="outline" size="sm" onClick={addMagicItem}>
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Add Magic Item
              </Button>
            </div>
            <div className="space-y-2">
              {magicItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name || "Unnamed Magic Item"}</div>
                    {item.maxUses && item.maxUses > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {item.maxUses} use{item.maxUses === 1 ? '' : 's'} per day
                        {item.dailyRecharge && ` (${item.dailyRecharge} recharge)`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editMagicItem(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Icon icon="lucide:edit" className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMagicItem(index)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Icon icon="lucide:trash-2" className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {magicItems.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No magic items added yet. Click "Add Magic Item" to get started.
                </div>
              )}
            </div>
          </div>

          {/* Equipment Text Section */}
          <div>
            <Label htmlFor="equipment" className="text-sm font-medium">
              Equipment Notes
            </Label>
            <RichTextEditor
              value={equipment}
              onChange={setEquipment}
              placeholder="List your equipment, weapons, armor, and other items..."
              rows={6}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Magic Items Modal */}
      <MagicItemsModal
        isOpen={isMagicItemsModalOpen}
        onClose={() => {
          setIsMagicItemsModalOpen(false)
          setEditingMagicItemIndex(null)
        }}
        magicItems={magicItems}
        onSave={handleMagicItemsSave}
        editingIndex={editingMagicItemIndex}
      />
    </Dialog>
  )
}
