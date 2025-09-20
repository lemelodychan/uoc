# Artificer Spell Slots Fix

This document outlines the correction of the Artificer Artillerist spell slot progression in the database to match the official D&D 5e rules.

## Issue Identified

The original Artificer spell slot progression in the database was incorrect and did not follow the official D&D 5e half-caster progression.

### **Original (Incorrect) Progression**

| Level | 1st | 2nd | 3rd | 4th | 5th |
|-------|-----|-----|-----|-----|-----|
| 1     | 2   | 0   | 0   | 0   | 0   |
| 2     | 2   | 0   | 0   | 0   | 0   |
| 3     | 3   | 0   | 0   | 0   | 0   |
| 4     | 3   | 2   | 0   | 0   | 0   |
| 5     | 3   | 2   | 0   | 0   | 0   |
| 6     | 3   | 2   | 2   | 0   | 0   |
| 7     | 3   | 2   | 2   | 0   | 0   |
| 8     | 3   | 2   | 2   | 1   | 0   |
| 9     | 3   | 2   | 2   | 1   | 0   |
| 10    | 3   | 2   | 2   | 1   | 0   |
| 11    | 3   | 2   | 2   | 1   | 1   |

### **Problems with Original Progression**

1. **2nd level slots**: Started at level 4 instead of level 3
2. **3rd level slots**: Started at level 6 instead of level 5
3. **4th level slots**: Started at level 8 instead of level 7
4. **5th level slots**: Started at level 11 instead of level 9

## Correct D&D 5e Artificer Progression

The Artificer is a **half-caster** (like Paladin and Ranger), which means they gain spell slots at half the rate of full casters.

### **Corrected Progression**

| Level | 1st | 2nd | 3rd | 4th | 5th |
|-------|-----|-----|-----|-----|-----|
| 1     | 2   | 0   | 0   | 0   | 0   |
| 2     | 2   | 0   | 0   | 0   | 0   |
| 3     | 3   | 2   | 0   | 0   | 0   |
| 4     | 3   | 2   | 0   | 0   | 0   |
| 5     | 3   | 2   | 2   | 0   | 0   |
| 6     | 3   | 2   | 2   | 0   | 0   |
| 7     | 3   | 2   | 2   | 1   | 0   |
| 8     | 3   | 2   | 2   | 1   | 0   |
| 9     | 3   | 2   | 2   | 1   | 1   |
| 10    | 3   | 2   | 2   | 1   | 1   |
| 11+   | 3   | 2   | 2   | 1   | 1   |

### **Key Corrections**

1. **2nd level slots**: Now start at level 3 (was level 4)
2. **3rd level slots**: Now start at level 5 (was level 6)
3. **4th level slots**: Now start at level 7 (was level 8)
4. **5th level slots**: Now start at level 9 (was level 11)

## Technical Implementation

### **Database Update**

```sql
UPDATE classes SET
    -- 1st level slots: 2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3
    spell_slots_1 = ARRAY[2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
    
    -- 2nd level slots: 0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
    spell_slots_2 = ARRAY[0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    
    -- 3rd level slots: 0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2
    spell_slots_3 = ARRAY[0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    
    -- 4th level slots: 0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1
    spell_slots_4 = ARRAY[0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    
    -- 5th level slots: 0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1
    spell_slots_5 = ARRAY[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1]
    
WHERE name = 'Artificer' AND subclass = 'Artillerist';
```

### **Array Indexing**

The arrays are 0-indexed for levels 1-20:
- `spell_slots_1[1]` = Level 1 spell slots
- `spell_slots_1[2]` = Level 2 spell slots
- etc.

## Half-Caster Progression Rules

### **D&D 5e Half-Caster Rules**

Half-casters (Artificer, Paladin, Ranger) gain spell slots at half the rate of full casters:

- **1st level spells**: Available from level 1
- **2nd level spells**: Available from level 3 (full casters get them at level 3, half casters at level 3)
- **3rd level spells**: Available from level 5 (full casters get them at level 5, half casters at level 5)
- **4th level spells**: Available from level 7 (full casters get them at level 7, half casters at level 7)
- **5th level spells**: Available from level 9 (full casters get them at level 9, half casters at level 9)

### **Spell Slot Counts**

Half-casters get fewer spell slots than full casters:
- **1st level**: 2 slots (vs 2 for full casters)
- **2nd level**: 2 slots (vs 3 for full casters)
- **3rd level**: 2 slots (vs 3 for full casters)
- **4th level**: 1 slot (vs 3 for full casters)
- **5th level**: 1 slot (vs 2 for full casters)

## Impact on Characters

### **Existing Artificer Characters**

After running the fix script:
- **Level 3+ characters**: Will gain access to 2nd level spells
- **Level 5+ characters**: Will gain access to 3rd level spells
- **Level 7+ characters**: Will gain access to 4th level spells
- **Level 9+ characters**: Will gain access to 5th level spells

### **Spell Preparation**

Artificers prepare spells (like Clerics and Druids), so they can choose from their available spell list based on their level and spell slots.

## Verification

### **Test Cases**

The fix script includes verification for:
- **Level 3**: Should have 3 first-level, 2 second-level slots
- **Level 5**: Should have 3 first-level, 2 second-level, 2 third-level slots
- **Level 9**: Should have 3 first-level, 2 second-level, 2 third-level, 1 fourth-level, 1 fifth-level slot

### **Database Queries**

```sql
-- Verify specific levels
SELECT 
    spell_slots_1[3] as first_level_slots_level_3,
    spell_slots_2[3] as second_level_slots_level_3
FROM classes 
WHERE name = 'Artificer' AND subclass = 'Artillerist';
```

## Benefits

### **D&D 5e Compliance**
- **Accurate Progression**: Now matches official D&D 5e rules
- **Proper Half-Caster**: Correctly implements half-caster mechanics
- **Balanced Gameplay**: Appropriate spell slot progression for class balance

### **User Experience**
- **Correct Spell Access**: Characters get spells at the right levels
- **Accurate Character Sheets**: Spell slots display correctly
- **Proper Game Balance**: Maintains intended class power progression

## Conclusion

The Artificer spell slot progression has been corrected to match the official D&D 5e half-caster progression. This ensures:

1. **Rules Compliance**: Matches official D&D 5e rules
2. **Proper Balance**: Maintains intended class power curve
3. **Accurate Character Sheets**: Displays correct spell slot information
4. **Better Gameplay**: Characters get appropriate spell access at each level

The fix script (`36-fix-artificer-spell-slots.sql`) should be run to update the database with the correct progression.
