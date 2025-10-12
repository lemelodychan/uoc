"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"
import { getTotalAdditionalSpells } from "@/lib/character-data"
import { getCombatColor } from "@/lib/color-mapping"

interface SpellcastingProps {
  character: CharacterData
  strengthMod: number
  dexterityMod: number
  constitutionMod: number
  intelligenceMod: number
  wisdomMod: number
  charismaMod: number
  proficiencyBonus: number
  onEdit: () => void
  onOpenSpellList: () => void
  onToggleBardicInspiration: (index: number) => void
  onToggleSongOfRest: () => void
  onToggleFlashOfGenius: (index: number) => void
  onToggleDivineSense: (index: number) => void
  onToggleChannelDivinity: (index: number) => void
  onToggleCleansingTouch: (index: number) => void
  onUpdateLayOnHands: (newValue: number) => void
  onToggleSpellSlot: (level: number, slotIndex: number) => void
  onToggleFeatSpellSlot: (featIndex: number, slotIndex: number) => void
  onToggleElementalGift: (index: number) => void
  onToggleSanctuaryVessel: (index: number) => void
  onToggleLimitedWish: (index: number) => void
  hasSpellcastingAbilities: (character: CharacterData) => boolean
}

const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function Spellcasting({ 
  character, 
  strengthMod,
  dexterityMod,
  constitutionMod,
  intelligenceMod,
  wisdomMod,
  charismaMod,
  proficiencyBonus,
  onEdit, 
  onOpenSpellList,
  onToggleBardicInspiration,
  onToggleSongOfRest,
  onToggleFlashOfGenius,
  onToggleDivineSense,
  onToggleChannelDivinity,
  onToggleCleansingTouch,
  onUpdateLayOnHands,
  onToggleSpellSlot,
  onToggleFeatSpellSlot,
  onToggleElementalGift,
  onToggleSanctuaryVessel,
  onToggleLimitedWish,
  hasSpellcastingAbilities
}: SpellcastingProps) {
  if (!hasSpellcastingAbilities(character)) {
    return null
  }

  // Determine spellcasting ability modifier based on class
  const getSpellcastingModifier = () => {
    const className = character.class.toLowerCase()
    if (className === "warlock" || className === "sorcerer" || className === "paladin") {
      return charismaMod
    } else if (className === "wizard" || className === "artificer") {
      return intelligenceMod
    } else if (className === "cleric" || className === "druid" || className === "ranger") {
      return wisdomMod
    } else if (className === "bard") {
      return charismaMod
    }
    return intelligenceMod // fallback
  }

  const spellcastingModifier = getSpellcastingModifier()

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:sparkles" className="w-5 h-5" />
            Spells & Magic
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex flex-col gap-2">
        {/* Basic Spell Stats */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 items-start">
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spell Attack</div>
              <div className="text-xl font-bold font-mono">
                {formatModifier(character.spellData.spellAttackBonus)}
              </div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spell Save DC</div>
              <div className="text-xl font-bold font-mono">{character.spellData.spellSaveDC}</div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Cantrips</div>
              <div className="text-xl font-bold font-mono">{character.spellData.cantripsKnown}</div>
            </div>
            <div className="text-center border p-2 rounded-lg col-span-1 mb-0 flex flex-col items-center gap-1 bg-background">
              <div className="text-sm text-muted-foreground">Spells</div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-xl font-bold font-mono">{character.spellData.spellsKnown}</div>
                {getTotalAdditionalSpells(character) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    +{getTotalAdditionalSpells(character)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button className="w-full" variant="outline" size="sm" onClick={onOpenSpellList}>
            <Icon icon="lucide:book-open" className="w-4 h-4" />
            Spell List
          </Button>
        </div>

        {/* Bard Features */}
        {(character.class.toLowerCase() === "bard" || character.classes?.some(c => c.name.toLowerCase() === "bard")) && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Bard Features</div>
            {/* Bardic Inspiration */}
            {character.spellData.bardicInspirationSlot && (
              <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
                <div className="flex gap-1 flex-col">
                  <span className="text-sm font-medium">Bardic Inspiration</span>
                  <span className="text-xs text-muted-foreground">
                    1{character.spellData.bardicInspirationSlot.dieType} save bonus
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: character.spellData.bardicInspirationSlot.usesPerRest }, (_, i) => {
                    const usedCount = character.spellData.bardicInspirationSlot!.usesPerRest - character.spellData.bardicInspirationSlot!.currentUses
                    const isAvailable = i < character.spellData.bardicInspirationSlot!.currentUses
                    return (
                      <button
                        key={i}
                        onClick={() => onToggleBardicInspiration(i)}
                        className={`w-4 h-4 rounded border-2 transition-colors ${
                          isAvailable
                            ? `${getCombatColor('bardicInspirationAvailable')} cursor-pointer`
                            : `${getCombatColor('bardicInspirationUsed')} hover:border-border/80 cursor-pointer`
                        }`}
                        title={isAvailable ? "Available" : "Used"}
                      />
                    )
                  })}
                  <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                    {character.spellData.bardicInspirationSlot.currentUses}/
                    {character.spellData.bardicInspirationSlot.usesPerRest}
                  </span>
                </div>
              </div>
            )}
            {/* Bard - Song of Rest */}
            {character.spellData.songOfRest && (
              <div className="p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors bg-background" onClick={onToggleSongOfRest}>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex flex-col gap-1">
                    <span className="font-medium">Song of Rest</span><span className="text-xs text-muted-foreground"> 1{character.spellData.songOfRest.healingDie} healing</span>
                  </span>
                  <Badge variant={character.spellData.songOfRest.available ? "default" : "secondary"}>
                    {character.spellData.songOfRest.available ? "Available" : "Used"}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Artificer Features */}
        {(character.class.toLowerCase() === "artificer" || character.classes?.some(c => c.name.toLowerCase() === "artificer")) && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Artificer Skills</div>
            {/* Artificer - Flash of Genius */}
            {((character.class.toLowerCase() === "artificer" && character.level >= 7) || (character.classes?.some(c => c.name.toLowerCase() === "artificer") && character.classes?.reduce((total, c) => c.name.toLowerCase() === "artificer" ? total + c.level : total, 0) >= 7)) && character.spellData.flashOfGeniusSlot && (
                <div className="flex flex-col items-start justify-between p-2 border rounded gap-0 bg-background">
                  <div className="flex gap-3 justify-between align-center w-full flex-row">
                    <span className="text-sm font-medium">
                      Flash of Genius
                    </span>
                    <div className="flex items-center gap-1 py-1">
                      {Array.from({ length: character.spellData.flashOfGeniusSlot.usesPerRest }, (_, i) => {
                        const usedCount = character.spellData.flashOfGeniusSlot!.usesPerRest - character.spellData.flashOfGeniusSlot!.currentUses
                        const isAvailable = i < character.spellData.flashOfGeniusSlot!.currentUses
                        return (
                          <button
                            key={i}
                            onClick={() => onToggleFlashOfGenius(i)}
                            className={`w-4 h-4 rounded border-2 transition-colors ${
                              isAvailable
                                ? `${getCombatColor('flashOfGeniusAvailable')} cursor-pointer`
                                : `${getCombatColor('flashOfGeniusUsed')} hover:border-border/80 cursor-pointer`
                            }`}
                            title={isAvailable ? "Available" : "Used"}
                          />
                        )
                      })}
                      <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                        {character.spellData.flashOfGeniusSlot.currentUses}/{character.spellData.flashOfGeniusSlot.usesPerRest}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <Badge variant="secondary">{formatModifier(intelligenceMod)}</Badge> bonus to any check
                  </span>
                </div>
              )}
          </div>
        )}

        {/* Paladin Features */}
        {(character.class.toLowerCase() === "paladin" || character.classes?.some(c => c.name.toLowerCase() === "paladin")) && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Paladin Skills</div>
            {/* Paladin - Divine Sense */}
            {character.spellData.divineSenseSlot && (
                <div className="flex items-start gap-1 justify-between p-2 border rounded bg-background">
                  <div className="flex gap-1 flex-col">
                    <span className="text-sm font-medium">Divine Sense</span>
                    <span className="text-xs text-muted-foreground">
                      Detect celestials, fiends, and undead within 60 feet
                    </span>
                  </div>
                  <div className="flex items-center gap-1 py-1">
                    {Array.from({ length: character.spellData.divineSenseSlot.usesPerRest }, (_, i) => {
                      const isAvailable = i < character.spellData.divineSenseSlot!.currentUses
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleDivineSense(i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? "bg-[#b0986a] border-[#b0986a] cursor-pointer"
                              : "bg-card border-border hover:border-border/80 cursor-pointer"
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                      {character.spellData.divineSenseSlot.currentUses}/{character.spellData.divineSenseSlot.usesPerRest}
                    </span>
                  </div>
                </div>
            )}
            {/* Paladin - Lay on Hands */}
            {character.spellData.layOnHands && (
                <div className="flex items-center justify-between p-2 border rounded bg-background">
                  <div className="flex gap-1 flex-col">
                    <span className="text-sm font-medium">
                      Lay on Hands
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Healing pool
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={character.spellData.layOnHands.totalHitPoints}
                      value={character.spellData.layOnHands.currentHitPoints}
                      onChange={(e) => {
                        const newValue = Math.max(0, Math.min(character.spellData.layOnHands!.totalHitPoints, parseInt(e.target.value) || 0))
                        onUpdateLayOnHands(newValue)
                      }}
                      className="w-16 px-2 py-1 text-sm border rounded text-center"
                      title="Remaining Lay on Hands hit points"
                    />
                    <span className="text-sm text-muted-foreground">
                      / {character.spellData.layOnHands.totalHitPoints}
                    </span>
                  </div>
                </div>
            )}
            {/* Paladin - Channel Divinity */}
            {character.spellData.channelDivinitySlot && (
                <div className="flex items-start justify-between p-2 border rounded gap-1 bg-background">
                  <div className="flex gap-1 flex-col">
                    <span className="text-sm font-medium">Channel Divinity</span>
                    <span className="text-xs text-muted-foreground">
                      Sacred Oath features
                    </span>
                  </div>
                  <div className="flex items-center gap-1 py-1">
                    {Array.from({ length: character.spellData.channelDivinitySlot.usesPerRest }, (_, i) => {
                      const isAvailable = i < character.spellData.channelDivinitySlot!.currentUses
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleChannelDivinity(i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('channelDivinityAvailable')} cursor-pointer`
                              : `${getCombatColor('channelDivinityUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                      {character.spellData.channelDivinitySlot.currentUses}/{character.spellData.channelDivinitySlot.usesPerRest}
                    </span>
                  </div>
                </div>
            )}
            {/* Paladin - Cleansing Touch */}
            {character.spellData.cleansingTouchSlot && (
              <div className="flex items-start justify-between p-2 border rounded gap-1 bg-background">
                  <div className="flex gap-1 flex-col">
                    <span className="text-sm font-medium">Cleansing Touch</span>
                    <span className="text-xs text-muted-foreground">
                      End one spell on yourself or willing creature
                    </span>
                  </div>
                  <div className="flex items-center gap-1 py-1">
                    {Array.from({ length: character.spellData.cleansingTouchSlot.usesPerRest }, (_, i) => {
                      const isAvailable = i < character.spellData.cleansingTouchSlot!.currentUses
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleCleansingTouch(i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? "bg-green-500 border-green-500 cursor-pointer"
                              : "bg-card border-border hover:border-border/80 cursor-pointer"
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground w-5 text-right ml-2">
                      {character.spellData.cleansingTouchSlot.currentUses}/{character.spellData.cleansingTouchSlot.usesPerRest}
                    </span>
                  </div>
                </div>
            )}
          </div>
        )}

        {/* Warlock Features */}
        {(character.class.toLowerCase() === "warlock" || character.classes?.some(c => c.name.toLowerCase() === "warlock")) && (
          (character.spellData.genieWrath || 
           character.spellData.elementalGift ||
           character.spellData.sanctuaryVessel ||
           character.spellData.limitedWish) && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Warlock Features</div>
            {/* Warlock - Genie Wrath */}
            {character.spellData.genieWrath && (
              <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
                <div className="flex gap-1 flex-col">
                  <span className="text-sm font-medium">Genie's Wrath</span>
                  <span className="text-xs text-muted-foreground">
                    Add proficiency bonus to one damage roll per turn
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    +{proficiencyBonus}
                  </Badge>
                </div>
              </div>
            )}
            {/* Warlock - Elemental Gift */}
            {character.spellData.elementalGift && (
              <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
                <div className="flex gap-1 flex-col">
                  <span className="text-sm font-medium">Elemental Gift</span>
                  <span className="text-xs text-muted-foreground">
                    Flying speed: {character.spellData.elementalGift.flyingSpeed} ft
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: character.spellData.elementalGift.usesPerLongRest }, (_, i) => {
                    const isAvailable = i < (character.spellData.elementalGift!.usesPerLongRest - character.spellData.elementalGift!.currentUses)
                    return (
                      <button
                        key={i}
                        onClick={() => onToggleElementalGift(i)}
                        className={`w-4 h-4 rounded border-2 transition-colors ${
                          isAvailable
                            ? `${getCombatColor('elementalGiftAvailable')} cursor-pointer`
                            : `${getCombatColor('elementalGiftUsed')} hover:border-border/80 cursor-pointer`
                        }`}
                        title={isAvailable ? "Available" : "Used"}
                      />
                    )
                  })}
                  <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                    {character.spellData.elementalGift.usesPerLongRest - character.spellData.elementalGift.currentUses}/{character.spellData.elementalGift.usesPerLongRest}
                  </span>
                </div>
              </div>
            )}
            {/* Warlock - Sanctuary Vessel */}
            {character.spellData.sanctuaryVessel && (
              <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
                <div className="flex gap-1 flex-col">
                  <span className="text-sm font-medium">Sanctuary Vessel</span>
                  <span className="text-xs text-muted-foreground">
                    {character.spellData.sanctuaryVessel.vesselType}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 1 }, (_, i) => {
                    const isAvailable = character.spellData.sanctuaryVessel!.hoursRemaining > 0
                    return (
                      <button
                        key={i}
                        onClick={() => onToggleSanctuaryVessel(i)}
                        className={`w-4 h-4 rounded border-2 transition-colors ${
                          isAvailable
                            ? `${getCombatColor('sanctuaryVesselAvailable')} cursor-pointer`
                            : `${getCombatColor('sanctuaryVesselUsed')} hover:border-border/80 cursor-pointer`
                        }`}
                        title={isAvailable ? "Available" : "Used"}
                      />
                    )
                  })}
                  <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                    {character.spellData.sanctuaryVessel.hoursRemaining}/{character.spellData.sanctuaryVessel.maxHours}h
                  </span>
                </div>
              </div>
            )}
            {/* Warlock - Limited Wish */}
            {character.spellData.limitedWish && (
              <div className="flex items-center justify-between p-2 border rounded gap-1 bg-background">
                <div className="flex gap-1 flex-col">
                  <span className="text-sm font-medium">Limited Wish</span>
                  <span className="text-xs text-muted-foreground">
                    Cast any spell of 6th level or lower
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: character.spellData.limitedWish.usesPerLongRest }, (_, i) => {
                    const isAvailable = i < (character.spellData.limitedWish!.usesPerLongRest - character.spellData.limitedWish!.currentUses)
                    return (
                      <button
                        key={i}
                        onClick={() => onToggleLimitedWish(i)}
                        className={`w-4 h-4 rounded border-2 transition-colors ${
                          isAvailable
                            ? `${getCombatColor('limitedWishAvailable')} cursor-pointer`
                            : `${getCombatColor('limitedWishUsed')} hover:border-border/80 cursor-pointer`
                        }`}
                        title={isAvailable ? "Available" : "Used"}
                      />
                    )
                  })}
                  <span className="text-xs text-muted-foreground ml-2 w-5 text-right">
                    {character.spellData.limitedWish.usesPerLongRest - character.spellData.limitedWish.currentUses}/{character.spellData.limitedWish.usesPerLongRest}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Spell Slots */}
        {character.spellData.spellSlots && character.spellData.spellSlots.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Spell Slots</div>
            <div className="grid grid-cols-1 gap-2">
              {character.spellData.spellSlots.map((slot) => (
                <div key={slot.level} className="p-2 border rounded flex items-center justify-between bg-background">
                  <div className="text-sm font-medium mb-1">Level {slot.level}</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: slot.total }, (_, i) => {
                      const isAvailable = i < (slot.total - slot.used)
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleSpellSlot(slot.level, i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('spellSlotAvailable')} cursor-pointer`
                              : `${getCombatColor('spellSlotUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-2">
                      {slot.total - slot.used}/{slot.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feat Spell Slots */}
        {character.spellData.featSpellSlots && character.spellData.featSpellSlots.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            <div className="text-sm font-medium">Feat Spell Slots</div>
            <div className="flex flex-col gap-2">
              {character.spellData.featSpellSlots.map((featSlot, featIndex) => (
                <div key={featIndex} className="p-2 border rounded bg-background">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium mb-1">{featSlot.spellName || `Feat ${featIndex + 1}`}</div>
                    <div className="flex items-center gap-1">
                    {Array.from({ length: featSlot.usesPerLongRest }, (_, i) => {
                      const isAvailable = i < (featSlot.usesPerLongRest - featSlot.currentUses)
                      return (
                        <button
                          key={i}
                          onClick={() => onToggleFeatSpellSlot(featIndex, i)}
                          className={`w-4 h-4 rounded border-2 transition-colors ${
                            isAvailable
                              ? `${getCombatColor('featSpellSlotAvailable')} cursor-pointer`
                              : `${getCombatColor('featSpellSlotUsed')} hover:border-border/80 cursor-pointer`
                          }`}
                          title={isAvailable ? "Available" : "Used"}
                        />
                      )
                    })}
                    <span className="text-xs text-muted-foreground ml-2">
                      {featSlot.usesPerLongRest - featSlot.currentUses}/{featSlot.usesPerLongRest}
                    </span>
                  </div>
                  </div>
                  <div className="text-xs text-muted-foreground">From {featSlot.featName}</div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Spell Notes */}
        {character.spellData.spellNotes && character.spellData.spellNotes.trim() !== "" && (
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium">Spell Notes</div>
            <RichTextDisplay
              content={character.spellData.spellNotes || "No spell notes"}
              className={
                !character.spellData.spellNotes
                  ? "text-muted-foreground text-center py-2 text-sm"
                  : "text-sm"
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
