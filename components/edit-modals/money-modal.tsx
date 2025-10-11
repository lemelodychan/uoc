"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface MoneyModalProps {
  isOpen: boolean
  onClose: () => void
  character: CharacterData
  onSave: (updates: Partial<CharacterData>) => void
}

export function MoneyModal({ isOpen, onClose, character, onSave }: MoneyModalProps) {
  const [money, setMoney] = useState({
    gold: character.money?.gold || 0,
    silver: character.money?.silver || 0,
    copper: character.money?.copper || 0,
  })

  // Sync local state with character prop when it changes
  useEffect(() => {
    setMoney({
      gold: character.money?.gold || 0,
      silver: character.money?.silver || 0,
      copper: character.money?.copper || 0,
    })
  }, [character.money])

  const handleSave = () => {
    onSave({ money })
    onClose()
  }

  const updateMoney = (type: 'gold' | 'silver' | 'copper', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0)
    setMoney(prev => ({ ...prev, [type]: numValue }))
  }

  const calculateTotalCopper = () => {
    return (money.gold * 100) + (money.silver * 10) + money.copper
  }

  const calculateTotalGold = () => {
    return calculateTotalCopper() / 100
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Edit Money
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 p-4 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {/* Gold */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label htmlFor="gold" className="text-sm font-medium flex items-center gap-2">
                Gold Pieces
              </Label>
              <Input
                id="gold"
                type="number"
                min="0"
                value={money.gold}
                onChange={(e) => updateMoney('gold', e.target.value)}
                placeholder="0"
                className="text-center"
              />
            </div>

            {/* Silver */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label htmlFor="silver" className="text-sm font-medium flex items-center gap-2">
                Silver Pieces
              </Label>
              <Input
                id="silver"
                type="number"
                min="0"
                value={money.silver}
                onChange={(e) => updateMoney('silver', e.target.value)}
                placeholder="0"
                className="text-center"
              />
            </div>

            {/* Copper */}
            <div className="space-y-2 p-3 border rounded-lg">
              <Label htmlFor="copper" className="text-sm font-medium flex items-center gap-2">
                Copper Pieces
              </Label>
              <Input
                id="copper"
                type="number"
                min="0"
                value={money.copper}
                onChange={(e) => updateMoney('copper', e.target.value)}
                placeholder="0"
                className="text-center"
              />
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-4 border-t">
            <div className="text-center space-y-1">
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-lg font-semibold">
                {calculateTotalGold().toFixed(2)} Gold Pieces
              </div>
              <div className="text-xs text-muted-foreground">
                ({calculateTotalCopper()} copper pieces total)
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
