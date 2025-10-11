/**
 * Theme utility functions for D&D Character Sheet Management System
 */

// D&D Class names for type safety
export type DnDClass = 
  | 'barbarian' 
  | 'bard' 
  | 'cleric' 
  | 'druid' 
  | 'fighter' 
  | 'monk' 
  | 'paladin' 
  | 'ranger' 
  | 'rogue' 
  | 'sorcerer' 
  | 'warlock' 
  | 'wizard'

// D&D Ability stats
export type AbilityStat = 
  | 'strength' 
  | 'dexterity' 
  | 'constitution' 
  | 'intelligence' 
  | 'wisdom' 
  | 'charisma'

/**
 * Get CSS custom property value for a D&D class
 */
export function getClassColor(className: DnDClass): string {
  return `var(--class-${className})`
}

/**
 * Get CSS custom property value for an ability stat
 */
export function getStatColor(stat: AbilityStat): string {
  return `var(--stat-${stat})`
}

/**
 * Get class color as inline style object
 */
export function getClassColorStyle(className: DnDClass): React.CSSProperties {
  return { color: getClassColor(className) }
}

/**
 * Get stat color as inline style object
 */
export function getStatColorStyle(stat: AbilityStat): React.CSSProperties {
  return { color: getStatColor(stat) }
}

/**
 * Get class badge style with background color
 */
export function getClassBadgeStyle(className: DnDClass): React.CSSProperties {
  return { 
    backgroundColor: getClassColor(className),
    color: 'white'
  }
}

/**
 * Get stat badge style with background color
 */
export function getStatBadgeStyle(stat: AbilityStat): React.CSSProperties {
  return { 
    backgroundColor: getStatColor(stat),
    color: 'white'
  }
}

/**
 * Format class name for display
 */
export function formatClassName(className: DnDClass): string {
  return className.charAt(0).toUpperCase() + className.slice(1)
}

/**
 * Format stat name for display
 */
export function formatStatName(stat: AbilityStat): string {
  const statNames: Record<AbilityStat, string> = {
    strength: 'STR',
    dexterity: 'DEX', 
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA'
  }
  return statNames[stat]
}

/**
 * Get all available D&D classes
 */
export function getAllClasses(): DnDClass[] {
  return [
    'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
    'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'
  ]
}

/**
 * Get all ability stats
 */
export function getAllStats(): AbilityStat[] {
  return ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
}
