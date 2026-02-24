"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Icon } from "@iconify/react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import type { RaceData } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import { RaceFeatureEditModal } from "./edit-modals/race-feature-edit-modal"
import { RichTextDisplay } from "@/components/ui/rich-text-display"

interface RaceEditorPageProps {
  raceData: RaceData
  canEdit?: boolean
  onSave: (raceData: Partial<RaceData>) => void
  onCancel: () => void
  onDelete: (raceId: string) => void
}

const SIZE_OPTIONS = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

export function RaceEditorPage({
  raceData,
  canEdit = true,
  onSave,
  onCancel,
  onDelete
}: RaceEditorPageProps) {
  const [editingRace, setEditingRace] = useState<RaceData>(raceData)
  const [isSaving, setIsSaving] = useState(false)
  const [featureEditModalOpen, setFeatureEditModalOpen] = useState(false)
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)

      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('folder', 'race-images')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'Failed to upload image'
        throw new Error(errorMessage)
      }

      setEditingRace(prev => ({ ...prev, image_url: result.url }))
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: "destructive"
      })
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  // Update local state when raceData prop changes
  useEffect(() => {
    // Clean up malformed size data
    let cleanedRaceData = { ...raceData }
    
    if (cleanedRaceData.size) {
      // If size is an array with mixed types or JSON strings, clean it up
      if (Array.isArray(cleanedRaceData.size)) {
        const stringSizes = cleanedRaceData.size.filter((s): s is string => typeof s === 'string')
        if (stringSizes.length === 0) {
          cleanedRaceData.size = null
        } else if (stringSizes.length === 1) {
          cleanedRaceData.size = stringSizes[0]
        } else {
          // Convert to choice format
          cleanedRaceData.size = {
            type: 'choice',
            options: stringSizes,
            description: 'You choose the size when you select this race.'
          }
        }
      } else if (typeof cleanedRaceData.size === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(cleanedRaceData.size)
          if (parsed && typeof parsed === 'object' && parsed.options) {
            cleanedRaceData.size = parsed
          }
        } catch {
          // Not JSON, keep as string
        }
      }
    }
    
    // Set default values for is_custom and source if not provided
    if (cleanedRaceData.is_custom === undefined || cleanedRaceData.is_custom === null) {
      cleanedRaceData.is_custom = false
    }
    if (!cleanedRaceData.source || cleanedRaceData.source.trim() === '') {
      cleanedRaceData.source = "Player's Handbook"
    }
    
    setEditingRace(cleanedRaceData)
  }, [raceData])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate required fields
      if (!editingRace.name || editingRace.name.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Race name is required",
          variant: "destructive"
        })
        return
      }

      // Prepare the data for saving
      const raceDataToSave = {
        ...editingRace,
        name: editingRace.name.trim(),
        ...(editingRace.id && editingRace.id.trim() !== '' ? { id: editingRace.id } : {}),
      }
      
      await onSave(raceDataToSave)
      toast({
        title: "Success",
        description: "Race saved successfully"
      })
    } catch (error) {
      console.error('Error saving race:', error)
      toast({
        title: "Error",
        description: "Failed to save race",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    if (editingRace.id && editingRace.id.trim() !== '') {
      if (confirm(`Are you sure you want to delete "${editingRace.name}"? This action cannot be undone.`)) {
        onDelete(editingRace.id)
      }
    }
  }

  // Size handling - can be string, array, or choice object
  const handleSizeChange = (size: string, checked: boolean) => {
    // Get current sizes array from various formats
    let currentSizes: string[] = []
    
    if (typeof editingRace.size === 'string') {
      // Single size string
      currentSizes = [editingRace.size]
    } else if (Array.isArray(editingRace.size)) {
      // Array of sizes - filter out any non-string values
      currentSizes = editingRace.size.filter((s): s is string => typeof s === 'string')
    } else if (editingRace.size && typeof editingRace.size === 'object') {
      // Choice object format
      const sizeObj = editingRace.size as any
      if (sizeObj.options && Array.isArray(sizeObj.options)) {
        currentSizes = sizeObj.options.filter((s: any): s is string => typeof s === 'string')
      }
    }
    
    // Update sizes array
    let newSizes: string[]
    if (checked) {
      if (!currentSizes.includes(size)) {
        newSizes = [...currentSizes, size]
      } else {
        return // Already selected, do nothing
      }
    } else {
      newSizes = currentSizes.filter(s => s !== size)
    }
    
    // Determine final format based on count
    if (newSizes.length === 0) {
      setEditingRace(prev => ({ ...prev, size: null }))
    } else if (newSizes.length === 1) {
      setEditingRace(prev => ({ ...prev, size: newSizes[0] }))
    } else {
      // Multiple sizes - use choice object format
      setEditingRace(prev => ({ 
        ...prev, 
        size: {
          type: 'choice',
          options: newSizes,
          description: 'You choose the size when you select this race.'
        }
      }))
    }
  }

  const isSizeSelected = (size: string): boolean => {
    if (!editingRace.size) return false
    
    if (typeof editingRace.size === 'string') {
      return editingRace.size === size
    }
    
    if (Array.isArray(editingRace.size)) {
      // Filter out non-string values for safety
      return editingRace.size.filter((s): s is string => typeof s === 'string').includes(size)
    }
    
    if (typeof editingRace.size === 'object') {
      const sizeObj = editingRace.size as any
      if (sizeObj.options && Array.isArray(sizeObj.options)) {
        return sizeObj.options.includes(size)
      }
    }
    
    return false
  }

  // Languages handling
  const languages = Array.isArray(editingRace.languages?.fixed)
    ? editingRace.languages.fixed
    : editingRace.languages?.fixed
      ? [editingRace.languages.fixed]
      : []

  const addLanguage = () => {
    const newLang = ""
    const currentFixed = Array.isArray(editingRace.languages?.fixed) 
      ? editingRace.languages.fixed 
      : editingRace.languages?.fixed 
        ? [editingRace.languages.fixed]
        : []
    
    setEditingRace(prev => ({
      ...prev,
      languages: {
        ...prev.languages,
        fixed: [...currentFixed, newLang]
      } as any
    }))
  }

  const updateLanguage = (index: number, value: string) => {
    const currentFixed = Array.isArray(editingRace.languages?.fixed) 
      ? editingRace.languages.fixed 
      : editingRace.languages?.fixed 
        ? [editingRace.languages.fixed]
        : []
    
    const updated = [...currentFixed]
    updated[index] = value
    
    setEditingRace(prev => ({
      ...prev,
      languages: {
        ...prev.languages,
        fixed: updated
      } as any
    }))
  }

  const removeLanguage = (index: number) => {
    const currentFixed = Array.isArray(editingRace.languages?.fixed) 
      ? editingRace.languages.fixed 
      : editingRace.languages?.fixed 
        ? [editingRace.languages.fixed]
        : []
    
    const updated = (currentFixed as string[]).filter((_: string, i: number) => i !== index)
    
    setEditingRace(prev => ({
      ...prev,
      languages: {
        ...prev.languages,
        fixed: updated.length === 0 ? null : (updated.length === 1 ? updated[0] : updated)
      } as any
    }))
  }

  // Features handling
  const handleAddFeature = () => {
    setEditingFeatureIndex(null)
    setFeatureEditModalOpen(true)
  }

  const handleEditFeature = (index: number) => {
    setEditingFeatureIndex(index)
    setFeatureEditModalOpen(true)
  }

  const handleFeatureSave = (feature: any) => {
    if (!feature) {
      // Delete feature
      const currentFeatures = editingRace.features || []
      const updated = currentFeatures.filter((_, i) => i !== editingFeatureIndex)
      setEditingRace(prev => ({
        ...prev,
        features: updated.length === 0 ? null : updated
      }))
    } else {
      const currentFeatures = editingRace.features || []
      
      if (editingFeatureIndex === null) {
        // Add new feature
        setEditingRace(prev => ({
          ...prev,
          features: [...currentFeatures, feature]
        }))
      } else {
        // Update existing feature
        const updated = currentFeatures.map((f, i) => i === editingFeatureIndex ? feature : f)
        setEditingRace(prev => ({
          ...prev,
          features: updated
        }))
      }
    }
    setFeatureEditModalOpen(false)
    setEditingFeatureIndex(null)
  }

  // Ability Score Increase patterns - we'll create a comprehensive editor
  const renderASIEditor = () => {
    const asi = editingRace.ability_score_increases
    
    // Determine current pattern type for display
    const currentPatternType = (() => {
      if (!asi) return "none"
      if (Array.isArray(asi)) return "array"
      if (asi.type === 'fixed_multi') return "fixed_multi"
      if (asi.type === 'choice') return "choice"
      if (asi.type === 'custom') return "custom"
      return "none"
    })()
    
    // Common handler for pattern type changes
    const handlePatternTypeChange = (value: string) => {
      if (value === "none") {
        setEditingRace(prev => ({ ...prev, ability_score_increases: null }))
      } else if (value === "array") {
        setEditingRace(prev => ({ ...prev, ability_score_increases: [] }))
      } else if (value === "fixed_multi") {
        setEditingRace(prev => ({ 
          ...prev, 
          ability_score_increases: { 
            type: 'fixed_multi',
            abilities: {
              strength: 0,
              dexterity: 0,
              constitution: 0,
              intelligence: 0,
              wisdom: 0,
              charisma: 0
            }
          } 
        }))
      } else if (value === "choice") {
        setEditingRace(prev => ({ ...prev, ability_score_increases: { type: 'choice', choices: { count: 2, increase: 1, description: '', max_score: 20 } } }))
      } else if (value === "custom") {
        setEditingRace(prev => ({ ...prev, ability_score_increases: { type: 'custom', fixed: null, choices: null } }))
      }
    }

    // Common pattern selector component
    const patternSelector = (
      <div className="flex flex-col gap-2">
        <Select
          value={currentPatternType}
          onValueChange={handlePatternTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ASI pattern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="array">Standard Array</SelectItem>
            <SelectItem value="fixed_multi">Fixed Multi-Ability</SelectItem>
            <SelectItem value="choice">Choice-based</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
    
    if (!asi) {
      return patternSelector
    }

    // Array format: [{"ability": "Dexterity", "increase": 2}]
    if (Array.isArray(asi)) {
      return (
        <div className="flex flex-col gap-3">
          {patternSelector}
          <p className="text-xs text-muted-foreground">In character creation, total ability score is capped at 19 (point buy 15 + race + ASI/feat).</p>
          <div className="flex flex-col gap-2 p-3 bg-background border rounded-lg">
            <Label>Ability Score Increases</Label>
            <div className="flex flex-col gap-2">
            {asi.map((item: any, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <Select
                  value={item.ability?.toLowerCase() || ""}
                  onValueChange={(value) => {
                    const updated = [...asi]
                    updated[index] = { ...item, ability: value.charAt(0).toUpperCase() + value.slice(1) }
                    setEditingRace(prev => ({ ...prev, ability_score_increases: updated }))
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
                      <SelectItem key={ability} value={ability}>
                        {ability.charAt(0).toUpperCase() + ability.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={item.increase || 1}
                  onChange={(e) => {
                    const updated = [...asi]
                    updated[index] = { ...item, increase: parseInt(e.target.value) || 1 }
                    setEditingRace(prev => ({ ...prev, ability_score_increases: updated }))
                  }}
                  className="w-20 h-9"
                  min="1"
                  max="3"
                />
                <Button
                  variant="outline"
                  className="w-9 h-9 text-destructive hover:bg-destructive hover:text-white"
                  size="sm"
                  onClick={() => {
                    const updated = asi.filter((_: any, i: number) => i !== index)
                    setEditingRace(prev => ({ ...prev, ability_score_increases: updated.length === 0 ? null : updated }))
                  }}
                >
                  <Icon icon="lucide:trash-2" className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit" 
              onClick={() => {
                setEditingRace(prev => ({
                  ...prev,
                  ability_score_increases: [...(asi || []), { ability: 'Strength', increase: 1 }]
                }))
              }}
              disabled={asi.length >= 2}
            >
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add Ability Bonus
            </Button>
            {asi.length >= 2 && (
              <p className="text-xs text-muted-foreground">Maximum of 2 abilities allowed (e.g. +2 to one, +1 to another)</p>
            )}
          </div>
          </div>
        </div>
      )
    }

    // Fixed Multi-Ability format: { type: 'fixed_multi', abilities: { strength: 1, dexterity: 1, ... } }
    if (asi.type === 'fixed_multi') {
      const abilities = asi.abilities || {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0
      }
      
      const abilityNames: Array<{key: string, label: string}> = [
        { key: 'strength', label: 'Strength' },
        { key: 'dexterity', label: 'Dexterity' },
        { key: 'constitution', label: 'Constitution' },
        { key: 'intelligence', label: 'Intelligence' },
        { key: 'wisdom', label: 'Wisdom' },
        { key: 'charisma', label: 'Charisma' }
      ]
      
      return (
        <div className="flex flex-col gap-3">
          {patternSelector}
          <div className="flex flex-col gap-4 p-3 bg-background border rounded-lg">
            <p className="text-sm text-muted-foreground">
              Set fixed increases customized for each ability score (e.g., Human gets +1 to all abilities)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {abilityNames.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 w-fit">
                  <Label className="w-28 text-sm">{label}</Label>
                  <Input
                    type="number"
                    value={abilities[key] || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      setEditingRace(prev => ({
                        ...prev,
                        ability_score_increases: {
                          ...(prev.ability_score_increases as any),
                          type: 'fixed_multi',
                          abilities: {
                            ...abilities,
                            [key]: Math.max(0, Math.min(3, value)) // Clamp between 0 and 3
                          }
                        }
                      }))
                    }}
                    className="w-20 h-8"
                    min="0"
                    max="2"
                  />
                  <Badge variant="secondary" className="text-sm text-muted-foreground">+{abilities[key] || 0}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Choice type
    if (asi.type === 'choice') {
      // Determine which choice mode we're using
      const hasPattern = asi.choices?.pattern
      const mode = hasPattern ? 'pattern' : 'count' // Default to count
      
      return (
        <div className="flex flex-col gap-3">
          {patternSelector}

          <div className="flex flex-col gap-4 p-3 border rounded-lg bg-background">
            {/* Mode selector */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Choice Type</Label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (value === 'pattern') {
                    setEditingRace(prev => ({
                      ...prev,
                      ability_score_increases: {
                        type: 'choice',
                        choices: {
                          pattern: 'three_ones', // Keep pattern for backward compatibility, but use count/increase for logic
                          count: asi.choices?.count || 3,
                          increase: asi.choices?.increase || 1,
                          description: asi.choices?.description || '',
                          max_score: asi.choices?.max_score || 20
                        }
                      }
                    }))
                  } else if (value === 'count') {
                    setEditingRace(prev => ({
                      ...prev,
                      ability_score_increases: {
                        type: 'choice',
                        choices: {
                          count: asi.choices?.count || 2,
                          increase: asi.choices?.increase || 1,
                          description: asi.choices?.description || '',
                          max_score: asi.choices?.max_score || 20
                        }
                      }
                    }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pattern">Pattern-based (choose X selections, allow duplicates)</SelectItem>
                  <SelectItem value="count">Count-based (choose X abilities to add +Y each)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pattern mode - unified pattern that allows selecting same ability multiple times */}
            {mode === 'pattern' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Number of selections</Label>
                    <Input
                      type="number"
                      value={asi.choices?.count || 3}
                      onChange={(e) => {
                        setEditingRace(prev => ({
                          ...prev,
                          ability_score_increases: {
                            ...prev.ability_score_increases,
                            choices: {
                              ...asi.choices,
                              count: parseInt(e.target.value) || 3
                            }
                          }
                        }))
                      }}
                      className="w-full"
                      min="2"
                      max="3"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Increase per selection</Label>
                    <Input
                      type="number"
                      value={asi.choices?.increase || 1}
                      onChange={(e) => {
                        setEditingRace(prev => ({
                          ...prev,
                          ability_score_increases: {
                            ...prev.ability_score_increases,
                            choices: {
                              ...asi.choices,
                              increase: parseInt(e.target.value) || 1
                            }
                          }
                        }))
                      }}
                      className="w-full"
                      min="1"
                      max="2"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Players can select the same ability multiple times (e.g., selecting Strength twice with +1 each = +2 total)
                </p>
              </div>
            )}

            {/* Count mode */}
            {mode === 'count' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Number of abilities</Label>
                    <Input
                      type="number"
                      value={asi.choices?.count || 2}
                      onChange={(e) => {
                        setEditingRace(prev => ({
                          ...prev,
                          ability_score_increases: {
                            ...prev.ability_score_increases,
                            choices: {
                              ...asi.choices,
                              count: parseInt(e.target.value) || 2
                            }
                          }
                        }))
                      }}
                      className="w-full"
                      min="2"
                      max="3"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Label className="text-sm font-medium">Increase per ability</Label>
                    <Input
                      type="number"
                      value={asi.choices?.increase || 1}
                      onChange={(e) => {
                        setEditingRace(prev => ({
                          ...prev,
                          ability_score_increases: {
                            ...prev.ability_score_increases,
                            choices: {
                              ...asi.choices,
                              increase: parseInt(e.target.value) || 1
                            }
                          }
                        }))
                      }}
                      className="w-full"
                      min="1"
                      max="2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Common fields */}
            <div className="flex flex-row gap-4">
              <div className="flex flex-col gap-2 w-full">
                <Label className="text-sm font-medium">Description <Badge variant="outline" className="text-xs bg-accent/70 text-accent-foreground border-accent/50">Optional</Badge></Label>
                <Input
                  value={asi.choices?.description || ''}
                  onChange={(e) => {
                    setEditingRace(prev => ({
                      ...prev,
                      ability_score_increases: {
                        ...prev.ability_score_increases,
                        choices: {
                          ...asi.choices,
                          description: e.target.value
                        }
                      }
                    }))
                  }}
                  placeholder="e.g., Choose ability score increases..."
                />
              </div>

              <div className="flex flex-col gap-2 w-[200px]">
                <Label className="text-sm font-medium">Max Score <Badge variant="outline" className="text-xs bg-accent/70 text-accent-foreground border-accent/50">Optional</Badge></Label>
                <Input
                  type="number"
                  value={asi.choices?.max_score || 20}
                  onChange={(e) => {
                    setEditingRace(prev => ({
                      ...prev,
                      ability_score_increases: {
                        ...prev.ability_score_increases,
                        choices: {
                          ...asi.choices,
                          max_score: parseInt(e.target.value) || 20
                        }
                      }
                    }))
                  }}
                  className="w-full"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Custom type (e.g., Half-Elf, Custom Lineage)
    if (asi.type === 'custom') {
      return (
        <div className="flex flex-col gap-3">
          {patternSelector}
          <div className="flex flex-col gap-2">
            {asi.fixed && (
            <div className="flex gap-2 items-center p-3 border rounded-lg bg-background">
              <Label>Fixed Increase:</Label>
              <Select
                value={asi.fixed.ability?.toLowerCase() || ""}
                onValueChange={(value) => {
                  setEditingRace(prev => ({
                    ...prev,
                    ability_score_increases: {
                      ...asi,
                      fixed: { ...asi.fixed, ability: value.charAt(0).toUpperCase() + value.slice(1) }
                    }
                  }))
                }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => (
                    <SelectItem key={ability} value={ability}>
                      {ability.charAt(0).toUpperCase() + ability.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={asi.fixed.increase || 1}
                onChange={(e) => {
                  setEditingRace(prev => ({
                    ...prev,
                    ability_score_increases: {
                      ...asi,
                      fixed: { ...asi.fixed, increase: parseInt(e.target.value) || 1 }
                    }
                  }))
                }}
                className="w-20"
                min="1"
                max="3"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-9 h-9 text-destructive hover:bg-destructive hover:text-white"
                onClick={() => {
                  setEditingRace(prev => ({
                    ...prev,
                    ability_score_increases: { ...asi, fixed: null }
                  }))
                }}
              >
                <Icon icon="lucide:x" className="w-4 h-4" />
              </Button>
            </div>
          )}
          {!asi.fixed && (
            <Button variant="outline" className="w-fit" size="sm" onClick={() => {
              setEditingRace(prev => ({
                ...prev,
                ability_score_increases: {
                  ...asi,
                  fixed: { ability: 'Charisma', increase: 2 }
                }
              }))
            }}>
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add Fixed Increase
            </Button>
          )}
          {asi.choices && (
            <div className="flex flex-col gap-2 p-3 border rounded-lg bg-background">
              <Label>Description for choices <Badge variant="outline" className="text-xs bg-accent/70 text-accent-foreground border-accent/50">Optional</Badge></Label>
              <Input
                placeholder="Description"
                value={asi.choices.description || ''}
                onChange={(e) => {
                  setEditingRace(prev => ({
                    ...prev,
                    ability_score_increases: {
                      ...asi,
                      choices: { ...asi.choices, description: e.target.value }
                    }
                  }))
                }}
              />
              {/* Choices can be complex - simplified for now */}
              <div className="text-xs text-muted-foreground">
                Complex choice patterns (like Half-Elf +2/+1/+1 or Custom Lineage +2) are stored in the choices object.
                For advanced patterns, edit the JSON directly or use the database.
              </div>
            </div>
          )}
          {!asi.choices && (
            <Button variant="outline" size="sm" onClick={() => {
              setEditingRace(prev => ({
                ...prev,
                ability_score_increases: {
                  ...asi,
                  choices: { description: '', pattern: 'one_plus_two' }
                }
              }))
            }}>
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add Choices
            </Button>
          )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={onCancel}
          className="hover:text-primary transition-colors hover:cursor-pointer"
        >
          Race Management
        </button>
        <Icon icon="lucide:chevron-right" className="w-4 h-4" />
        <span className="text-muted-foreground">
          {editingRace.id ? `Edit ${editingRace.name}` : 'Create New Race'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold">
            {editingRace.id ? `Edit ${editingRace.name}` : 'Create New Race'}
          </h1>
          <p className="text-muted-foreground">
            {editingRace.id ? 'Modify race details and features' : 'Create a new custom race'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <Icon icon="lucide:x" className="w-4 h-4" />
            Cancel
          </Button>
          {editingRace.id && editingRace.id.trim() !== '' && canEdit && (
            <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive hover:text-white">
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="lucide:save" className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="race-name">Race Name *</Label>
            <Input
              id="race-name"
              value={editingRace.name}
              onChange={(e) => setEditingRace(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter race name"
              className="bg-background"
              disabled={!canEdit}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="race-description">Description</Label>
            <RichTextEditor
              value={editingRace.description || ""}
              onChange={(value) => setEditingRace(prev => ({ ...prev, description: value }))}
              placeholder="Enter race description"
              rows={6}
            />
          </div>

          {/* Race Image */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="race-image">Race Image</Label>
            <div className="flex flex-row gap-2">
              {editingRace.image_url && (
                  <div className="relative w-40 h-32 border rounded-md overflow-hidden bg-muted">
                    <img
                      src={editingRace.image_url}
                      alt="Race preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
              )}
              <div className="flex flex-col gap-2 w-full">
                <Input
                  id="race-image"
                  value={editingRace.image_url || ""}
                  onChange={(e) => setEditingRace(prev => ({ ...prev, image_url: e.target.value }))}
                  className="flex h-9 w-full"
                  placeholder="https://... or upload an image"
                  disabled={!canEdit}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="raceImageFileInput"
                  disabled={!canEdit}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage || !canEdit}
                  className="h-9 whitespace-nowrap w-fit"
                >
                  {uploadingImage ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:upload" className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="race-speed">Speed</Label>
              <Input
                id="race-speed"
                type="number"
                value={editingRace.speed || 30}
                onChange={(e) => setEditingRace(prev => ({ ...prev, speed: parseInt(e.target.value) || 30 }))}
                placeholder="30"
                className="bg-background w-[100px]"
                disabled={!canEdit}
                min="0"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Size</Label>
              <div className="flex flex-wrap gap-4 h-8">
                {SIZE_OPTIONS.map(size => (
                  <div key={size} className="flex items-center gap-2 flex-row">
                    <Checkbox
                      id={`size-${size}`}
                      checked={isSizeSelected(size)}
                      onCheckedChange={(checked) => handleSizeChange(size, checked as boolean)}
                      disabled={!canEdit}
                    />
                    <Label htmlFor={`size-${size}`} className="cursor-pointer text-sm font-normal">{size}</Label>
                  </div>
                ))}
              </div>
              {editingRace.size && typeof editingRace.size === 'object' && 
               !Array.isArray(editingRace.size) &&
               (editingRace.size as any).type === 'choice' && (
                <div className="flex flex-col gap-2 mt-2">
                  <Label className="text-xs">Size Choice Description</Label>
                  <Input
                    value={(editingRace.size as any).description || ''}
                    onChange={(e) => {
                      setEditingRace(prev => ({
                        ...prev,
                        size: {
                          ...(prev.size as any),
                          description: e.target.value
                        }
                      }))
                    }}
                    placeholder="e.g., You choose the size when you select this race."
                    disabled={!canEdit}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Multiple sizes selected - player can choose</p>
                </div>
              )}
              {Array.isArray(editingRace.size) && editingRace.size.filter((s): s is string => typeof s === 'string').length > 1 && (
                <p className="text-xs text-muted-foreground">Multiple sizes selected - will be converted to choice format on save</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {languages.map((lang: string, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={lang}
                  onChange={(e) => updateLanguage(index, e.target.value)}
                  placeholder="Language name"
                  className="bg-background"
                  disabled={!canEdit}
                />
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeLanguage(index)}
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={addLanguage} className="w-fit">
                <Icon icon="lucide:plus" className="w-4 h-4" />
                Add Language
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ability Score Increases */}
      <Card>
        <CardHeader>
          <CardTitle>Ability Score Increases</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canEdit ? renderASIEditor() : (
            <div className="text-sm text-muted-foreground">
              {editingRace.ability_score_increases ? JSON.stringify(editingRace.ability_score_increases, null, 2) : 'None'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Race Features</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {(editingRace.features || []).map((feature: any, index: number) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg bg-card">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-md">{feature.name || "Unnamed Feature"}</div>
                    {feature.feature_type && (
                      <Badge variant="outline" className="text-xs">
                        {feature.feature_type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <RichTextDisplay content={feature.description || "No description"} />
                  </div>
                  {feature.feature_type === 'skill_proficiency' && (
                    <div className="text-xs text-muted-foreground">
                      {feature.feature_skill_type === 'choice' 
                        ? `Choice: ${feature.skill_options?.length || 0} skill(s) available, max ${feature.max_selections || 1} selection(s)`
                        : `Fixed: ${feature.feature_skill_type}`}
                    </div>
                  )}
                  {feature.feature_type === 'weapon_proficiency' && feature.weapons && (
                    <div className="text-xs text-muted-foreground">
                      Weapons: {Array.isArray(feature.weapons) ? feature.weapons.join(', ') : feature.weapons}
                    </div>
                  )}
                  {feature.feature_type === 'tool_proficiency' && feature.tools && (
                    <div className="text-xs text-muted-foreground">
                      Tools: {Array.isArray(feature.tools) ? feature.tools.join(', ') : feature.tools}
                    </div>
                  )}
                  {(feature.uses_per_long_rest || feature.usesPerLongRest) && (
                    <div className="text-xs text-muted-foreground">
                      Uses per long rest: {typeof (feature.uses_per_long_rest || feature.usesPerLongRest) === 'string' 
                        ? (feature.uses_per_long_rest || feature.usesPerLongRest)
                        : (feature.uses_per_long_rest || feature.usesPerLongRest)}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFeature(index)}
                      className="w-9 h-9"
                    >
                      <Icon icon="lucide:edit" className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {(editingRace.features || []).length === 0 && (
              <div className="text-sm text-muted-foreground text-center">
                No features added yet
              </div>
            )}
          </div>
          {canEdit && (
            <Button variant="outline" onClick={handleAddFeature} className="w-fit">
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add Feature
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Spellcasting Ability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">Spellcasting <Badge variant="outline" className="text-xs bg-accent/70 text-accent-foreground border-accent/50">Optional</Badge></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Select
              value={(() => {
                const sca = editingRace.spellcasting_ability
                if (!sca || sca === null) return "none"
                if (typeof sca === 'string') return "single"
                if (typeof sca === 'object' && sca.type === 'choice') return "choice"
                return "none"
              })()}
              onValueChange={(value) => {
                if (value === "none") {
                  setEditingRace(prev => ({ ...prev, spellcasting_ability: null }))
                } else if (value === "single") {
                  setEditingRace(prev => ({ ...prev, spellcasting_ability: "intelligence" }))
                } else if (value === "choice") {
                  setEditingRace(prev => ({
                    ...prev,
                    spellcasting_ability: {
                      type: 'choice',
                      options: [],
                      description: ''
                    }
                  }))
                }
              }}
              disabled={!canEdit}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="single">Single Ability</SelectItem>
                <SelectItem value="choice">Choice (Player selects)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Single Ability Selection */}
          {editingRace.spellcasting_ability && typeof editingRace.spellcasting_ability === 'string' && (
            <div className="flex flex-col gap-2">
              <Label>Selected Ability</Label>
              <Select
                value={editingRace.spellcasting_ability}
                onValueChange={(value) => {
                  setEditingRace(prev => ({
                    ...prev,
                    spellcasting_ability: value
                  }))
                }}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="dexterity">Dexterity</SelectItem>
                  <SelectItem value="constitution">Constitution</SelectItem>
                  <SelectItem value="intelligence">Intelligence</SelectItem>
                  <SelectItem value="wisdom">Wisdom</SelectItem>
                  <SelectItem value="charisma">Charisma</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Choice-Based Selection */}
          {editingRace.spellcasting_ability && 
           typeof editingRace.spellcasting_ability === 'object' && 
           editingRace.spellcasting_ability !== null &&
           (editingRace.spellcasting_ability as any).type === 'choice' && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-background">
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Input
                  value={(editingRace.spellcasting_ability as any).description || ''}
                  onChange={(e) => {
                    setEditingRace(prev => ({
                      ...prev,
                      spellcasting_ability: {
                        ...(prev.spellcasting_ability as any),
                        description: e.target.value
                      }
                    }))
                  }}
                  placeholder="e.g., Intelligence, Wisdom, or Charisma is your spellcasting ability..."
                  disabled={!canEdit}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <Label>Available Options</Label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-card border rounded">
                  {['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map(ability => {
                    const currentOptions = (editingRace.spellcasting_ability as any).options || []
                    const isSelected = currentOptions.includes(ability)
                    return (
                      <div key={ability} className="flex items-center space-x-2">
                        <Checkbox
                          id={`spellcasting-${ability}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const currentOptions = (editingRace.spellcasting_ability as any).options || []
                            const updated = checked
                              ? [...currentOptions, ability]
                              : currentOptions.filter((opt: string) => opt !== ability)
                            setEditingRace(prev => ({
                              ...prev,
                              spellcasting_ability: {
                                ...(prev.spellcasting_ability as any),
                                options: updated
                              }
                            }))
                          }}
                          disabled={!canEdit}
                        />
                        <Label htmlFor={`spellcasting-${ability}`} className="text-sm cursor-pointer">
                          {ability}
                        </Label>
                      </div>
                    )
                  })}
                </div>
                {(editingRace.spellcasting_ability as any).options && 
                 (editingRace.spellcasting_ability as any).options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(editingRace.spellcasting_ability as any).options.map((ability: string) => (
                      <Badge key={ability} variant="secondary">
                        {ability}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Race Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Race Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-custom"
              checked={editingRace.is_custom ?? false}
              onCheckedChange={(checked) => setEditingRace(prev => ({ ...prev, is_custom: checked as boolean }))}
              disabled={!canEdit}
            />
            <Label htmlFor="is-custom" className="cursor-pointer">Is Custom Race</Label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="race-source">Source</Label>
            <Input
              id="race-source"
              value={editingRace.source || ""}
              onChange={(e) => setEditingRace(prev => ({ ...prev, source: e.target.value }))}
              placeholder="e.g., Player's Handbook, Tasha's Cauldron of Everything, Custom"
              className="bg-background"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Race Feature Edit Modal */}
      {featureEditModalOpen && (
        <RaceFeatureEditModal
          isOpen={featureEditModalOpen}
          onClose={() => {
            setFeatureEditModalOpen(false)
            setEditingFeatureIndex(null)
          }}
          feature={editingFeatureIndex !== null ? (editingRace.features?.[editingFeatureIndex] || null) : null}
          featureIndex={editingFeatureIndex}
          onSave={handleFeatureSave}
        />
      )}
    </div>
  )
}
