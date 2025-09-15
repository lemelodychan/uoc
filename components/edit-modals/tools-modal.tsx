"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { CharacterData, ToolProficiency } from "@/lib/character-data"

interface ToolsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function ToolsModal({ isOpen, onClose, character, onSave }: ToolsModalProps) {
  const [toolsProficiencies, setToolsProficiencies] = useState<ToolProficiency[]>(character.toolsProficiencies)
  const [otherTools, setOtherTools] = useState(character.otherTools)

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

  const handleSave = () => {
    onSave({ toolsProficiencies, otherTools })
    onClose()
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
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tools Proficiencies</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Tool Proficiencies</Label>
            <div className="space-y-3">
              {toolsProficiencies.map((tool, index) => {
                const isProficient = tool.proficiency === "proficient" || tool.proficiency === "expertise"
                const hasExpertise = tool.proficiency === "expertise"

                const currentCalculatedValue =
                  tool.manualModifier !== undefined ? tool.manualModifier : calculateToolBonusForTool(tool)

                return (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <div className="flex gap-1">
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          id={`tool-${index}-prof`}
                          checked={isProficient}
                          onChange={(e) => updateToolProficiency(index, "proficient", e.target.checked)}
                          className="w-3 h-3 rounded border-gray-300"
                        />
                        <Label htmlFor={`tool-${index}-prof`} className="text-xs">
                          Prof
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          id={`tool-${index}-exp`}
                          checked={hasExpertise}
                          onChange={(e) => updateToolProficiency(index, "expertise", e.target.checked)}
                          className="w-3 h-3 rounded border-gray-300"
                        />
                        <Label htmlFor={`tool-${index}-exp`} className="text-xs">
                          Exp
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
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTool(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
              <Button variant="outline" onClick={addTool} className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Other Tools & Items</Label>
            <RichTextEditor
              value={otherTools}
              onChange={setOtherTools}
              placeholder="List any other tools, kits, or special items you own..."
              rows={6}
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
    </Dialog>
  )
}
