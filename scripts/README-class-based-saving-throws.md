# Class-Based Saving Throws Implementation

This document outlines the implementation of automatic class-based saving throw proficiency assignment during character creation.

## Implementation Overview

### **Previous State**
- All saving throws started with "none" proficiency
- Users had to manually select class-based proficiencies
- No automatic assignment based on class selection

### **New Implementation**
- **Automatic Assignment**: Class-based saving throw proficiencies automatically assigned during character creation
- **D&D Compliant**: Follows standard D&D 5e class saving throw proficiencies
- **Manual Override**: Users can still manually adjust proficiencies if needed
- **Backward Compatible**: Existing characters work seamlessly

## Class Saving Throw Proficiencies

### **Implemented Classes**
All 13 standard D&D 5e classes are supported:

| Class | Saving Throw Proficiencies |
|-------|---------------------------|
| **Bard** | Dexterity, Charisma |
| **Artificer** | Constitution, Intelligence |
| **Wizard** | Intelligence, Wisdom |
| **Fighter** | Strength, Constitution |
| **Rogue** | Dexterity, Intelligence |
| **Cleric** | Wisdom, Charisma |
| **Ranger** | Strength, Dexterity |
| **Paladin** | Wisdom, Charisma |
| **Barbarian** | Strength, Constitution |
| **Monk** | Strength, Dexterity |
| **Sorcerer** | Constitution, Charisma |
| **Warlock** | Wisdom, Charisma |
| **Druid** | Intelligence, Wisdom |

## Technical Implementation

### **1. Class-Based Assignment Function**
**File**: `lib/character-data.ts`

#### **Function Definition**
```typescript
export const createClassBasedSavingThrowProficiencies = (className: string): SavingThrowProficiency[] => {
  const defaultProficiencies = createDefaultSavingThrowProficiencies()
  
  // Define class-based saving throw proficiencies
  const classSavingThrows: Record<string, string[]> = {
    "Bard": ["dexterity", "charisma"],
    "Artificer": ["constitution", "intelligence"],
    "Wizard": ["intelligence", "wisdom"],
    // ... all 13 classes
  }
  
  const classProficiencies = classSavingThrows[className] || []
  
  return defaultProficiencies.map(proficiency => ({
    ...proficiency,
    proficient: classProficiencies.includes(proficiency.ability)
  }))
}
```

### **2. Character Creation Integration**
**File**: `app/page.tsx`

#### **Updated Character Creation**
```typescript
savingThrowProficiencies: createClassBasedSavingThrowProficiencies(characterData.class),
```

### **3. Database Integration**
**File**: `lib/database.ts`

#### **Character Loading**
Characters without saving throw proficiencies are automatically initialized with class-based proficiencies:
```typescript
savingThrowProficiencies: data.saving_throw_proficiencies && data.saving_throw_proficiencies.length > 0 
  ? data.saving_throw_proficiencies 
  : createClassBasedSavingThrowProficiencies(data.class_name),
```

## User Experience

### **Character Creation Flow**
1. **User Selects Class** → Class-based saving throw proficiencies automatically assigned
2. **Character Created** → Saving throws appear with correct proficiencies checked
3. **Manual Adjustment** → Users can still modify proficiencies if needed
4. **Automatic Calculation** → Saving throw bonuses calculated automatically

### **Example: Bard Character**
When creating a Bard character:
- **Dexterity Save**: Automatically marked as proficient
- **Charisma Save**: Automatically marked as proficient
- **Other Saves**: Remain non-proficient
- **Bonuses**: Automatically calculated (+2 proficiency bonus added to Dex and Cha saves)

### **Example: Artificer Character**
When creating an Artificer character:
- **Constitution Save**: Automatically marked as proficient
- **Intelligence Save**: Automatically marked as proficient
- **Other Saves**: Remain non-proficient
- **Bonuses**: Automatically calculated (+2 proficiency bonus added to Con and Int saves)

## Benefits

### **User Experience**
1. **Automatic Setup**: No manual configuration needed for class proficiencies
2. **D&D Compliant**: Follows official D&D 5e rules
3. **Time Saving**: Eliminates manual proficiency selection
4. **Error Prevention**: Reduces chance of incorrect proficiency assignment

### **Data Integrity**
1. **Consistent Assignment**: All characters of same class get same proficiencies
2. **Rule Compliance**: Follows official D&D class specifications
3. **Backward Compatibility**: Existing characters work without issues
4. **Manual Override**: Users can still customize if needed

### **Gameplay Accuracy**
1. **Official Rules**: Matches D&D 5e class specifications exactly
2. **Proper Bonuses**: Correct proficiency bonus calculations
3. **Class Identity**: Reinforces class characteristics through saving throws
4. **Balanced Gameplay**: Ensures proper class balance

## Database Schema

### **Classes Table**
The `classes` table already contains saving throw proficiencies:
```sql
saving_throw_proficiencies TEXT[]
```

### **Characters Table**
The `characters` table stores individual character saving throw proficiencies:
```sql
saving_throw_proficiencies JSONB DEFAULT '[]'
```

### **Data Flow**
1. **Class Selection** → Class saving throw proficiencies retrieved
2. **Character Creation** → Proficiencies assigned based on class
3. **Database Storage** → Individual character proficiencies saved
4. **Character Loading** → Proficiencies loaded or auto-assigned if missing

## Testing

### **Verification Script**
Run `24-test-class-based-saving-throws.sql` to verify:
- Classes table contains saving throw proficiencies
- Class-based assignment works correctly
- Character creation assigns proper proficiencies
- Existing characters load correctly

### **Manual Testing**
1. Create Bard character → Verify Dex and Cha saves are proficient
2. Create Artificer character → Verify Con and Int saves are proficient
3. Create Wizard character → Verify Int and Wis saves are proficient
4. Check existing characters → Verify they load with proper proficiencies
5. Modify proficiencies → Verify manual changes work correctly

## Future Enhancements

### **Potential Improvements**
1. **Subclass Proficiencies**: Some subclasses grant additional saving throw proficiencies
2. **Race Proficiencies**: Some races grant saving throw proficiencies
3. **Feat Proficiencies**: Some feats grant saving throw proficiencies
4. **Multiclassing**: Handle saving throw proficiencies for multiclass characters

### **Advanced Features**
1. **Proficiency Sources**: Track where proficiencies come from (class, race, feat)
2. **Proficiency History**: Track changes to saving throw proficiencies
3. **Conditional Proficiencies**: Proficiencies that change based on conditions
4. **Custom Proficiencies**: Allow custom saving throw proficiencies

## Implementation Details

### **Function Logic**
1. **Default Creation**: Start with all saving throws non-proficient
2. **Class Lookup**: Find class in predefined proficiency map
3. **Proficiency Assignment**: Mark class proficiencies as proficient
4. **Return Result**: Return complete saving throw proficiency array

### **Error Handling**
- **Unknown Class**: Falls back to default (no proficiencies)
- **Missing Data**: Gracefully handles missing class information
- **Invalid Data**: Validates saving throw proficiency data

### **Performance**
- **Efficient Lookup**: O(1) class lookup in predefined map
- **Minimal Processing**: Simple array mapping operation
- **Cached Results**: No database queries needed for proficiency assignment

The class-based saving throws system is now complete and provides automatic, D&D-compliant saving throw proficiency assignment during character creation!
