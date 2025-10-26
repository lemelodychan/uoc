/**
 * Class Feature Mapping
 * 
 * This file maps existing hardcoded class features to the new template system.
 * It provides backward compatibility and migration paths for existing features.
 */

import type { ClassFeatureSkill } from './class-feature-types'
import { FEATURE_TEMPLATES } from './class-feature-templates'

/**
 * Mapping of existing hardcoded features to their template equivalents
 * This is used for migration and backward compatibility
 */
export const EXISTING_FEATURE_MAPPING: Record<string, {
  templateId: string
  className: string
  subclass?: string
  level: number
  legacyField?: string  // Database column name for legacy tracking
}> = {
  // Bard features
  'bardic-inspiration': {
    templateId: 'bardic-inspiration',
    className: 'Bard',
    level: 1,
    legacyField: 'bardic_inspiration_used'
  },
  'song-of-rest': {
    templateId: 'song-of-rest',
    className: 'Bard',
    level: 2
  },

  // Artificer features
  'flash-of-genius': {
    templateId: 'flash-of-genius',
    className: 'Artificer',
    level: 7,
    legacyField: 'flash_of_genius_used'
  },
  'artificer-infusions': {
    templateId: 'artificer-infusions',
    className: 'Artificer',
    level: 2
  },
  'eldritch-cannon': {
    templateId: 'eldritch-cannon',
    className: 'Artificer',
    subclass: 'Artillerist',
    level: 3
  },

  // Paladin features
  'divine-sense': {
    templateId: 'divine-sense',
    className: 'Paladin',
    level: 1,
    legacyField: 'divine_sense_used'
  },
  'lay-on-hands': {
    templateId: 'lay-on-hands',
    className: 'Paladin',
    level: 1,
    legacyField: 'lay_on_hands_hp_used'
  },
  'channel-divinity-paladin': {
    templateId: 'channel-divinity',
    className: 'Paladin',
    level: 2,
    legacyField: 'channel_divinity_used'
  },
  'cleansing-touch': {
    templateId: 'cleansing-touch',
    className: 'Paladin',
    level: 14,
    legacyField: 'cleansing_touch_used'
  },

  // Warlock features
  'eldritch-invocations': {
    templateId: 'eldritch-invocations',
    className: 'Warlock',
    level: 2
  },

  // Monk features
  'ki-points': {
    templateId: 'ki-points',
    className: 'Monk',
    level: 2
  },

  // Sorcerer features
  'sorcery-points': {
    templateId: 'sorcery-points',
    className: 'Sorcerer',
    level: 2
  },
  'metamagic': {
    templateId: 'metamagic',
    className: 'Sorcerer',
    level: 3
  }
}

/**
 * Get the template for an existing feature by its mapping key
 */
export function getTemplateForExistingFeature(featureKey: string): ClassFeatureSkill | null {
  const mapping = EXISTING_FEATURE_MAPPING[featureKey]
  if (!mapping) {
    return null
  }

  return FEATURE_TEMPLATES[mapping.templateId] || null
}

/**
 * Get all features for a specific class and level
 */
export function getFeaturesForClass(className: string, level: number, subclass?: string): ClassFeatureSkill[] {
  const features: ClassFeatureSkill[] = []


  for (const [key, mapping] of Object.entries(EXISTING_FEATURE_MAPPING)) {
    const classNameMatch = mapping.className.toLowerCase() === className.toLowerCase()
    const levelMatch = mapping.level <= level
    // For base class features (no subclass specified), they should match any subclass
    // For subclass-specific features, they should match exactly
    const subclassMatch = mapping.subclass === undefined || mapping.subclass === subclass
    
    
    if (classNameMatch && levelMatch && subclassMatch) {
      const template = FEATURE_TEMPLATES[mapping.templateId]
      if (template) {
        features.push(template)
      } else {
      }
    }
  }

  return features
}

/**
 * Get the legacy database field name for a feature
 */
export function getLegacyFieldForFeature(featureKey: string): string | null {
  return EXISTING_FEATURE_MAPPING[featureKey]?.legacyField || null
}

/**
 * Check if a feature has legacy tracking
 */
export function hasLegacyTracking(featureKey: string): boolean {
  return EXISTING_FEATURE_MAPPING[featureKey]?.legacyField !== undefined
}

/**
 * Get all features that need legacy migration
 */
export function getFeaturesNeedingMigration(): Array<{
  featureKey: string
  template: ClassFeatureSkill
  legacyField: string
  className: string
  level: number
}> {
  const features: Array<{
    featureKey: string
    template: ClassFeatureSkill
    legacyField: string
    className: string
    level: number
  }> = []

  for (const [key, mapping] of Object.entries(EXISTING_FEATURE_MAPPING)) {
    if (mapping.legacyField) {
      const template = FEATURE_TEMPLATES[mapping.templateId]
      if (template) {
        features.push({
          featureKey: key,
          template,
          legacyField: mapping.legacyField,
          className: mapping.className,
          level: mapping.level
        })
      }
    }
  }

  return features
}

/**
 * D&D 5e Class Features Documentation
 * 
 * This section documents all class-specific features that need usage tracking
 * based on official D&D 5e rules. This serves as a reference for populating
 * the complete feature system.
 */

export const DND5E_CLASS_FEATURES = {
  // Barbarian
  Barbarian: {
    'rage': {
      type: 'slots',
      level: 1,
      usesFormula: '2', // 2 at 1st, 3 at 3rd, 4 at 6th, 5 at 12th, 6 at 17th, unlimited at 20th
      replenishOn: 'long_rest',
      description: 'Enter a berserker rage'
    },
    'reckless-attack': {
      type: 'special_ux',
      level: 2,
      description: 'Attack with advantage but grant advantage to enemies'
    },
    'danger-sense': {
      type: 'special_ux',
      level: 2,
      description: 'Advantage on Dexterity saves against effects you can see'
    }
  },

  // Bard
  Bard: {
    'bardic-inspiration': {
      type: 'slots',
      level: 1,
      usesFormula: 'charisma_modifier',
      replenishOn: 'short_rest',
      description: 'Grant inspiration dice to allies'
    },
    'song-of-rest': {
      type: 'special_ux',
      level: 2,
      description: 'Enhanced healing during short rests'
    },
    'countercharm': {
      type: 'special_ux',
      level: 6,
      description: 'Grant advantage against charm and fear'
    }
  },

  // Cleric
  Cleric: {
    'channel-divinity': {
      type: 'slots',
      level: 2,
      usesFormula: '1', // 1 at 2nd, 2 at 6th, 3 at 18th
      replenishOn: 'short_rest',
      description: 'Channel divine power'
    },
    'destroy-undead': {
      type: 'special_ux',
      level: 5,
      description: 'Destroy undead with Channel Divinity'
    }
  },

  // Druid
  Druid: {
    'wild-shape': {
      type: 'special_ux',
      level: 2,
      usesFormula: '2', // 2 at 2nd, unlimited at 20th
      replenishOn: 'short_rest',
      description: 'Transform into beasts'
    },
    'timeless-body': {
      type: 'special_ux',
      level: 18,
      description: 'Age slowly and resist magical aging'
    }
  },

  // Fighter
  Fighter: {
    'action-surge': {
      type: 'slots',
      level: 2,
      usesFormula: '1', // 1 at 2nd, 2 at 17th
      replenishOn: 'short_rest',
      description: 'Take an additional action'
    },
    'second-wind': {
      type: 'slots',
      level: 1,
      usesFormula: '1',
      replenishOn: 'short_rest',
      description: 'Heal as a bonus action'
    },
    'indomitable': {
      type: 'slots',
      level: 9,
      usesFormula: '1', // 1 at 9th, 2 at 13th, 3 at 17th
      replenishOn: 'long_rest',
      description: 'Reroll a saving throw'
    }
  },

  // Monk
  Monk: {
    'ki-points': {
      type: 'points_pool',
      level: 2,
      totalFormula: 'level',
      replenishOn: 'short_rest',
      description: 'Martial arts energy for special abilities'
    },
    'martial-arts': {
      type: 'special_ux',
      level: 1,
      description: 'Unarmed strikes and bonus action attacks'
    },
    'unarmored-defense': {
      type: 'special_ux',
      level: 1,
      description: 'AC calculation without armor'
    }
  },

  // Paladin
  Paladin: {
    'divine-sense': {
      type: 'slots',
      level: 1,
      usesFormula: '1 + charisma_modifier',
      replenishOn: 'long_rest',
      description: 'Detect celestials, fiends, and undead'
    },
    'lay-on-hands': {
      type: 'points_pool',
      level: 1,
      totalFormula: 'level * 5',
      replenishOn: 'long_rest',
      description: 'Healing pool'
    },
    'channel-divinity': {
      type: 'slots',
      level: 2,
      usesFormula: '1', // 1 at 2nd, 2 at 6th, 3 at 18th
      replenishOn: 'short_rest',
      description: 'Channel divine power'
    },
    'cleansing-touch': {
      type: 'slots',
      level: 14,
      usesFormula: 'charisma_modifier',
      replenishOn: 'long_rest',
      description: 'End spells on creatures'
    }
  },

  // Ranger
  Ranger: {
    'favored-enemy': {
      type: 'special_ux',
      level: 1,
      description: 'Bonus damage and tracking against specific creature types'
    },
    'natural-explorer': {
      type: 'special_ux',
      level: 1,
      description: 'Enhanced travel and survival abilities'
    },
    'primeval-awareness': {
      type: 'slots',
      level: 3,
      usesFormula: '1 + wisdom_modifier',
      replenishOn: 'long_rest',
      description: 'Sense nearby creatures'
    }
  },

  // Rogue
  Rogue: {
    'sneak-attack': {
      type: 'special_ux',
      level: 1,
      description: 'Extra damage when conditions are met'
    },
    'cunning-action': {
      type: 'special_ux',
      level: 2,
      description: 'Dash, Disengage, or Hide as bonus action'
    },
    'uncanny-dodge': {
      type: 'special_ux',
      level: 5,
      description: 'Halve damage from one attack'
    }
  },

  // Sorcerer
  Sorcerer: {
    'sorcery-points': {
      type: 'points_pool',
      level: 2,
      totalFormula: 'level',
      replenishOn: 'long_rest',
      description: 'Raw magical energy for metamagic'
    },
    'metamagic': {
      type: 'options_list',
      level: 3,
      maxSelectionsFormula: '2', // 2 at 3rd, 3 at 10th, 4 at 17th
      description: 'Modify spell effects'
    },
    'font-of-magic': {
      type: 'special_ux',
      level: 2,
      description: 'Convert between spell slots and sorcery points'
    }
  },

  // Warlock
  Warlock: {
    'eldritch-invocations': {
      type: 'options_list',
      level: 2,
      maxSelectionsFormula: 'warlock_invocations_known',
      description: 'Mystical abilities and enhancements'
    },
    'mystic-arcanum': {
      type: 'special_ux',
      level: 11,
      description: 'One 6th-level spell known and castable once per long rest'
    }
  },

  // Wizard
  Wizard: {
    'arcane-recovery': {
      type: 'slots',
      level: 1,
      usesFormula: '1',
      replenishOn: 'long_rest',
      description: 'Recover some spell slots on short rest'
    },
    'ritual-casting': {
      type: 'special_ux',
      level: 1,
      description: 'Cast ritual spells without expending spell slots'
    }
  },

  // Artificer
  Artificer: {
    'magical-tinkering': {
      type: 'special_ux',
      level: 1,
      description: 'Imbue objects with minor magical properties'
    },
    'infusions': {
      type: 'options_list',
      level: 2,
      maxSelectionsFormula: 'artificer_infusions_known',
      description: 'Magical item enhancements'
    },
    'flash-of-genius': {
      type: 'slots',
      level: 7,
      usesFormula: 'intelligence_modifier',
      replenishOn: 'long_rest',
      description: 'Add Intelligence modifier to ability checks and saving throws'
    }
  }
}

/**
 * Get all features for a class that need usage tracking
 */
export function getClassFeaturesNeedingTracking(className: string): Array<{
  name: string
  type: string
  level: number
  description: string
}> {
  const classFeatures = DND5E_CLASS_FEATURES[className as keyof typeof DND5E_CLASS_FEATURES]
  if (!classFeatures) {
    return []
  }

  return Object.entries(classFeatures).map(([name, config]) => ({
    name,
    type: config.type,
    level: config.level,
    description: config.description
  }))
}
