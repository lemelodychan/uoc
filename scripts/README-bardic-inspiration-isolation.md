# Bardic Inspiration and Song of Rest Isolation

This document outlines the multiple layers of protection implemented to ensure that Bardic Inspiration and Song of Rest features are only available to Bard characters and never appear for other classes.

## Protection Layers

### 1. Database Level Protection
- **Location**: `scripts/01-create-classes-table.sql`
- **Implementation**: Non-Bard classes have `ARRAY[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]` for `bardic_inspiration_uses`
- **Example**: Wizard class has zero bardic inspiration uses at all levels
- **Verification**: Run `scripts/11-verify-bardic-inspiration-isolation.sql`

### 2. Function Level Protection - Bardic Inspiration
- **Location**: `lib/spell-slot-calculator.ts` - `getBardicInspirationFromClass()`
- **Implementation**: 
  ```typescript
  if (classData.name.toLowerCase() !== "bard") {
    return null
  }
  ```
- **Additional Safeguard**: Returns `null` if `uses === 0` (even for Bard)

### 3. Function Level Protection - Song of Rest
- **Location**: `lib/class-utils.ts` - `getSongOfRestData()`
- **Implementation**:
  ```typescript
  if (classData.name.toLowerCase() !== "bard") return null
  ```
- **Additional Features**: Properly calculates healing die based on level (d6 → d8 → d10 → d12)

### 4. Database Loading Protection
- **Location**: `lib/database.ts` - `loadClassFeatures()`
- **Implementation**: Filters out Bard-specific features for non-Bard classes:
  ```typescript
  const filteredFeatures = isBard ? features : features.filter(feature => 
    !feature.name.toLowerCase().includes("bardic inspiration") && 
    !feature.name.toLowerCase().includes("song of rest")
  )
  ```

### 5. UI Level Protection
- **Location**: `app/page.tsx` (lines 1143 and 1177)
- **Implementation**: 
  ```typescript
  {activeCharacter.class.toLowerCase() === "bard" && activeCharacter.spellData.bardicInspirationSlot && (
    // Bardic Inspiration UI
  )}
  
  {activeCharacter.class.toLowerCase() === "bard" && activeCharacter.spellData.songOfRest && (
    // Song of Rest UI
  )}
  ```

## Testing

### Quick Verification
Run these SQL scripts to verify the implementation:

1. **Basic Check**: `scripts/11-verify-bardic-inspiration-isolation.sql`
2. **Comprehensive Test**: `scripts/12-comprehensive-bardic-isolation-test.sql`

### Manual Testing
1. Create a Wizard character
2. Verify that no Bardic Inspiration or Song of Rest appears in the UI
3. Create a Bard character
4. Verify that Bardic Inspiration and Song of Rest appear correctly

## Edge Cases Handled

1. **Invalid Class Data**: Functions return `null` if class data is missing
2. **Level 0 Characters**: Functions check for valid level ranges (1-20)
3. **Data Inconsistencies**: Multiple layers ensure protection even if one layer fails
4. **Case Sensitivity**: All checks use `.toLowerCase()` for consistency
5. **Missing Features**: UI checks for feature existence before rendering

## Benefits

- **Defense in Depth**: Multiple layers of protection ensure robustness
- **Performance**: Early returns prevent unnecessary processing
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add similar protections for other class-specific features

## Future Considerations

When adding new classes with unique features (e.g., Rage for Barbarians, Wild Shape for Druids), follow the same pattern:

1. Add class-specific data to the database with zero values for other classes
2. Create functions that check class name before returning feature data
3. Add UI-level checks before rendering class-specific features
4. Create test scripts to verify isolation
