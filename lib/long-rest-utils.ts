/**
 * Long rest computation utilities.
 * Pure functions — no DB calls, no React state.
 * Used by both the character sheet (page.tsx) and the campaign page.
 */

import type { CharacterData } from './character-data'
import { calculateProficiencyBonus } from './character-data'
import { resetAllFeatureUsage, type FeatureUsageData } from './feature-usage-tracker'

export interface LongRestResult {
  characterId: string
  characterName: string
  hpRestored: number
  exhaustionReduced: number
  magicItemReplenishments: { itemName: string; chargesReplenished: number; diceRoll?: number; maxCharges: number }[]
  featureReplenishments: { featureName: string; usesReplenished: number; diceRoll?: number; maxUses: number }[]
  spellSlotReplenishments: { level: number; slotsRestored: number }[]
  classAbilityReplenishments: { abilityName: string; usesRestored: number; maxUses: number }[]
  featSpellReplenishments: { featName: string; usesRestored: number; maxUses: number }[]
  hitDiceReplenishments: { diceRestored: number; maxDice: number; dieType: string }
}

function getFeatureUsesPerLongRest(feature: any, character: CharacterData): number {
  if (typeof feature.usesPerLongRest === 'number') {
    return Math.max(0, feature.usesPerLongRest)
  }
  if (typeof feature.usesPerLongRest === 'string') {
    if (feature.usesPerLongRest.toLowerCase() === 'prof') {
      return Math.max(0, character.proficiencyBonus ?? calculateProficiencyBonus(character.level))
    }
    const abilityMap: Record<string, number> = {
      str: character.strength,
      dex: character.dexterity,
      con: character.constitution,
      int: character.intelligence,
      wis: character.wisdom,
      cha: character.charisma,
    }
    const abilityScore = abilityMap[feature.usesPerLongRest.toLowerCase()]
    if (abilityScore !== undefined) {
      return Math.max(0, Math.floor((abilityScore - 10) / 2))
    }
  }
  return 0
}

/**
 * Applies long rest effects to the selected characters.
 * Returns updated character objects and a per-character result summary.
 * Does NOT read from or write to the database.
 */
export function applyLongRestToCharacters(
  characters: CharacterData[],
  selectedCharacterIds: string[]
): { updatedCharacters: CharacterData[]; results: LongRestResult[] } {
  const results: LongRestResult[] = []

  const updatedCharacters = characters.map(character => {
    if (!selectedCharacterIds.includes(character.id)) return character

    const hpRestored = character.maxHitPoints - character.currentHitPoints
    const exhaustionReduced = Math.min(1, character.exhaustion || 0)

    const magicItemReplenishments: LongRestResult['magicItemReplenishments'] = []
    const featureReplenishments: LongRestResult['featureReplenishments'] = []
    const spellSlotReplenishments: LongRestResult['spellSlotReplenishments'] = []
    const classAbilityReplenishments: LongRestResult['classAbilityReplenishments'] = []
    const featSpellReplenishments: LongRestResult['featSpellReplenishments'] = []
    const hitDiceReplenishments: LongRestResult['hitDiceReplenishments'] = { diceRestored: 0, maxDice: 0, dieType: 'd8' }

    // Replenish magic item charges
    const updatedMagicItems = (character.magicItems ?? []).map(item => {
      if (item.maxUses && item.maxUses > 0 && item.dailyRecharge) {
        let chargesReplenished = 0
        let diceRoll: number | undefined
        if (item.dailyRecharge.toLowerCase() === 'all') {
          chargesReplenished = item.maxUses - (item.currentUses || 0)
        } else if (item.dailyRecharge.includes('d')) {
          const match = item.dailyRecharge.match(/(\d+)d(\d+)([+-]\d+)?/)
          if (match) {
            const numDice = parseInt(match[1])
            const diceSize = parseInt(match[2])
            const mod = match[3] ? parseInt(match[3]) : 0
            let total = 0
            for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * diceSize) + 1
            total += mod
            diceRoll = total
            chargesReplenished = Math.min(total, item.maxUses - (item.currentUses || 0))
          }
        }
        if (chargesReplenished > 0) {
          magicItemReplenishments.push({ itemName: item.name || 'Unnamed Magic Item', chargesReplenished, diceRoll, maxCharges: item.maxUses })
        }
        return { ...item, currentUses: Math.min(item.maxUses, (item.currentUses || 0) + chargesReplenished) }
      }
      return item
    })

    // Replenish feature uses
    const updatedFeatures = (character.features ?? []).map(feature => {
      if (feature.refuelingDie && feature.usesPerLongRest) {
        const maxUses = getFeatureUsesPerLongRest(feature, character)
        const currentUses = Math.min(maxUses, Math.max(0, feature.currentUses ?? maxUses))
        const maxReplenish = maxUses - currentUses
        if (maxReplenish > 0) {
          let usesReplenished = 0
          let diceRoll: number | undefined
          if (feature.refuelingDie.toLowerCase() === 'all') {
            usesReplenished = maxReplenish
          } else if (feature.refuelingDie.includes('d')) {
            const match = feature.refuelingDie.match(/(\d+)d(\d+)([+-]\d+)?/)
            if (match) {
              const numDice = parseInt(match[1])
              const diceSize = parseInt(match[2])
              const mod = match[3] ? parseInt(match[3]) : 0
              let total = 0
              for (let i = 0; i < numDice; i++) total += Math.floor(Math.random() * diceSize) + 1
              total += mod
              diceRoll = total
              usesReplenished = Math.min(total, maxReplenish)
            }
          }
          if (usesReplenished > 0) {
            featureReplenishments.push({ featureName: feature.name, usesReplenished, diceRoll, maxUses })
          }
          return { ...feature, currentUses: Math.min(maxUses, currentUses + usesReplenished) }
        }
      }
      return feature
    })

    // Replenish spell slots
    const updatedSpellSlots = (character.spellData.spellSlots ?? []).map(slot => {
      const slotsRestored = slot.used
      if (slotsRestored > 0) spellSlotReplenishments.push({ level: slot.level, slotsRestored })
      return { ...slot, used: 0 }
    })

    let updatedSpellData = { ...character.spellData, spellSlots: updatedSpellSlots }

    // Cleansing Touch (Paladin)
    if (character.spellData.cleansingTouchSlot) {
      const slot = character.spellData.cleansingTouchSlot
      const usesRestored = slot.usesPerRest - slot.currentUses
      if (usesRestored > 0) classAbilityReplenishments.push({ abilityName: 'Cleansing Touch', usesRestored, maxUses: slot.usesPerRest })
      updatedSpellData = { ...updatedSpellData, cleansingTouchSlot: { ...slot, currentUses: slot.usesPerRest } }
    }

    // Replenish feat spell slots
    const updatedFeatSpellSlots = (character.spellData.featSpellSlots ?? []).map(feat => {
      const usesRestored = feat.usesPerLongRest - feat.currentUses
      if (usesRestored > 0) featSpellReplenishments.push({ featName: feat.featName, usesRestored, maxUses: feat.usesPerLongRest })
      return { ...feat, currentUses: feat.usesPerLongRest }
    })
    updatedSpellData = { ...updatedSpellData, featSpellSlots: updatedFeatSpellSlots }

    // Replenish unified class feature usage
    const updatedClassFeatureSkillsUsage = resetAllFeatureUsage(character, 'long_rest')
    if (updatedClassFeatureSkillsUsage) {
      Object.entries(updatedClassFeatureSkillsUsage).forEach(([featureId, featureData]: [string, FeatureUsageData[string]]) => {
        if (featureData.featureType === 'slots' && featureData.maxUses) {
          const prev = character.classFeatureSkillsUsage?.[featureId]
          const usesRestored = featureData.maxUses - (prev?.currentUses ?? featureData.maxUses)
          if (usesRestored > 0) classAbilityReplenishments.push({ abilityName: featureData.featureName || featureId, usesRestored, maxUses: featureData.maxUses })
        }
        if (featureData.featureType === 'points_pool' && featureData.maxPoints) {
          const prev = character.classFeatureSkillsUsage?.[featureId]
          const pointsRestored = featureData.maxPoints - (prev?.currentPoints ?? featureData.maxPoints)
          if (pointsRestored > 0) classAbilityReplenishments.push({ abilityName: featureData.featureName || featureId, usesRestored: pointsRestored, maxUses: featureData.maxPoints })
        }
        if (featureData.featureType === 'availability_toggle') {
          const prev = character.classFeatureSkillsUsage?.[featureId]
          if (!(prev?.isAvailable ?? true) && featureData.isAvailable) {
            classAbilityReplenishments.push({ abilityName: featureData.featureName || featureId, usesRestored: 1, maxUses: 1 })
          }
        }
      })
    }

    // Replenish hit dice (up to half total, min 1)
    let updatedHitDice = character.hitDice
    if (character.hitDice) {
      const toRestore = Math.max(1, Math.floor(character.hitDice.total / 2))
      const actual = Math.min(toRestore, character.hitDice.used)
      if (actual > 0) {
        hitDiceReplenishments.diceRestored = actual
        hitDiceReplenishments.maxDice = character.hitDice.total
        hitDiceReplenishments.dieType = character.hitDice.dieType
        updatedHitDice = { ...character.hitDice, used: Math.max(0, character.hitDice.used - actual) }
      }
    }

    // Reset innate spells
    const updatedInnateSpells = (character.innateSpells ?? []).map(spell =>
      spell.usesPerDay !== 'at_will' && spell.resetOn !== 'short_rest'
        ? { ...spell, currentUses: typeof spell.usesPerDay === 'number' ? spell.usesPerDay : spell.currentUses }
        : spell
    )

    results.push({
      characterId: character.id,
      characterName: character.name,
      hpRestored,
      exhaustionReduced,
      magicItemReplenishments,
      featureReplenishments,
      spellSlotReplenishments,
      classAbilityReplenishments,
      featSpellReplenishments,
      hitDiceReplenishments,
    })

    return {
      ...character,
      currentHitPoints: character.maxHitPoints,
      magicItems: updatedMagicItems,
      features: updatedFeatures,
      spellData: updatedSpellData,
      hitDice: updatedHitDice,
      classFeatureSkillsUsage: updatedClassFeatureSkillsUsage,
      innateSpells: updatedInnateSpells,
      exhaustion: Math.max(0, (character.exhaustion || 0) - 1),
      deathSaves: { successes: 0, failures: 0 },
    }
  })

  return { updatedCharacters, results }
}
