"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Icon } from "@iconify/react"

interface MagicItem {
  name: string
  description: string
  maxUses?: number
  dailyRecharge?: string
  currentUses?: number
}

interface MagicItemsModalProps {
  isOpen: boolean
  onClose: () => void
  magicItems: MagicItem[]
  onSave: (magicItems: MagicItem[]) => void
  editingIndex: number | null
}

export function MagicItemsModal({ isOpen, onClose, magicItems: initialMagicItems, onSave, editingIndex }: MagicItemsModalProps) {
  const [currentItem, setCurrentItem] = useState<MagicItem>({ name: "", description: "", maxUses: 0, dailyRecharge: "", currentUses: 0 })

  // Sync local state with prop when it changes
  useEffect(() => {
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < initialMagicItems.length) {
      // Editing existing item
      setCurrentItem(initialMagicItems[editingIndex])
    } else {
      // Adding new item
      setCurrentItem({ name: "", description: "", maxUses: 0, dailyRecharge: "", currentUses: 0 })
    }
  }, [initialMagicItems, editingIndex])

  const handleSave = () => {
    const updatedMagicItems = [...initialMagicItems]
    
    if (editingIndex !== null && editingIndex >= 0) {
      // Editing existing item
      updatedMagicItems[editingIndex] = currentItem
    } else {
      // Adding new item
      updatedMagicItems.push(currentItem)
    }
    
    onSave(updatedMagicItems)
    onClose()
  }

  const updateCurrentItem = (field: string, value: string | number) => {
    setCurrentItem({ ...currentItem, [field]: value })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {editingIndex !== null && editingIndex >= 0 ? "Edit Magic Item" : "Add Magic Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 max-h-[50vh] overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col w-full gap-2">
              <Label htmlFor="magic-item-name" className="text-sm">
                Name
              </Label>
              <Input
                id="magic-item-name"
                value={currentItem.name}
                onChange={(e) => updateCurrentItem("name", e.target.value)}
                placeholder="Magic item name"
              />
            </div>
            <div className="flex flex-col w-full gap-2">
              <Label htmlFor="magic-item-desc" className="text-sm">
                Description
              </Label>
              <RichTextEditor
                value={currentItem.description}
                onChange={(value) => updateCurrentItem("description", value)}
                placeholder="Magic item description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col w-full gap-2">
                <Label htmlFor="magic-item-uses" className="text-sm">Max uses per day</Label>
                <Input
                  id="magic-item-uses"
                  type="number"
                  min={0}
                  value={currentItem.maxUses ?? 0}
                  onChange={(e) => updateCurrentItem("maxUses", Number.parseInt(e.target.value || "0"))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col w-full gap-2">
                <Label className="text-sm">Daily recharge</Label>
                <Select
                  value={currentItem.dailyRecharge ?? "none"}
                  onValueChange={(val) => updateCurrentItem("dailyRecharge", val === "none" ? "" : val)}
                  disabled={!currentItem.maxUses || currentItem.maxUses < 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1d3">1d3</SelectItem>
                    <SelectItem value="1d4">1d4</SelectItem>
                    <SelectItem value="1d6">1d6</SelectItem>
                    <SelectItem value="1d8">1d8</SelectItem>
                    <SelectItem value="1d10">1d10</SelectItem>
                    <SelectItem value="1d12">1d12</SelectItem>
                    <SelectItem value="1d20">1d20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
