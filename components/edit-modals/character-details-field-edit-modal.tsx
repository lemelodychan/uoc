"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"

interface CharacterDetailsFieldEditModalProps {
  isOpen: boolean
  onClose: () => void
  field: "personalityTraits" | "backstory" | "notes"
  title: string
  value: string
  onSave: (value: string) => void
  placeholder?: string
  canEdit?: boolean
}

export function CharacterDetailsFieldEditModal({
  isOpen,
  onClose,
  field,
  title,
  value,
  onSave,
  placeholder,
  canEdit = true,
}: CharacterDetailsFieldEditModalProps) {
  const [editedValue, setEditedValue] = useState(value)

  // Sync local state with value prop when it changes
  useEffect(() => {
    setEditedValue(value)
  }, [value])

  const handleSave = () => {
    onSave(editedValue)
    onClose()
  }

  const handleCancel = () => {
    setEditedValue(value) // Reset to original value
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Edit {title}</DialogTitle>
        </DialogHeader>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor={field}>{title}</Label>
            <WysiwygEditor
              value={editedValue}
              onChange={(content) => canEdit && setEditedValue(content)}
              placeholder={placeholder || `Enter ${title.toLowerCase()}...`}
            />
          </div>
        </div>
        {canEdit && (
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

