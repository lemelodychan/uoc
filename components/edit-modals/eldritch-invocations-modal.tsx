"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import { CharacterData, EldritchInvocation, getWarlockInvocationsKnown } from "@/lib/character-data"

interface EldritchInvocationsModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function EldritchInvocationsModal({
  isOpen,
  onClose,
  character,
  onSave,
}: EldritchInvocationsModalProps) {
  const [invocations, setInvocations] = useState<EldritchInvocation[]>(character.spellData.eldritchInvocations || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    if (isOpen) {
      setInvocations(character.spellData.eldritchInvocations || [])
    }
  }, [isOpen, character.spellData.eldritchInvocations])

  const handleSave = () => {
    onSave({
      spellData: {
        ...character.spellData,
        eldritchInvocations: invocations,
      },
    })
    onClose()
  }

  const handleAddInvocation = () => {
    if (formData.name.trim()) {
      const newInvocation: EldritchInvocation = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      }
      setInvocations([...invocations, newInvocation])
      setFormData({ name: "", description: "" })
      setFormModalOpen(false)
    }
  }

  const handleEditInvocation = (index: number) => {
    const invocation = invocations[index]
    setFormData({
      name: invocation.name,
      description: invocation.description,
    })
    setEditingIndex(index)
    setFormModalOpen(true)
  }

  const handleUpdateInvocation = () => {
    if (editingIndex !== null && formData.name.trim()) {
      const updatedInvocations = [...invocations]
      updatedInvocations[editingIndex] = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      }
      setInvocations(updatedInvocations)
      setFormData({ name: "", description: "" })
      setEditingIndex(null)
      setFormModalOpen(false)
    }
  }

  const handleDeleteInvocation = (index: number) => {
    setInvocations(invocations.filter((_, i) => i !== index))
  }

  const handleCancelEdit = () => {
    setFormData({ name: "", description: "" })
    setEditingIndex(null)
    setFormModalOpen(false)
  }

  const handleOpenAddForm = () => {
    setFormData({ name: "", description: "" })
    setEditingIndex(null)
    setFormModalOpen(true)
  }

  const maxInvocations = getWarlockInvocationsKnown(character.level)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Eldritch Invocations
            <Badge variant="secondary" className="text-xs">
              {invocations.length}/{maxInvocations} known
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto flex flex-col gap-3 p-4 max-h-[50vh]">
          {/* Invocations List */}
            {invocations.map((invocation, index) => (
              <Card key={index} className="p-3 gap-3">
                <CardHeader className="flex items-center justify-between p-0">
                    <CardTitle className="text-lg">{invocation.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-0 h-8 w-8"
                        onClick={() => handleEditInvocation(index)}
                      >
                        <Icon icon="lucide:edit" className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-0 h-8 w-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white"
                        onClick={() => handleDeleteInvocation(index)}
                      >
                        <Icon icon="lucide:trash-2" className="w-4 h-4" />
                      </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                  <RichTextDisplay content={invocation.description} className="text-sm text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button 
            variant="outline"
            onClick={handleOpenAddForm} 
            disabled={invocations.length >= maxInvocations}
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Add New Invocation
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Add/Edit Form Modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {editingIndex !== null ? "Edit Invocation" : "Add New Invocation"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="min-h-0 overflow-y-auto flex flex-col gap-4 p-4 max-h-[50vh]">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Agonizing Blast"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            {editingIndex !== null ? (
              <Button onClick={handleUpdateInvocation} disabled={!formData.name.trim()}>
                Update Invocation
              </Button>
            ) : (
              <Button onClick={handleAddInvocation} disabled={!formData.name.trim()}>
                <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
                Add Invocation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
