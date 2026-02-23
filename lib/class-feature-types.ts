/**
 * Type definitions for the Class Feature Skills system
 * These types define the structure for template-based class features with usage tracking
 */

export type FeatureType = 'slots' | 'points_pool' | 'options_list' | 'special_ux' | 'skill_modifier' | 'availability_toggle'

/**
 * Main interface for a class feature skill definition
 * This is stored in the class_features.class_features_skills JSONB column
 */
export interface ClassFeatureSkill {
  id: string
  version: number  // For future migrations
  title: string
  subtitle?: string
  customDescription?: string  // Custom description to display in spellcasting section
  featureType: FeatureType
  enabledAtLevel: number
  enabledBySubclass?: string | null
  className?: string  // Which class this feature belongs to (for multiclassing support)
  displayLocation?: ('spellcasting' | 'combat')[]  // Where to display this feature: 'spellcasting' (Spellcasting section), 'combat' (Combat Stats section), or empty array (only in Class Features column)
  config: SlotConfig | PointsPoolConfig | OptionsListConfig | SpecialUXConfig | SkillModifierConfig | AvailabilityToggleConfig
}

/**
 * Slots: Simple usage tracking (Bardic Inspiration, Divine Sense, Channel Divinity, etc.)
 * Features with a fixed or calculated number of uses that can be expended
 */
export interface SlotConfig {
  usesFormula: string  // Examples: 'charisma_modifier', 'proficiency_bonus', 'fixed:3', 'level / 2'
  dieType?: string[]  // Optional die progression by level, e.g., ["d6", "d6", "d6", "d6", "d8", ...]
  replenishOn: 'short_rest' | 'long_rest' | 'dawn'
  displayStyle: 'circles' | 'checkboxes' | 'counter'
}

/**
 * Points Pool: Numeric pool that can be spent partially (Lay on Hands, Ki Points, Sorcery Points)
 * Features with a pool of points that can be spent in variable amounts
 */
export interface PointsPoolConfig {
  totalFormula: string  // Examples: 'level * 5', 'level', 'level * 2'
  canSpendPartial: boolean  // Can spend less than total (e.g., Lay on Hands: true, Ki Points: true)
  replenishOn: 'short_rest' | 'long_rest' | 'dawn'
  displayStyle: 'slider' | 'input' | 'increment_decrement'
  minSpend?: number  // Minimum amount that can be spent at once (default: 1)
  maxSpend?: number  // Maximum amount that can be spent at once (optional)
}

/**
 * Options List: Selectable options (Eldritch Invocations, Infusions, Metamagic, Fighting Styles)
 * Features where the player selects from a list of available options
 */
export interface OptionsListConfig {
  maxSelectionsFormula: string  // Examples: 'level / 2', 'fixed:2', 'proficiency_bonus'
  optionsSource: 'database' | 'custom'  // Where options come from
  databaseTable?: string  // e.g., 'eldritch_invocations', 'artificer_infusions'
  filterBy?: {
    level?: number  // Minimum character level
    prerequisite?: string  // Prerequisite text to check
  }
  allowDuplicates: boolean
  displayStyle: 'grid' | 'list' | 'dropdown'
  canSwapOnLevelUp?: boolean  // Can swap selections when leveling up
}

/**
 * Special UX: Custom components with unique interfaces (Eldritch Cannon, Wild Shape, etc.)
 * Features that need completely custom UI and state management
 */
export interface SpecialUXConfig {
  componentId: string  // e.g., 'eldritch-cannon', 'wild-shape', 'raven-queen-sentinel'
  customConfig: Record<string, any>  // Component-specific configuration
}

/**
 * Skill Modifier: Features that modify skill checks, saving throws, or other modifiers
 * Features like Tool Expertise (x2 tool proficiency), Jack of All Trades, etc.
 */
export interface SkillModifierConfig {
  modifierType: 'skill' | 'saving_throw' | 'ability_check' | 'attack_roll' | 'damage_roll'
  targetSkills?: string[]  // Specific skills affected (e.g., ['alchemist_supplies', 'tinker_tools'])
  targetAbilities?: string[]  // Specific abilities affected (e.g., ['intelligence', 'wisdom'])
  modifierFormula: string  // Examples: 'proficiency_bonus', 'proficiency_bonus * 2', 'half_proficiency_bonus'
  condition?: {
    type: 'proficient' | 'not_proficient' | 'always'  // When the modifier applies
    description?: string  // Human-readable condition
  }
  stackable: boolean  // Whether this stacks with other similar modifiers
  displayStyle: 'badge' | 'highlight' | 'tooltip'  // How to show the modifier in UI
}

/**
 * Features that are simple availability toggles (on/off)
 * Examples: Song of Rest, Divine Sense, etc.
 */
export interface AvailabilityToggleConfig {
  defaultAvailable: boolean  // Whether the feature starts as available or used
  replenishOn: 'short_rest' | 'long_rest' | 'dawn' | 'manual'  // When it resets to available
  displayStyle: 'badge' | 'toggle' | 'button'  // How to display the toggle in UI
  availableText?: string  // Text to show when available (default: "Available")
  usedText?: string  // Text to show when used (default: "Used")
}

/**
 * Character instance usage tracking
 * This is stored per-character in characters.class_features_skills_usage JSONB column
 */
export interface FeatureSkillUsage {
  [skillId: string]: {
    currentUses?: number  // For slots-based features
    currentPoints?: number  // For points pool features
    selectedOptions?: string[]  // For options list features
    customState?: Record<string, any>  // For special UX features
    isAvailable?: boolean  // For availability toggle features
    lastReset?: string  // ISO timestamp of last reset
  }
}

/**
 * Helper type for formula evaluation context
 */
export interface FormulaContext {
  level: number
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  proficiencyBonus: number
}

/**
 * Validation result for feature skill configuration
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

