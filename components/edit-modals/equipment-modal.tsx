"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { MagicItemsModal } from "./magic-items-modal"
import { Plus, Trash2, Edit } from "lucide-react"
import type { CharacterData } from "@/lib/character-data"

interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function EquipmentModal({ isOpen, onClose, character, onSave }: EquipmentModalProps) {
  const [equipment, setEquipment] = useState(character.equipment)
  const [magicItems, setMagicItems] = useState(character.magicItems || [])
  const [isMagicItemsModalOpen, setIsMagicItemsModalOpen] = useState(false)
  const [editingMagicItemIndex, setEditingMagicItemIndex] = useState<number | null>(null)

  // Sync local state with character prop when it changes
  useEffect(() => {
    setEquipment(character.equipment)
    setMagicItems(character.magicItems || [])
  }, [character.equipment, character.magicItems])

  const handleSave = () => {
    onSave({ equipment, magicItems })
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
          {/* Magic Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Magic Items</Label>
              <Button variant="outline" size="sm" onClick={addMagicItem}>
                <Plus className="w-4 h-4 mr-2" />
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
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMagicItem(index)}
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
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
