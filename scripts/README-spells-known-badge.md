# Spells Known Badge Feature

This document outlines the implementation of the Spells Known Badge feature that displays additional spells from feats and class features.

## Feature Overview

The Spells Known display now shows the base number of spells known plus a badge indicating additional spells from:
- **Feats** (e.g., Fey Touched, Shadow Touched, Magic Initiate)
- **Class Features** (e.g., Artillerist Spells, Alchemist Spells)

## Display Format

The UI now displays spells known as:
- **Base Number** (e.g., "7") - calculated from class and level
- **Badge** (e.g., "+6") - additional spells from feats and class features
- **Combined Display**: "7 +6"

## Implementation

### New Functions Added

#### `getAdditionalSpellsFromFeats(character: CharacterData): number`
Calculates additional spells granted by feats:

| Feat | Additional Spells | Description |
|------|------------------|-------------|
| Fey Touched | +2 | 1st level divination/enchantment + Misty Step |
| Shadow Touched | +2 | 1st level illusion/necromancy + Invisibility |
| Magic Initiate | +2 | 1 cantrip + 1 1st level spell |
| Artificer Initiate | +1 | 1 cantrip + 1 1st level spell |
| Spell Sniper | +1 | 1 cantrip |
| Telekinetic | +1 | Mage Hand cantrip |
| Telepathic | +1 | Detect Thoughts spell |

#### `getAdditionalSpellsFromClassFeatures(character: CharacterData): number`
Calculates additional spells granted by class features:

**Artificer Subclasses:**
- **Artillerist Spells**: +2 at levels 3, 5, 9, 13, 17
- **Alchemist Spells**: +2 at levels 3, 5, 9, 13, 17
- **Armorer Spells**: +2 at levels 3, 5, 9, 13, 17
- **Battle Smith Spells**: +2 at levels 3, 5, 9, 13, 17

#### `getTotalAdditionalSpells(character: CharacterData): number`
Combines spells from feats and class features.

### UI Updates

The spells known display in `app/page.tsx` now shows:
```tsx
<div className="flex items-center justify-center gap-2">
  <div className="text-xl font-bold">{activeCharacter.spellData.spellsKnown}</div>
  {getTotalAdditionalSpells(activeCharacter) > 0 && (
    <Badge variant="secondary" className="text-xs">
      +{getTotalAdditionalSpells(activeCharacter)}
    </Badge>
  )}
</div>
```

## Examples

### Level 7 Artificer Artillerist with Fey Touched
- **Base Spells Known**: 7 (Intelligence modifier + half artificer level)
- **Additional from Feats**: +2 (Fey Touched)
- **Additional from Class Features**: +4 (Artillerist Spells at levels 3 and 5)
- **Total Additional**: +6
- **Display**: "7 +6"

### Level 5 Artificer Artillerist with Shadow Touched
- **Base Spells Known**: 5
- **Additional from Feats**: +2 (Shadow Touched)
- **Additional from Class Features**: +2 (Artillerist Spells at level 3)
- **Total Additional**: +4
- **Display**: "5 +4"

### Level 9 Artificer Artillerist with Magic Initiate
- **Base Spells Known**: 9
- **Additional from Feats**: +2 (Magic Initiate)
- **Additional from Class Features**: +4 (Artillerist Spells at levels 3, 5, 9)
- **Total Additional**: +6
- **Display**: "9 +6"

### Level 3 Artificer Artillerist with no feats
- **Base Spells Known**: 3
- **Additional from Feats**: +0
- **Additional from Class Features**: +2 (Artillerist Spells at level 3)
- **Total Additional**: +2
- **Display**: "3 +2"

## Benefits

1. **Clear Visualization**: Users can easily see their total spell capacity
2. **Source Tracking**: Badge shows additional spells from feats and class features
3. **Accurate Calculations**: Automatically calculates based on character level and features
4. **Extensible**: Easy to add new feats and class features that grant spells
5. **Conditional Display**: Badge only appears when there are additional spells

## Future Enhancements

- Add tooltip showing breakdown of additional spells
- Support for other classes' subclass spells (Bard Colleges, Warlock Patrons, etc.)
- Add more feats that grant spells
- Consider cantrips in the calculation
- Add spell school restrictions for certain feats

## Testing

Use the test script `38-test-spells-known-badge.sql` to verify the functionality with various character configurations.

## Files Modified

- `lib/character-data.ts` - Added calculation functions
- `app/page.tsx` - Updated UI display and imports
- `scripts/38-test-spells-known-badge.sql` - Test script
- `scripts/README-spells-known-badge.md` - This documentation
