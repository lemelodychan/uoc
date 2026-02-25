/**
 * Passive Bonus Utilities
 *
 * Provides data-driven passive bonus calculations based on class features loaded
 * from the database. Replaces hardcoded class name checks (e.g., "isBard", "isArtificer")
 * with feature-based detection.
 *
 * Passive bonuses are stored in class_features.passive_bonuses JSONB column and
 * loaded during character initialization.
 */

import type { CharacterData } from './character-data'
import { calculateModifier, calculateProficiencyBonus } from './character-data'
import type { PassiveBonuses, ACCalculationBonus, SkillPassiveBonus, ToolPassiveBonus } from './class-feature-types'

/**
 * Collect all passive bonuses from a character's loaded class feature skills.
 * Returns an array of { featureId, bonuses } for all features that have passive_bonuses.
 */
export function getPassiveBonuses(character: CharacterData): Array<{ featureId: string; bonuses: PassiveBonuses }> {
  const result: Array<{ featureId: string; bonuses: PassiveBonuses }> = []

  if (!character.classFeatureSkillsUsage) return result

  for (const [featureId, usage] of Object.entries(character.classFeatureSkillsUsage)) {
    const passiveBonuses = (usage as any)?.passiveBonuses
    if (passiveBonuses && typeof passiveBonuses === 'object') {
      result.push({ featureId, bonuses: passiveBonuses as PassiveBonuses })
    }
  }

  return result
}

/**
 * Calculate suggested AC based on class features with AC calculation passive bonuses.
 * Evaluates all AC formulas and returns the best option.
 *
 * @param character - The character data
 * @param hasArmor - Whether the character is wearing armor
 * @param hasShield - Whether the character is using a shield
 * @param baseArmorAC - The AC provided by worn armor (0 if none)
 * @returns Suggested AC value, or null if no AC-modifying features apply
 */
export function calculateSuggestedAC(
  character: CharacterData,
  hasArmor: boolean,
  hasShield: boolean,
  baseArmorAC: number = 0
): number | null {
  const allBonuses = getPassiveBonuses(character)
  const acBonuses = allBonuses
    .filter(b => b.bonuses.ac_calculation)
    .map(b => b.bonuses.ac_calculation!)

  if (acBonuses.length === 0) return null

  const dexMod = calculateModifier(character.dexterity)
  const conMod = calculateModifier(character.constitution)
  const wisMod = calculateModifier(character.wisdom)
  const shieldBonus = hasShield ? 2 : 0

  let bestAC = baseArmorAC > 0 ? baseArmorAC + shieldBonus : 10 + dexMod + shieldBonus

  for (const acBonus of acBonuses) {
    // Check if the condition is met
    if (acBonus.condition === 'no_armor' && hasArmor) continue
    if (acBonus.condition === 'no_armor_no_shield' && (hasArmor || hasShield)) continue

    // Evaluate the formula
    const calculatedAC = evaluateACFormula(acBonus.formula, character)
    let totalAC = calculatedAC

    // Add shield bonus if the feature allows it
    if (acBonus.allows_shield && hasShield) {
      totalAC += 2
    }

    if (totalAC > bestAC) {
      bestAC = totalAC
    }
  }

  return bestAC
}

/**
 * Evaluate an AC formula string against character data.
 */
function evaluateACFormula(formula: string, character: CharacterData): number {
  const modifiers: Record<string, number> = {
    'dexterity_modifier': calculateModifier(character.dexterity),
    'constitution_modifier': calculateModifier(character.constitution),
    'wisdom_modifier': calculateModifier(character.wisdom),
    'intelligence_modifier': calculateModifier(character.intelligence),
    'strength_modifier': calculateModifier(character.strength),
    'charisma_modifier': calculateModifier(character.charisma),
  }

  // Parse formula like "10 + dexterity_modifier + constitution_modifier"
  let result = 0
  const parts = formula.split('+').map(s => s.trim())

  for (const part of parts) {
    if (modifiers[part] !== undefined) {
      result += modifiers[part]
    } else {
      const num = parseInt(part)
      if (!isNaN(num)) {
        result += num
      }
    }
  }

  return result
}

/**
 * Get skill passive bonus for a specific skill.
 * Returns the bonus amount from features like Jack of All Trades.
 */
export function getSkillPassiveBonus(
  character: CharacterData,
  skillName: string,
  isProficient: boolean,
  proficiencyBonus?: number
): number {
  const profBonus = proficiencyBonus ?? calculateProficiencyBonus(character.level || 1)
  const allBonuses = getPassiveBonuses(character)
  let totalBonus = 0

  for (const { bonuses } of allBonuses) {
    if (!bonuses.skill_bonus) continue
    const skillBonus = bonuses.skill_bonus

    // Check condition
    if (skillBonus.condition === 'not_proficient' && isProficient) continue
    if (skillBonus.condition === 'proficient' && !isProficient) continue

    // Check if applies to this skill
    if (skillBonus.applies_to !== 'all_skills' && skillBonus.applies_to !== skillName) continue

    // Calculate bonus based on type
    switch (skillBonus.type) {
      case 'half_proficiency':
        totalBonus += Math.floor(profBonus / 2)
        break
      case 'double_proficiency':
        totalBonus += profBonus // Adding an extra proficiency bonus (on top of existing)
        break
      case 'flat':
        totalBonus += skillBonus.flat_value || 0
        break
    }
  }

  return totalBonus
}

/**
 * Get tool passive bonus.
 * Returns the bonus multiplier from features like Tool Expertise.
 */
export function getToolPassiveBonus(
  character: CharacterData,
  isProficient: boolean,
  proficiencyBonus?: number
): number {
  const allBonuses = getPassiveBonuses(character)
  let totalBonus = 0

  for (const { bonuses } of allBonuses) {
    if (!bonuses.tool_bonus) continue
    const toolBonus = bonuses.tool_bonus

    // Check condition
    if (toolBonus.condition === 'proficient' && !isProficient) continue

    // Check if applies
    if (toolBonus.applies_to !== 'all_tools') continue

    switch (toolBonus.type) {
      case 'double_proficiency':
        // Signals that tool proficiency should be doubled
        totalBonus = 1 // Flag value: caller handles the doubling
        break
      case 'flat':
        break
    }
  }

  return totalBonus
}

/**
 * Check if a character has a specific passive bonus type.
 * Convenience function for quick checks.
 */
export function hasPassiveBonus(
  character: CharacterData,
  bonusKey: keyof PassiveBonuses,
  bonusType?: string
): boolean {
  const allBonuses = getPassiveBonuses(character)
  for (const { bonuses } of allBonuses) {
    if (bonuses[bonusKey]) {
      if (!bonusType) return true
      if ((bonuses[bonusKey] as any)?.type === bonusType) return true
    }
  }
  return false
}
