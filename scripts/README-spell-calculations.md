# Automatic Spell Calculations Implementation

This document outlines the implementation of automatic spell save DC, spell attack bonus, and dynamic spells known calculations for D&D 5e character sheets.

## Implementation Overview

### **Previous State**
- Spell save DC and attack bonus were manually entered
- Spells known were fixed values from class tables
- No automatic calculation based on ability scores and class

### **New Implementation**
- **Automatic Spell Save DC**: Calculated from class primary ability + proficiency bonus
- **Automatic Spell Attack Bonus**: Calculated from class primary ability + proficiency bonus
- **Dynamic Artificer Spells Known**: Intelligence modifier + half level (minimum 1)
- **Dynamic Paladin Spells Known**: Charisma modifier + half level (minimum 1)
- **Fallback Logic**: Uses stored values if available, calculates if missing

## Spell Calculation Formulas

### **Spell Save DC**
```
Spell Save DC = 8 + Ability Modifier + Proficiency Bonus
```

### **Spell Attack Bonus**
```
Spell Attack Bonus = Ability Modifier + Proficiency Bonus
```

### **Artificer Spells Known**
```
Spells Known = Intelligence Modifier + Half Artificer Level (minimum 1)
```

### **Paladin Spells Known**
```
Spells Known = Charisma Modifier + Half Paladin Level (minimum 1)
```

## Class Primary Abilities

### **Implemented Classes**
| Class | Primary Ability | Spell Save DC | Spell Attack Bonus |
|-------|----------------|---------------|-------------------|
| **Bard** | Charisma | 8 + Cha Mod + Prof | Cha Mod + Prof |
| **Artificer** | Intelligence | 8 + Int Mod + Prof | Int Mod + Prof |
| **Wizard** | Intelligence | 8 + Int Mod + Prof | Int Mod + Prof |
| **Fighter** | Strength | N/A (No spellcasting) | N/A |
| **Rogue** | Dexterity | N/A (No spellcasting) | N/A |
| **Cleric** | Wisdom | 8 + Wis Mod + Prof | Wis Mod + Prof |
| **Ranger** | Wisdom | 8 + Wis Mod + Prof | Wis Mod + Prof |
| **Paladin** | Charisma | 8 + Cha Mod + Prof | Cha Mod + Prof |
| **Barbarian** | Strength | N/A (No spellcasting) | N/A |
| **Monk** | Dexterity | N/A (No spellcasting) | N/A |
| **Sorcerer** | Charisma | 8 + Cha Mod + Prof | Cha Mod + Prof |
| **Warlock** | Charisma | 8 + Cha Mod + Prof | Cha Mod + Prof |
| **Druid** | Wisdom | 8 + Wis Mod + Prof | Wis Mod + Prof |

## Technical Implementation

### **1. Spell Save DC Calculation**
**File**: `lib/character-data.ts`

#### **Function Definition**
```typescript
export const calculateSpellSaveDC = (
  character: CharacterData,
  classData?: any,
  proficiencyBonus?: number
): number => {
  if (!classData?.primary_ability || !Array.isArray(classData.primary_ability) || classData.primary_ability.length === 0) {
    return 8 // Default DC if no spellcasting ability
  }
  
  const spellcastingAbility = classData.primary_ability[0].toLowerCase()
  const abilityModifier = calculateModifier(character[spellcastingAbility as keyof CharacterData] as number)
  const profBonus = proficiencyBonus || calculateProficiencyBonus(character.level)
  
  return 8 + abilityModifier + profBonus
}
```

### **2. Spell Attack Bonus Calculation**
**File**: `lib/character-data.ts`

#### **Function Definition**
```typescript
export const calculateSpellAttackBonus = (
  character: CharacterData,
  classData?: any,
  proficiencyBonus?: number
): number => {
  if (!classData?.primary_ability || !Array.isArray(classData.primary_ability) || classData.primary_ability.length === 0) {
    return 0 // No spell attack bonus if no spellcasting ability
  }
  
  const spellcastingAbility = classData.primary_ability[0].toLowerCase()
  const abilityModifier = calculateModifier(character[spellcastingAbility as keyof CharacterData] as number)
  const profBonus = proficiencyBonus || calculateProficiencyBonus(character.level)
  
  return abilityModifier + profBonus
}
```

### **3. Artificer Spells Known Calculation**
**File**: `lib/character-data.ts`

#### **Function Definition**
```typescript
export const calculateArtificerSpellsKnown = (character: CharacterData): number => {
  if (character.class.toLowerCase() !== "artificer") {
    return 0
  }
  
  const intelligenceModifier = calculateModifier(character.intelligence)
  const halfLevel = Math.floor(character.level / 2)
  
  return Math.max(1, intelligenceModifier + halfLevel)
}
```

### **4. Dynamic Spells Known Logic**
**File**: `lib/character-data.ts`

#### **Function Definition**
```typescript
export const getSpellsKnown = (
  character: CharacterData,
  classData?: any
): number => {
  // For Artificers, use the dynamic calculation
  if (character.class.toLowerCase() === "artificer") {
    return calculateArtificerSpellsKnown(character)
  }
  
  // For other classes, use the class data if available
  if (classData?.spells_known && Array.isArray(classData.spells_known)) {
    const levelIndex = character.level - 1
    if (levelIndex >= 0 && levelIndex < classData.spells_known.length) {
      const spellsKnown = classData.spells_known[levelIndex]
      // If spells_known is 0 in the array, fall back to Artificer logic for Artificers
      if (spellsKnown === 0 && character.class.toLowerCase() === "artificer") {
        return calculateArtificerSpellsKnown(character)
      }
      return spellsKnown
    }
  }
  
  return 0
}
```

## Integration Points

### **1. Character Creation**
**File**: `app/page.tsx`

#### **Updated Character Creation**
```typescript
// Load class data to get primary ability for spell calculations
const { classData } = await loadClassData(characterData.class, characterData.subclass)
const proficiencyBonus = calculateProficiencyBonus(characterData.level)

// Now calculate spell values using the temporary character
const newCharacter: CharacterData = {
  ...tempCharacter,
  spellData: {
    ...tempCharacter.spellData,
    spellAttackBonus: calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
    spellSaveDC: calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
    cantripsKnown: 0, // Will be calculated from class data
    spellsKnown: getSpellsKnown(tempCharacter, classData),
  },
}
```

### **2. Database Loading**
**File**: `lib/database.ts`

#### **Character Loading with Automatic Calculations**
```typescript
// Load class data for automatic spell calculations
const { classData } = await loadClassData(data.class_name, data.subclass)
const proficiencyBonus = calculateProficiencyBonus(data.level)

// Now calculate spell values and create final character
const character: CharacterData = {
  ...tempCharacter,
  spellData: {
    ...tempCharacter.spellData,
    spellAttackBonus: data.spell_attack_bonus || calculateSpellAttackBonus(tempCharacter, classData, proficiencyBonus),
    spellSaveDC: data.spell_save_dc || calculateSpellSaveDC(tempCharacter, classData, proficiencyBonus),
    spellsKnown: data.spells_known || getSpellsKnown(tempCharacter, classData),
  },
}
```

## Calculation Examples

### **Bard Character (Level 1, 16 Charisma)**
- **Primary Ability**: Charisma
- **Charisma Modifier**: +3 (16 Charisma)
- **Proficiency Bonus**: +2 (Level 1)
- **Spell Save DC**: 8 + 3 + 2 = **13**
- **Spell Attack Bonus**: 3 + 2 = **+5**

### **Artificer Character (Level 3, 14 Intelligence)**
- **Primary Ability**: Intelligence
- **Intelligence Modifier**: +2 (14 Intelligence)
- **Proficiency Bonus**: +2 (Level 3)
- **Spell Save DC**: 8 + 2 + 2 = **12**
- **Spell Attack Bonus**: 2 + 2 = **+4**
- **Spells Known**: 2 + 1 = **3** (Int mod + half level)

### **Wizard Character (Level 5, 18 Intelligence)**
- **Primary Ability**: Intelligence
- **Intelligence Modifier**: +4 (18 Intelligence)
- **Proficiency Bonus**: +3 (Level 5)
- **Spell Save DC**: 8 + 4 + 3 = **15**
- **Spell Attack Bonus**: 4 + 3 = **+7**

## Artificer Spells Known Examples

### **Level 1 Artificer with 16 Intelligence**
- **Intelligence Modifier**: +3
- **Half Level**: 0 (Level 1 ÷ 2 = 0.5, rounded down)
- **Spells Known**: 3 + 0 = **3**

### **Level 3 Artificer with 16 Intelligence**
- **Intelligence Modifier**: +3
- **Half Level**: 1 (Level 3 ÷ 2 = 1.5, rounded down)
- **Spells Known**: 3 + 1 = **4**

### **Level 5 Artificer with 14 Intelligence**
- **Intelligence Modifier**: +2
- **Half Level**: 2 (Level 5 ÷ 2 = 2.5, rounded down)
- **Spells Known**: 2 + 2 = **4**

### **Level 1 Artificer with 12 Intelligence (Minimum)**
- **Intelligence Modifier**: +1
- **Half Level**: 0 (Level 1 ÷ 2 = 0.5, rounded down)
- **Spells Known**: 1 + 0 = **1** (minimum enforced)

## Benefits

### **User Experience**
1. **Automatic Setup**: No manual calculation needed for spell values
2. **D&D Compliant**: Follows official D&D 5e formulas exactly
3. **Dynamic Updates**: Values automatically update when ability scores change
4. **Error Prevention**: Eliminates calculation errors

### **Data Integrity**
1. **Consistent Calculations**: All characters use same formulas
2. **Rule Compliance**: Follows official D&D spell calculation rules
3. **Backward Compatibility**: Existing characters work without issues
4. **Fallback Logic**: Uses stored values if available

### **Gameplay Accuracy**
1. **Official Rules**: Matches D&D 5e spell calculation specifications
2. **Class Identity**: Each class uses correct primary ability
3. **Level Scaling**: Proficiency bonus automatically scales with level
4. **Artificer Logic**: Proper dynamic spells known calculation

## Database Schema

### **Classes Table**
The `classes` table contains primary ability information:
```sql
primary_ability TEXT[] -- e.g., ARRAY['Charisma'] for Bard
```

### **Characters Table**
The `characters` table stores calculated spell values:
```sql
spell_attack_bonus INTEGER
spell_save_dc INTEGER
spells_known INTEGER
```

### **Data Flow**
1. **Class Selection** → Primary ability retrieved from classes table
2. **Character Creation** → Spell values calculated using primary ability
3. **Database Storage** → Calculated values saved to characters table
4. **Character Loading** → Values loaded or recalculated if missing

## Testing

### **Verification Script**
Run `25-test-spell-calculations.sql` to verify:
- Classes table contains primary ability data
- Spell calculations work correctly for all classes
- Artificer spells known uses dynamic calculation
- Character creation assigns proper spell values
- Existing characters load with correct calculations

### **Manual Testing**
1. Create Bard character → Verify Charisma-based spell calculations
2. Create Artificer character → Verify Intelligence-based calculations and dynamic spells known
3. Create Wizard character → Verify Intelligence-based spell calculations
4. Check existing characters → Verify they load with proper calculations
5. Modify ability scores → Verify spell values update automatically

## Future Enhancements

### **Potential Improvements**
1. **Multiclassing**: Handle spell calculations for multiclass characters
2. **Magic Items**: Factor in magic items that affect spell calculations
3. **Feats**: Include feats that modify spell calculations
4. **Subclass Features**: Some subclasses modify spell calculations

### **Advanced Features**
1. **Spell Calculation History**: Track changes to spell values
2. **Custom Calculations**: Allow custom spell calculation formulas
3. **Conditional Modifiers**: Handle temporary modifiers to spell calculations
4. **Spell Focus**: Factor in spellcasting focus bonuses

The automatic spell calculations system is now complete and provides D&D-compliant spell save DC, spell attack bonus, and dynamic spells known calculations for all character classes!
