# Artificer Spells Known Preservation Fix

This document outlines the fix for Artificer spells known being overwritten during auto-save operations.

## Problem Description

### **Issue**
When users manually set the `spells_known` value in the database for Artificer characters, the system was overwriting the manual value with calculated values during auto-save operations.

### **Root Cause**
The `updateSpellSlotsFromClass` function was calling `getSpellsKnownFromClass` which overwrote the manual value with the calculated value, and then auto-save would save the calculated value back to the database.

### **Expected Behavior**
- If a user manually sets `spells_known` to 7 in the database, the character should maintain 7 spells known
- The value should not be overwritten by auto-save operations
- Only new characters or characters without manual values should get calculated values

## Solution Implementation

### **1. Updated Database Loading Logic**
**File**: `lib/database.ts`

#### **Before Fix**
```typescript
spellsKnown: getSpellsKnown(tempCharacter, classData, data.spells_known),
```

#### **After Fix**
```typescript
spellsKnown: data.spells_known !== null && data.spells_known !== undefined ? data.spells_known : getSpellsKnown(tempCharacter, classData, undefined),
```

**Logic**: If there's a stored value in the database (not null/undefined), use it. Otherwise, calculate dynamically.

### **2. Updated updateSpellSlotsFromClass Function**
**File**: `app/page.tsx`

#### **Before Fix**
```typescript
const updatedSpellData = {
  ...currentCharacter.spellData,
  spellSlots: updatedSpellSlots,
  cantripsKnown: getCantripsKnownFromClass(classData, currentCharacter.level),
  spellsKnown: getSpellsKnownFromClass(classData, currentCharacter.level), // This overwrote manual values!
  bardicInspirationSlot: updatedBardicInspiration,
  songOfRest: newSongOfRest,
}
```

#### **After Fix**
```typescript
const updatedSpellData = {
  ...currentCharacter.spellData,
  spellSlots: updatedSpellSlots,
  cantripsKnown: getCantripsKnownFromClass(classData, currentCharacter.level),
  // Don't update spells known here - it's handled by loading logic to preserve manual overrides
  spellsKnown: currentCharacter.spellData.spellsKnown,
  bardicInspirationSlot: updatedBardicInspiration,
  songOfRest: newSongOfRest,
}
```

**Logic**: Preserve the current `spellsKnown` value instead of recalculating it.

## Logic Flow

### **Character Loading Process**
1. **Load from Database**: Get `spells_known` value from database
2. **Check for Manual Override**: If value is not null/undefined, use it
3. **Calculate if Needed**: If no stored value, calculate dynamically
4. **Set Character Object**: Character object gets the preserved or calculated value

### **updateSpellSlotsFromClass Process**
1. **Load Character**: Get current character from state
2. **Update Spell Slots**: Calculate and update spell slots
3. **Preserve Spells Known**: Keep existing `spellsKnown` value
4. **Update Character**: Update character with preserved value

### **Auto-Save Process**
1. **Trigger Auto-Save**: When character is modified
2. **Save to Database**: Save current character state
3. **Preserve Values**: Manual overrides are maintained

## Test Scenarios

### **Scenario 1: Manual Override Preserved**
- **Database Value**: 7 (manual override)
- **Character Load**: 7 (preserved)
- **updateSpellSlotsFromClass**: 7 (preserved)
- **Auto-Save**: 7 (saved to database)
- **Result**: Manual override maintained ✅

### **Scenario 2: New Character Calculation**
- **Database Value**: NULL (no manual value)
- **Character Load**: Calculated (e.g., 4)
- **updateSpellSlotsFromClass**: 4 (preserved)
- **Auto-Save**: 4 (saved to database)
- **Result**: Calculated value maintained ✅

### **Scenario 3: Zero Value Preserved**
- **Database Value**: 0 (manual override)
- **Character Load**: 0 (preserved)
- **updateSpellSlotsFromClass**: 0 (preserved)
- **Auto-Save**: 0 (saved to database)
- **Result**: Zero value maintained ✅

## Edge Cases

### **Edge Case 1: NULL Value**
- **Database Value**: NULL
- **Loading Logic**: Use calculation
- **Result**: Calculated value used

### **Edge Case 2: Undefined Value**
- **Database Value**: undefined
- **Loading Logic**: Use calculation
- **Result**: Calculated value used

### **Edge Case 3: Zero Value**
- **Database Value**: 0
- **Loading Logic**: Use 0 (valid value)
- **Result**: 0 preserved

## Benefits

### **User Control**
1. **Manual Override**: Users can set custom spells known values
2. **Persistence**: Manual values are preserved across sessions
3. **Flexibility**: Allows for house rules or special circumstances

### **System Reliability**
1. **No Data Loss**: Manual overrides are never lost
2. **Consistent Behavior**: Values remain stable during auto-save
3. **Backward Compatibility**: Existing characters work without issues

### **D&D Compliance**
1. **Default Behavior**: New characters still get proper calculations
2. **Rule Variations**: Allows for custom rules when needed
3. **Accuracy**: Maintains correct calculations for new characters

## Implementation Details

### **Database Loading Logic**
```typescript
// Check if there's a stored value (not null/undefined)
if (data.spells_known !== null && data.spells_known !== undefined) {
  // Use stored value (manual override)
  spellsKnown: data.spells_known
} else {
  // Calculate dynamically (new character or no manual value)
  spellsKnown: getSpellsKnown(tempCharacter, classData, undefined)
}
```

### **updateSpellSlotsFromClass Logic**
```typescript
// Preserve current spellsKnown value instead of recalculating
spellsKnown: currentCharacter.spellData.spellsKnown
```

### **Auto-Save Integration**
- **Trigger**: When character is modified
- **Preservation**: Manual values are maintained
- **Database**: Stored values are preserved

## Testing

### **Verification Script**
Run `27-test-artificer-spells-known-preservation.sql` to verify:
- Manual overrides are preserved during loading
- updateSpellSlotsFromClass doesn't overwrite manual values
- Auto-save maintains manual overrides
- Edge cases are handled correctly

### **Manual Testing**
1. Set `spells_known` to 7 in database for Artificer character
2. Load character → Should show 7 spells known
3. Trigger auto-save → Should maintain 7 spells known
4. Refresh page → Should still show 7 spells known
5. Check database → Should still have 7 in spells_known column

## Files Modified

1. **`lib/database.ts`**: Updated loading logic to preserve stored values
2. **`app/page.tsx`**: Updated `updateSpellSlotsFromClass` to preserve `spellsKnown`
3. **`27-test-artificer-spells-known-preservation.sql`**: Test script for verification
4. **`README-artificer-spells-known-preservation.md`**: This documentation

## Summary

The fix ensures that Artificer characters preserve manually set `spells_known` values throughout the entire application lifecycle:

1. **Loading**: Preserves manual values from database
2. **Processing**: Doesn't overwrite manual values during spell slot updates
3. **Saving**: Maintains manual values during auto-save operations

This provides users with the flexibility to customize their character's spells known while preserving the automatic calculation for new characters or when no manual value is set.
