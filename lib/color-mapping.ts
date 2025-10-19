/**
 * Color mapping utilities for consistent theme usage
 * Maps common hardcoded colors to design token equivalents
 */

// Common color replacements for theme consistency
export const COLOR_MAPPINGS = {
  // Background colors
  'bg-white': 'bg-card',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-muted',
  'bg-gray-200': 'bg-muted',
  
  // Border colors
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-gray-400': 'border-border',
  
  // Text colors
  'text-gray-500': 'text-muted-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-700': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-900': 'text-foreground',
  
  // Hover states
  'hover:bg-gray-50': 'hover:bg-muted',
  'hover:bg-gray-100': 'hover:bg-muted',
  'hover:border-gray-400': 'hover:border-border',
} as const

// Spell school colors with dark mode support
export const SPELL_SCHOOL_COLORS = {
  "Abjuration": "bg-[#6a8bc0] text-white border-0", // Cleric - blue
  "Conjuration": "bg-[#6ab08b] text-white border-0", // Druid - green
  "Divination": "bg-[#6a8bc0] text-white border-0", // Monk - blue
  "Enchantment": "bg-[#c07a9b] text-white border-0", // Bard - pink
  "Evocation": "bg-[#ce6565] text-white border-0", // Barbarian - red
  "Illusion": "bg-[#8b6ac0] text-white border-0", // Rogue - purple
  "Necromancy": "bg-[#c07a9b] text-white border-0", // Sorcerer - pink
  "Transmutation": "bg-[#6a8bc0] text-white border-0" // Wizard - blue
} as const

// Casting time colors with D&D class colors
export const CASTING_TIME_COLORS = {
  "bonus": "bg-[#b0986a] text-white border-0", // Fighter - yellow
  "reaction": "bg-[#ce6565] text-white border-0", // Barbarian - red
  "action": "bg-[#6ab08b] text-white border-0", // Druid - green
  "default": "bg-[#6a8bc0] text-white border-0" // Monk - blue
} as const

// Combat and UI element colors with D&D class colors
export const COMBAT_COLORS = {
  // Combat stats icons
  armorClass: "text-[#6a8bc0]", // blue
  initiative: "text-[#b0986a]", // yellow
  speed: "text-[#6ab08b]", // green
  hitPoints: "text-[#ce6565]", // red
  hitDice: "text-[#8b6ac0]", // purple
  tempHP: "text-[#6ab08b]", // green
  
  // Spell slot colors
  spellSlotAvailable: "bg-[#6a8bc0] border-[#6a8bc0]", // blue
  spellSlotUsed: "bg-card border-border", // Default card background
  
  // Hit dice colors
  hitDieAvailable: "bg-[#8b6ac0] border-[#8b6ac0]", // purple
  hitDieUsed: "bg-card border-border", // Default card background
  
  // Feat spell slot colors
  featSpellSlotAvailable: "bg-[#6ab08b] border-[#6ab08b]", // green
  featSpellSlotUsed: "bg-card border-border", // Default card background
  
  // Feature/trait slot colors
  featureSlotAvailable: "bg-[#b0986a] border-[#b0986a]", // gold
  featureSlotUsed: "bg-card border-border", // Default card background
  
  // Magic item slot colors
  magicItemSlotAvailable: "bg-[#8b6ac0] border-[#8b6ac0]", // purple
  magicItemSlotUsed: "bg-card border-border", // Default card background
  
  // Class feature slot colors
  bardicInspirationAvailable: "bg-[#c07a9b] border-[#c07a9b]", // pink
  bardicInspirationUsed: "bg-card border-border", // Default card background
  
  flashOfGeniusAvailable: "bg-[#ce6565] border-[#ce6565]", // red
  flashOfGeniusUsed: "bg-card border-border", // Default card background
  
  channelDivinityAvailable: "bg-[#8b6ac0] border-[#8b6ac0]", // purple
  channelDivinityUsed: "bg-card border-border", // Default card background
  
  elementalGiftAvailable: "bg-[#6ab08b] border-[#6ab08b]", // green
  elementalGiftUsed: "bg-card border-border", // Default card background
  
  sanctuaryVesselAvailable: "bg-[#8b6ac0] border-[#8b6ac0]", // purple
  sanctuaryVesselUsed: "bg-card border-border", // Default card background
  
  limitedWishAvailable: "bg-[#c07a9b] border-[#c07a9b]", // pink
  limitedWishUsed: "bg-card border-border", // Default card background
} as const

// Status colors for character states
export const STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-muted text-muted-foreground",
  dead: "bg-red-100 text-red-800",
  unconscious: "bg-yellow-100 text-yellow-800",
} as const

// Utility function to get spell school color
export function getSpellSchoolColor(school: string): string {
  return SPELL_SCHOOL_COLORS[school as keyof typeof SPELL_SCHOOL_COLORS] || "bg-muted text-muted-foreground"
}

// Utility function to get casting time color
export function getCastingTimeColor(castingTime: string): string {
  const ct = castingTime.toLowerCase()
  if (ct.includes("bonus")) return CASTING_TIME_COLORS.bonus
  if (ct.includes("reaction")) return CASTING_TIME_COLORS.reaction
  if (ct.includes("action")) return CASTING_TIME_COLORS.action
  return CASTING_TIME_COLORS.default
}

// Utility function to get status color
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-muted text-muted-foreground"
}

// Utility function to get combat color
export function getCombatColor(element: string): string {
  return COMBAT_COLORS[element as keyof typeof COMBAT_COLORS] || "text-muted-foreground"
}

// Ability-specific colors for modifiers
export const ABILITY_COLORS = {
  STR: "bg-[#ce6565] text-[#fff]",
  DEX: "bg-[#6ab08b] text-[#fff]", 
  CON: "bg-[#b0986a] text-[#fff]",
  INT: "bg-[#6a8bc0] text-[#fff]",
  WIS: "bg-[#8b6ac0] text-[#fff]",
  CHA: "bg-[#c07a9b] text-[#fff]"
} as const

// Utility function to get ability modifier color by ability type
export function getAbilityModifierColor(ability: string): string {
  return ABILITY_COLORS[ability as keyof typeof ABILITY_COLORS] || "bg-muted text-muted-foreground"
}

// Class-specific colors for unified class features
export const CLASS_FEATURE_COLORS = {
  // Bard - Pink
  bard: {
    available: "bg-[#c07a9b] border-[#c07a9b]",
    used: "bg-card border-border"
  },
  // Artificer - Red
  artificer: {
    available: "bg-[#ce6565] border-[#ce6565]",
    used: "bg-card border-border"
  },
  // Paladin - Purple
  paladin: {
    available: "bg-[#8b6ac0] border-[#8b6ac0]",
    used: "bg-card border-border"
  },
  // Warlock - Green
  warlock: {
    available: "bg-[#6ab08b] border-[#6ab08b]",
    used: "bg-card border-border"
  },
  // Wizard - Blue
  wizard: {
    available: "bg-[#6a8bc0] border-[#6a8bc0]",
    used: "bg-card border-border"
  },
  // Sorcerer - Pink (same as Bard)
  sorcerer: {
    available: "bg-[#c07a9b] border-[#c07a9b]",
    used: "bg-card border-border"
  },
  // Cleric - Blue (same as Wizard)
  cleric: {
    available: "bg-[#6a8bc0] border-[#6a8bc0]",
    used: "bg-card border-border"
  },
  // Druid - Green (same as Warlock)
  druid: {
    available: "bg-[#6ab08b] border-[#6ab08b]",
    used: "bg-card border-border"
  },
  // Fighter - Gold
  fighter: {
    available: "bg-[#b0986a] border-[#b0986a]",
    used: "bg-card border-border"
  },
  // Ranger - Green (same as Druid)
  ranger: {
    available: "bg-[#6ab08b] border-[#6ab08b]",
    used: "bg-card border-border"
  },
  // Rogue - Purple (same as Paladin)
  rogue: {
    available: "bg-[#8b6ac0] border-[#8b6ac0]",
    used: "bg-card border-border"
  },
  // Barbarian - Red (same as Artificer)
  barbarian: {
    available: "bg-[#ce6565] border-[#ce6565]",
    used: "bg-card border-border"
  },
  // Monk - Blue (same as Wizard)
  monk: {
    available: "bg-[#6a8bc0] border-[#6a8bc0]",
    used: "bg-card border-border"
  }
} as const

// Utility function to get class feature colors
export function getClassFeatureColors(className: string): { available: string; used: string } {
  const normalizedClass = className.toLowerCase()
  return CLASS_FEATURE_COLORS[normalizedClass as keyof typeof CLASS_FEATURE_COLORS] || {
    available: "bg-[#6a8bc0] border-[#6a8bc0]", // Default blue
    used: "bg-card border-border"
  }
}

// Common class combinations for consistent styling
export const COMMON_CLASSES = {
  // Interactive elements
  interactive: "bg-card border-border hover:border-border cursor-pointer transition-colors",
  interactiveUsed: "bg-card border-border hover:border-border cursor-pointer transition-colors",
  interactiveAvailable: "bg-primary border-primary cursor-pointer hover:bg-primary transition-colors",
  
  // Form elements
  checkbox: "w-3 h-3 rounded border-border",
  checkboxLarge: "w-4 h-4 rounded border-border",
  
  // Cards and containers
  card: "bg-card border border-border rounded-lg",
  cardHover: "bg-card border border-border rounded-lg hover:bg-muted transition-colors",
  
  // Empty states
  emptyState: "p-3 bg-muted rounded-lg border text-center",
} as const
