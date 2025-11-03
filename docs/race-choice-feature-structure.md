# Race Choice Feature Structure

This document describes the expected structure for choice-type race features to ensure compatibility with the character creation flow.

## Feature Structure

A choice feature should have:
```typescript
{
  feature_type: 'choice',
  name: string,
  description: string,
  options: Array<ChoiceOption>
}
```

## Choice Option Structure

Each option in the `options` array should have:

### Base Fields (Required)
- `type`: 'trait' | 'darkvision' | 'skill_proficiency' | 'weapon_proficiency' | 'spell'
- `name`: string (display name, used as the selection value)
- `description`: string (rich text supported)

### Type-Specific Fields

#### trait
- `speed_bonus` (optional): number - Speed bonus in feet

#### darkvision
- `speed_bonus` (optional): number - Speed bonus in feet
- Note: Stored as type "darkvision" for backward compatibility with Custom Lineage, but functions as a trait

#### skill_proficiency
- `skill_choice`: 'fixed' | 'any'
  - If 'any': `skill_count`: number (how many skills can be chosen)

#### weapon_proficiency
- `weapons`: string[] - Array of weapon names (e.g., ["Simple Weapons", "Longswords"])

#### spell
- Standard trait fields, no additional required fields

## Character Creation Flow Compatibility

### Half-Elf Versatility Pattern
The character creation modal uses:
- `feature.options.map(option => option.name)` to populate the select dropdown
- `option.type`, `option.weapons`, `option.speed_bonus`, `option.skill_choice`, `option.skill_count` for option-specific logic

### Custom Lineage Variable Trait Pattern
The character creation modal has hardcoded UI for Custom Lineage specifically:
- Checks for `feature.name === 'Variable Trait'`
- Uses hardcoded values 'darkvision' or 'skill_proficiency'
- However, the feature should still have proper options structure for consistency

## Example: Half-Elf Versatility
```json
{
  "feature_type": "choice",
  "name": "Half-Elf Versatility",
  "description": "Choose one of the following options...",
  "options": [
    {
      "type": "weapon_proficiency",
      "name": "Elf Weapon Training",
      "description": "You have proficiency with the longsword, shortsword, shortbow, and longbow.",
      "weapons": ["Longswords", "Shortswords", "Shortbows", "Longbows"]
    },
    {
      "type": "skill_proficiency",
      "name": "Skill Versatility",
      "description": "You gain proficiency in two skills of your choice.",
      "skill_choice": "any",
      "skill_count": 2
    },
    {
      "type": "trait",
      "name": "Fleet of Foot",
      "description": "Your base walking speed increases to 35 feet.",
      "speed_bonus": 5
    }
  ]
}
```

## Example: Custom Lineage Variable Trait
```json
{
  "feature_type": "choice",
  "name": "Variable Trait",
  "description": "You gain one of the following options...",
  "options": [
    {
      "type": "darkvision",
      "name": "Darkvision",
      "description": "You have darkvision with a range of 60 feet."
    },
    {
      "type": "skill_proficiency",
      "name": "Skill Proficiency",
      "description": "You gain proficiency in one skill of your choice.",
      "skill_choice": "any",
      "skill_count": 1
    }
  ]
}
```

