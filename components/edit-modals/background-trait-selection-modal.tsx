"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import { loadBackgroundDetails, type BackgroundData } from "@/lib/database"

interface BackgroundTraitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  backgroundId: string
  existingBackgroundData?: {
    defining_events?: Array<{ number: number; text: string }>
    personality_traits?: Array<{ number: number; text: string }>
    ideals?: Array<{ number: number; text: string }>
    bonds?: Array<{ number: number; text: string }>
    flaws?: Array<{ number: number; text: string }>
  } | null
  onSave: (backgroundData: {
    defining_events?: Array<{ number: number; text: string }>
    personality_traits?: Array<{ number: number; text: string }>
    ideals?: Array<{ number: number; text: string }>
    bonds?: Array<{ number: number; text: string }>
    flaws?: Array<{ number: number; text: string }>
  }) => void
}

export function BackgroundTraitSelectionModal({ 
  isOpen, 
  onClose, 
  backgroundId, 
  existingBackgroundData,
  onSave 
}: BackgroundTraitSelectionModalProps) {
  const [backgroundData, setBackgroundData] = useState<BackgroundData | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Trait selections
  const [backgroundDefiningEvents, setBackgroundDefiningEvents] = useState<Array<{ number: number; text: string }>>(
    existingBackgroundData?.defining_events || []
  )
  const [backgroundPersonalityTraits, setBackgroundPersonalityTraits] = useState<Array<{ number: number; text: string }>>(
    existingBackgroundData?.personality_traits || []
  )
  const [backgroundIdeals, setBackgroundIdeals] = useState<Array<{ number: number; text: string }>>(
    existingBackgroundData?.ideals || []
  )
  const [backgroundBonds, setBackgroundBonds] = useState<Array<{ number: number; text: string }>>(
    existingBackgroundData?.bonds || []
  )
  const [backgroundFlaws, setBackgroundFlaws] = useState<Array<{ number: number; text: string }>>(
    existingBackgroundData?.flaws || []
  )

  // Load background data when modal opens
  useEffect(() => {
    if (isOpen && backgroundId) {
      setLoading(true)
      loadBackgroundDetails(backgroundId).then(({ background, error }) => {
        if (error) {
          console.error("Error loading background:", error)
        } else if (background) {
          setBackgroundData(background)
        }
        setLoading(false)
      })
    }
  }, [isOpen, backgroundId])

  // Reset selections when modal opens with existing data
  useEffect(() => {
    if (isOpen && existingBackgroundData) {
      setBackgroundDefiningEvents(existingBackgroundData.defining_events || [])
      setBackgroundPersonalityTraits(existingBackgroundData.personality_traits || [])
      setBackgroundIdeals(existingBackgroundData.ideals || [])
      setBackgroundBonds(existingBackgroundData.bonds || [])
      setBackgroundFlaws(existingBackgroundData.flaws || [])
    }
  }, [isOpen, existingBackgroundData])

  const handleSave = () => {
    const backgroundDataToSave: {
      defining_events?: Array<{ number: number; text: string }>
      personality_traits?: Array<{ number: number; text: string }>
      ideals?: Array<{ number: number; text: string }>
      bonds?: Array<{ number: number; text: string }>
      flaws?: Array<{ number: number; text: string }>
    } = {}

    if (backgroundDefiningEvents.length > 0) {
      backgroundDataToSave.defining_events = backgroundDefiningEvents
    }
    if (backgroundPersonalityTraits.length > 0) {
      backgroundDataToSave.personality_traits = backgroundPersonalityTraits
    }
    if (backgroundIdeals.length > 0) {
      backgroundDataToSave.ideals = backgroundIdeals
    }
    if (backgroundBonds.length > 0) {
      backgroundDataToSave.bonds = backgroundBonds
    }
    if (backgroundFlaws.length > 0) {
      backgroundDataToSave.flaws = backgroundFlaws
    }

    onSave(backgroundDataToSave)
    onClose()
  }

  const handleCancel = () => {
    // Reset to existing data
    if (existingBackgroundData) {
      setBackgroundDefiningEvents(existingBackgroundData.defining_events || [])
      setBackgroundPersonalityTraits(existingBackgroundData.personality_traits || [])
      setBackgroundIdeals(existingBackgroundData.ideals || [])
      setBackgroundBonds(existingBackgroundData.bonds || [])
      setBackgroundFlaws(existingBackgroundData.flaws || [])
    } else {
      setBackgroundDefiningEvents([])
      setBackgroundPersonalityTraits([])
      setBackgroundIdeals([])
      setBackgroundBonds([])
      setBackgroundFlaws([])
    }
    onClose()
  }

  if (!backgroundData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Select Background Traits</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                <span>Loading background...</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Background not found</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:scroll-text" className="w-5 h-5" />
            Select Background Traits: {backgroundData.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
          {/* Background Description */}
          {backgroundData.description && (
            <div className="p-3 border rounded-lg bg-muted/50">
              <RichTextDisplay content={backgroundData.description} />
            </div>
          )}

          {/* Numbered Items - Defining Events */}
          {backgroundData.defining_events && backgroundData.defining_events.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-md font-medium">
                {backgroundData.defining_events_title || 'Background Setup'}
              </Label>
              <p className="text-xs text-muted-foreground">Choose or roll for 1 defining event</p>
              <div className="flex flex-col gap-2">
                {(() => {
                  const selectedEvent = backgroundDefiningEvents[0]
                  return (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">Event</Badge>
                      <div className="flex-1">
                        {selectedEvent ? (
                          <span className="text-sm">{selectedEvent.text}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not selected</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedEvent?.number.toString() || ""}
                          onValueChange={(value) => {
                            const event = backgroundData.defining_events?.find((e: any) => e.number === parseInt(value))
                            if (event) {
                              setBackgroundDefiningEvents([{ number: event.number, text: event.text }])
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select event" />
                          </SelectTrigger>
                          <SelectContent>
                            {(backgroundData.defining_events || []).map((event: any) => (
                              <SelectItem key={event.number} value={event.number.toString()}>
                                {event.number}: {event.text.substring(0, 50)}{event.text.length > 50 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxNumber = backgroundData.defining_events?.length || 0
                            if (maxNumber > 0) {
                              const roll = Math.floor(Math.random() * maxNumber) + 1
                              const rolledEvent = backgroundData.defining_events?.find((e: any) => e.number === roll)
                              if (rolledEvent) {
                                setBackgroundDefiningEvents([{ number: rolledEvent.number, text: rolledEvent.text }])
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:dice-6" className="w-4 h-4" />
                          Roll d{backgroundData.defining_events?.length || 0}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Numbered Items - Personality Traits */}
          {backgroundData.personality_traits && backgroundData.personality_traits.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-md font-medium">Personality Traits</Label>
              <p className="text-xs text-muted-foreground">Choose or roll for 1 personality trait</p>
              <div className="flex flex-col gap-2">
                {(() => {
                  const selectedTrait = backgroundPersonalityTraits[0] || null
                  return (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">Personality Trait</Badge>
                      <div className="flex-1">
                        {selectedTrait ? (
                          <span className="text-sm">{selectedTrait.text}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not selected</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTrait?.number.toString() || ""}
                          onValueChange={(value) => {
                            const trait = backgroundData.personality_traits?.find((t: any) => t.number === parseInt(value))
                            if (trait) {
                              setBackgroundPersonalityTraits([{ number: trait.number, text: trait.text }])
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select trait" />
                          </SelectTrigger>
                          <SelectContent>
                            {(backgroundData.personality_traits || []).map((trait: any) => (
                              <SelectItem key={trait.number} value={trait.number.toString()}>
                                {trait.number}: {trait.text.substring(0, 50)}{trait.text.length > 50 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const traits = backgroundData.personality_traits || []
                            if (traits.length > 0) {
                              const rollIndex = Math.floor(Math.random() * traits.length)
                              const rolledTrait = traits[rollIndex]
                              if (rolledTrait) {
                                setBackgroundPersonalityTraits([{ number: rolledTrait.number, text: rolledTrait.text }])
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:dice-6" className="w-4 h-4" />
                          Roll d{backgroundData.personality_traits?.length || 0}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Numbered Items - Ideals */}
          {backgroundData.ideals && backgroundData.ideals.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-md font-medium">Ideals</Label>
              <p className="text-xs text-muted-foreground">Choose or roll for 1 ideal</p>
              <div className="flex flex-col gap-2">
                {(() => {
                  const selectedIdeal = backgroundIdeals[0]
                  return (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">Ideal</Badge>
                      <div className="flex-1">
                        {selectedIdeal ? (
                          <span className="text-sm">{selectedIdeal.text}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not selected</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedIdeal?.number.toString() || ""}
                          onValueChange={(value) => {
                            const ideal = backgroundData.ideals?.find((i: any) => i.number === parseInt(value))
                            if (ideal) {
                              setBackgroundIdeals([{ number: ideal.number, text: ideal.text }])
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select ideal" />
                          </SelectTrigger>
                          <SelectContent>
                            {(backgroundData.ideals || []).map((ideal: any) => (
                              <SelectItem key={ideal.number} value={ideal.number.toString()}>
                                {ideal.number}: {ideal.text.substring(0, 50)}{ideal.text.length > 50 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxNumber = backgroundData.ideals?.length || 0
                            if (maxNumber > 0) {
                              const roll = Math.floor(Math.random() * maxNumber) + 1
                              const rolledIdeal = backgroundData.ideals?.find((i: any) => i.number === roll)
                              if (rolledIdeal) {
                                setBackgroundIdeals([{ number: rolledIdeal.number, text: rolledIdeal.text }])
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:dice-6" className="w-4 h-4" />
                          Roll d{backgroundData.ideals?.length || 0}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Numbered Items - Bonds */}
          {backgroundData.bonds && backgroundData.bonds.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-md font-medium">Bonds</Label>
              <p className="text-xs text-muted-foreground">Choose or roll for 1 bond</p>
              <div className="flex flex-col gap-2">
                {(() => {
                  const selectedBond = backgroundBonds[0]
                  return (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">Bond</Badge>
                      <div className="flex-1">
                        {selectedBond ? (
                          <span className="text-sm">{selectedBond.text}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not selected</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedBond?.number.toString() || ""}
                          onValueChange={(value) => {
                            const bond = backgroundData.bonds?.find((b: any) => b.number === parseInt(value))
                            if (bond) {
                              setBackgroundBonds([{ number: bond.number, text: bond.text }])
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select bond" />
                          </SelectTrigger>
                          <SelectContent>
                            {(backgroundData.bonds || []).map((bond: any) => (
                              <SelectItem key={bond.number} value={bond.number.toString()}>
                                {bond.number}: {bond.text.substring(0, 50)}{bond.text.length > 50 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxNumber = backgroundData.bonds?.length || 0
                            if (maxNumber > 0) {
                              const roll = Math.floor(Math.random() * maxNumber) + 1
                              const rolledBond = backgroundData.bonds?.find((b: any) => b.number === roll)
                              if (rolledBond) {
                                setBackgroundBonds([{ number: rolledBond.number, text: rolledBond.text }])
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:dice-6" className="w-4 h-4" />
                          Roll d{backgroundData.bonds?.length || 0}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Numbered Items - Flaws */}
          {backgroundData.flaws && backgroundData.flaws.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-md font-medium">Flaws</Label>
              <p className="text-xs text-muted-foreground">Choose or roll for 1 flaw</p>
              <div className="flex flex-col gap-2">
                {(() => {
                  const selectedFlaw = backgroundFlaws[0]
                  return (
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Badge variant="outline">Flaw</Badge>
                      <div className="flex-1">
                        {selectedFlaw ? (
                          <span className="text-sm">{selectedFlaw.text}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not selected</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select
                          value={selectedFlaw?.number.toString() || ""}
                          onValueChange={(value) => {
                            const flaw = backgroundData.flaws?.find((f: any) => f.number === parseInt(value))
                            if (flaw) {
                              setBackgroundFlaws([{ number: flaw.number, text: flaw.text }])
                            }
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select flaw" />
                          </SelectTrigger>
                          <SelectContent>
                            {(backgroundData.flaws || []).map((flaw: any) => (
                              <SelectItem key={flaw.number} value={flaw.number.toString()}>
                                {flaw.number}: {flaw.text.substring(0, 50)}{flaw.text.length > 50 ? '...' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const maxNumber = backgroundData.flaws?.length || 0
                            if (maxNumber > 0) {
                              const roll = Math.floor(Math.random() * maxNumber) + 1
                              const rolledFlaw = backgroundData.flaws?.find((f: any) => f.number === roll)
                              if (rolledFlaw) {
                                setBackgroundFlaws([{ number: rolledFlaw.number, text: rolledFlaw.text }])
                              }
                            }
                          }}
                        >
                          <Icon icon="lucide:dice-6" className="w-4 h-4" />
                          Roll d{backgroundData.flaws?.length || 0}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Traits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

