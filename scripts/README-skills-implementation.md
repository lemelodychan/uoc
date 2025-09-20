# Skills Implementation

This document outlines the implementation of the complete D&D skills system with default skills, proficiency tracking, and automatic passive skill calculations.

## Implementation Overview

### **Previous State**
- Skills were manually added or missing
- No default skill set for new characters
- Passive Perception and Insight were not automatically calculated

### **New Implementation**
- All 18 D&D skills included by default
- All skills start with "none" proficiency
- Automatic calculation of Passive Perception and Insight
- Proper proficiency tracking (none, proficient, expertise)

## Components

### **1. Default Skills System**
**File**: `lib/character-data.ts`

#### **Default Skills Array**
All 18 standard D&D skills are defined:
- **Strength**: Athletics
- **Dexterity**: Acrobatics, Sleight of Hand, Stealth
- **Intelligence**: Arcana, History, Investigation, Nature, Religion
- **Wisdom**: Animal Handling, Insight, Medicine, Perception, Survival
- **Charisma**: Deception, Intimidation, Performance, Persuasion

#### **Skills Creation Function**
```typescript
export const createDefaultSkills = (): Skill[] => {
  return defaultSkills.map(skill => ({
    ...skill,
    proficiency: "none" as ProficiencyLevel
  }))
}
```

### **2. Passive Skills Calculation**
**File**: `lib/character-data.ts`

#### **Passive Perception**
```typescript
export const calculatePassivePerception = (character: CharacterData, proficiencyBonus: number = 2): number => {
  const perceptionSkill = character.skills.find(skill => skill.name === "Perception")
  const wisdomModifier = calculateModifier(character.wisdom)
  
  let skillBonus = wisdomModifier
  if (perceptionSkill?.proficiency === "proficient") {
    skillBonus += proficiencyBonus
  } else if (perceptionSkill?.proficiency === "expertise") {
    skillBonus += proficiencyBonus * 2
  }
  
  return 10 + skillBonus
}
```

#### **Passive Insight**
```typescript
export const calculatePassiveInsight = (character: CharacterData, proficiencyBonus: number = 2): number => {
  const insightSkill = character.skills.find(skill => skill.name === "Insight")
  const wisdomModifier = calculateModifier(character.wisdom)
  
  let skillBonus = wisdomModifier
  if (insightSkill?.proficiency === "proficient") {
    skillBonus += proficiencyBonus
  } else if (insightSkill?.proficiency === "expertise") {
    skillBonus += proficiencyBonus * 2
  }
  
  return 10 + skillBonus
}
```

### **3. Character Creation Integration**
**File**: `app/page.tsx`

#### **Updated Character Creation**
New characters automatically receive all default skills:
```typescript
skills: createDefaultSkills(),
```

### **4. Database Integration**
**File**: `lib/database.ts`

#### **Character Loading**
Characters without skills are automatically initialized with default skills:
```typescript
skills: data.skills && data.skills.length > 0 ? data.skills : createDefaultSkills(),
```

## User Experience

### **New Character Creation**
1. **Character Created** → All 18 skills automatically added
2. **All Skills Start with "None"** → No proficiencies selected initially
3. **User Can Select Proficiencies** → Check proficiency or expertise boxes
4. **Passive Skills Auto-Calculate** → Passive Perception and Insight update automatically

### **Existing Characters**
1. **Characters Loaded** → Skills initialized if missing
2. **Existing Skills Preserved** → No data loss for existing characters
3. **Passive Skills Calculated** → Based on current proficiency selections

### **Skill Management**
- **Proficiency Selection**: Users can check proficiency boxes
- **Expertise Selection**: Users can check expertise boxes (includes proficiency)
- **Automatic Updates**: Passive skills update when proficiencies change
- **Visual Feedback**: Clear indication of skill bonuses

## Technical Details

### **Data Structure**
```typescript
export interface Skill {
  name: string
  ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma"
  proficiency: ProficiencyLevel
}

export type ProficiencyLevel = "none" | "proficient" | "expertise"
```

### **Passive Skill Formula**
- **Base**: 10
- **Ability Modifier**: Based on associated ability score
- **Proficiency Bonus**: Added if proficient (+2, +3, etc. based on level)
- **Expertise Bonus**: Double proficiency bonus if expertise

### **Database Storage**
- **Skills Column**: JSONB array of skill objects
- **Backward Compatibility**: Existing characters without skills get defaults
- **Data Integrity**: All skills have required fields

## UI Implementation

### **Skills Section**
- **All 18 Skills Displayed**: Complete list with ability abbreviations
- **Proficiency Checkboxes**: Separate boxes for proficiency and expertise
- **Skill Bonuses**: Calculated and displayed for each skill
- **Passive Skills Section**: Dedicated area for Passive Perception and Insight

### **Visual Design**
- **Clear Layout**: Easy to read skill list
- **Ability Indicators**: (STR), (DEX), etc. shown for each skill
- **Bonus Display**: Formatted skill bonuses (+2, -1, etc.)
- **Passive Skills**: Prominently displayed below main skills

## Benefits

### **User Experience**
1. **Complete Skill Set**: All D&D skills available from start
2. **No Manual Setup**: Skills automatically included
3. **Automatic Calculations**: Passive skills calculated automatically
4. **Visual Clarity**: Clear indication of proficiencies and bonuses

### **Data Integrity**
1. **Consistent Structure**: All characters have same skill structure
2. **Backward Compatibility**: Existing characters work seamlessly
3. **Proper Calculations**: Passive skills use correct D&D formulas
4. **Database Persistence**: Skills saved and loaded correctly

### **Gameplay Accuracy**
1. **D&D Compliant**: Follows standard D&D 5e skill system
2. **Proper Bonuses**: Correct proficiency and expertise calculations
3. **Passive Skills**: Standard passive perception and insight formulas
4. **Ability Associations**: Correct ability scores for each skill

## Testing

### **Verification Script**
Run `21-test-skills-implementation.sql` to verify:
- Skills column structure in database
- Default skills data format
- Character creation with skills
- Passive skill calculations

### **Manual Testing**
1. Create new character → Verify all 18 skills present
2. Select proficiencies → Verify bonuses update
3. Check expertise → Verify double proficiency bonus
4. Verify passive skills → Check automatic calculations
5. Load existing character → Verify skills preserved/initialized

## Future Enhancements

### **Potential Improvements**
1. **Skill Descriptions**: Tooltips with skill descriptions
2. **Custom Skills**: Allow adding custom skills
3. **Skill Categories**: Group skills by ability score
4. **Skill History**: Track skill proficiency changes
5. **Bulk Operations**: Select multiple skills for proficiency

### **Advanced Features**
1. **Skill Challenges**: Built-in skill challenge system
2. **Skill Synergies**: Bonuses for related skills
3. **Skill Training**: Time-based skill improvement
4. **Skill Feats**: Feats that modify specific skills

The skills system is now complete with all default D&D skills, proper proficiency tracking, and automatic passive skill calculations!
