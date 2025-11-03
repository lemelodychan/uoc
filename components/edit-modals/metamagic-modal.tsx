"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"
import { getFeatureUsage, addSingleFeature, updateFeatureUsage } from "@/lib/feature-usage-tracker"
import { getClassLevel } from "@/lib/class-feature-utils"

interface MetamagicOption { name: string; description: string }

interface MetamagicModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

function getMetamagicKnownBySorcererLevel(level: number): number {
  if (level >= 17) return 4
  if (level >= 10) return 3
  if (level >= 3) return 2
  return 0
}

export function MetamagicModal({ isOpen, onClose, character, onSave }: MetamagicModalProps) {
  const usage = getFeatureUsage(character, 'metamagic')
  const useUnified = usage && usage.featureType === 'options_list'

  const convertToMetamagic = (data: any[]): MetamagicOption[] => {
    return data.map(item => {
      if (typeof item === 'string') return { name: item, description: '' }
      if (item.title) return { name: item.title, description: item.description || '' }
      return { name: item.name || '', description: item.description || '' }
    })
  }

  const initialOptions = useUnified ? convertToMetamagic(usage.selectedOptions || []) : []
  const [options, setOptions] = useState<MetamagicOption[]>(initialOptions)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState<MetamagicOption>({ name: '', description: '' })

  useEffect(() => {
    if (isOpen) {
      const current = useUnified ? convertToMetamagic(usage.selectedOptions || []) : []
      setOptions(current)
    }
  }, [isOpen, useUnified, usage])

  const sorcererLevel = getClassLevel(character, 'sorcerer')
  // Always compute the cap from Sorcerer level so it stays accurate with level ups
  const maxKnown = getMetamagicKnownBySorcererLevel(sorcererLevel)

  const handleSave = async () => {
    const selectedOptions = options.map(opt => ({
      id: opt.name.toLowerCase().replace(/\s+/g, '-'),
      title: opt.name,
      description: opt.description,
    }))
    if (useUnified) {
      const updated = updateFeatureUsage(character, 'metamagic', { selectedOptions })
      onSave({ classFeatureSkillsUsage: updated })
    } else {
      const withFeature = addSingleFeature(character, 'metamagic', {
        featureName: 'Metamagic',
        featureType: 'options_list',
        enabledAtLevel: 3,
        maxSelections: getMetamagicKnownBySorcererLevel(sorcererLevel),
      })
      const updated = updateFeatureUsage({ ...character, classFeatureSkillsUsage: withFeature }, 'metamagic', { selectedOptions })
      onSave({ classFeatureSkillsUsage: updated })
    }
    onClose()
  }

  const openAdd = () => { setFormData({ name: '', description: '' }); setEditingIndex(null); setFormOpen(true) }
  const cancelEdit = () => { setFormOpen(false); setEditingIndex(null) }
  const addOption = () => { if (formData.name.trim()) { setOptions([...options, { ...formData }]); setFormOpen(false) } }
  const editOption = (idx: number) => { setFormData(options[idx]); setEditingIndex(idx); setFormOpen(true) }
  const updateOption = () => { if (editingIndex !== null && formData.name.trim()) { const arr = [...options]; arr[editingIndex] = { ...formData }; setOptions(arr); setFormOpen(false); setEditingIndex(null) } }
  const deleteOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Metamagic
            <Badge variant="secondary" className="text-xs">{options.length}/{maxKnown} known</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto flex flex-col gap-3 p-4 max-h-[50vh]">
          {options.map((opt, idx) => (
            <Card key={idx} className="p-3 gap-0">
              <CardHeader className="flex items-start justify-between p-0">
                <CardTitle className="text-md font-body">{opt.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="p-0 h-8 w-8" onClick={() => editOption(idx)}>
                    <Icon icon="lucide:edit" className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="p-0 h-8 w-8 text-[#ce6565] hover:bg-[#ce6565] hover:text-white" onClick={() => deleteOption(idx)}>
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <RichTextDisplay content={opt.description} className="text-sm text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={openAdd} disabled={options.length >= maxKnown}>
            <Icon icon="lucide:plus" className="w-4 h-4" />
            Add Metamagic
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[70vh] p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{editingIndex !== null ? 'Edit Metamagic' : 'Add Metamagic'}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto flex flex-col gap-4 p-4 max-h-[50vh]">
            <div className="flex flex-col gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Quickened Spell" />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} />
            </div>
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
            {editingIndex !== null ? (
              <Button onClick={updateOption} disabled={!formData.name.trim()}>Update</Button>
            ) : (
              <Button onClick={addOption} disabled={!formData.name.trim()}>
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}


