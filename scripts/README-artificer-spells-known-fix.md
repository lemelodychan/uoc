# Artificer Spells Known Fix

This document outlines the fix for Artificer spells known not respecting manually set database values.

## Problem Description

### **Issue**
When users manually set the `spells_known` value in the database for Artificer characters, the system was ignoring the stored value and always using the dynamic calculation (Intelligence modifier + half level).

### **Root Cause**
The `getSpellsKnown` function was always using the Artificer calculation for Artificer characters, without checking if there was a manually set value in the database.

### **Expected Behavior**
- If a user manually sets `spells_known` to 7 in the database, the character should show 7 spells known
- If no manual value is set, the system should calculate dynamically using the Artificer formula

## Solution Implementation

### **1. Updated Function Signature**
**File**: `lib/character-data.ts`

#### **Before Fix**
```typescript
export const getSpellsKnown = (
  character: CharacterData,
  classData?: any
): number => {
  // For Artificers, use the dynamic calculation
  if (character.class.toLowerCase() === "artificer") {
    return calculateArtificerSpellsKnown(character)
  }
  // ... rest of function
}
```

#### **After Fix**
```typescript
export const getSpellsKnown = (
  character: CharacterData,
  classData?: any,
  storedValue?: number
): number => {
  // If there's a stored value (from database), use it
  if (storedValue !== undefined && storedValue !== null) {
    return storedValue
  }
  
  // For Artificers, use the dynamic calculation
  if (character.class.toLowerCase() === "artificer") {
    return calculateArtificerSpellsKnown(character)
  }
  // ... rest of function
}
```

### **2. Updated Database Loading**
**File**: `lib/database.ts`

#### **Before Fix**
```typescript
spellsKnown: data.spells_known || getSpellsKnown(tempCharacter, classData),
```

#### **After Fix**
```typescript
spellsKnown: getSpellsKnown(tempCharacter, classData, data.spells_known),
```

### **3. Updated Character Creation**
**File**: `app/page.tsx`

#### **Before Fix**
```typescript
spellsKnown: getSpellsKnown(tempCharacter, classData),
```

#### **After Fix**
```typescript
spellsKnown: getSpellsKnown(tempCharacter, classData, undefined),
```

## Logic Flow

### **Priority Order**
1. **Stored Database Value**: If `storedValue` is provided and not null/undefined, use it
2. **Dynamic Calculation**: If no stored value, calculate based on class logic
3. **Class Table Value**: For non-Artificer classes, use class table values
4. **Default**: Return 0 if no other logic applies

### **Artificer-Specific Logic**
```typescript
// If there's a stored value (from database), use it
if (storedValue !== undefined && storedValue !== null) {
  return storedValue
}

// For Artificers, use the dynamic calculation
if (character.class.toLowerCase() === "artificer") {
  return calculateArtificerSpellsKnown(character)
}
```

## Test Scenarios

### **Scenario 1: Manual Override**
- **Database Value**: 7
- **Expected Result**: 7
- **Logic**: Use stored value, ignore calculation

### **Scenario 2: Dynamic Calculation**
- **Database Value**: NULL or 0
- **Intelligence**: 16 (+3 modifier)
- **Level**: 3
- **Expected Result**: 3 + 1 = 4
- **Logic**: Intelligence modifier + half level

### **Scenario 3: Minimum Value**
- **Database Value**: NULL or 0
- **Intelligence**: 12 (+1 modifier)
- **Level**: 1
- **Expected Result**: 1 (minimum)
- **Logic**: Math.max(1, calculation)

## Edge Cases

### **Edge Case 1: storedValue = 0**
- **Expected**: Use 0 (not calculate)
- **Logic**: 0 is a valid stored value

### **Edge Case 2: storedValue = null**
- **Expected**: Calculate dynamically
- **Logic**: null means no stored value

### **Edge Case 3: storedValue = undefined**
- **Expected**: Calculate dynamically
- **Logic**: undefined means no stored value

## Benefits

### **User Control**
1. **Manual Override**: Users can set custom spells known values
2. **Flexibility**: Allows for house rules or special circumstances
3. **Data Integrity**: Respects user-entered data

### **System Reliability**
1. **Fallback Logic**: Still calculates automatically when no manual value
2. **Consistency**: All classes follow the same priority logic
3. **Backward Compatibility**: Existing characters work without issues

### **D&D Compliance**
1. **Official Rules**: Still follows D&D 5e Artificer rules by default
2. **Customization**: Allows for rule variations when needed
3. **Accuracy**: Maintains correct calculations for new characters

## Implementation Details

### **Function Parameters**
- **character**: CharacterData object with class and ability scores
- **classData**: Class data from database (optional)
- **storedValue**: Manually set value from database (optional)

### **Return Logic**
1. Check if `storedValue` exists and is not null/undefined
2. If yes, return `storedValue`
3. If no, proceed with class-specific logic
4. For Artificers, use dynamic calculation
5. For other classes, use class table values

### **Database Integration**
- **Character Loading**: Passes stored value from database
- **Character Creation**: Passes undefined for new characters
- **Fallback**: Uses calculation if no stored value

## Testing

### **Verification Script**
Run `26-test-artificer-spells-known-fix.sql` to verify:
- Function respects stored database values
- Dynamic calculation works when no stored value
- Edge cases are handled correctly
- All class types work properly

### **Manual Testing**
1. Set `spells_known` to 7 in database for Artificer character
2. Load character → Should show 7 spells known
3. Set `spells_known` to NULL in database
4. Load character → Should show calculated value
5. Create new Artificer character → Should show calculated value

## Files Modified

1. **`lib/character-data.ts`**: Updated `getSpellsKnown` function signature and logic
2. **`lib/database.ts`**: Updated database loading to pass stored values
3. **`app/page.tsx`**: Updated character creation to pass undefined for new characters
4. **`26-test-artificer-spells-known-fix.sql`**: Test script for verification
5. **`README-artificer-spells-known-fix.md`**: This documentation

## Summary

The fix ensures that Artificer characters respect manually set `spells_known` values in the database while maintaining the automatic calculation for new characters or when no manual value is set. This provides users with the flexibility to customize their character's spells known while preserving the D&D 5e compliant automatic calculation as the default behavior.
