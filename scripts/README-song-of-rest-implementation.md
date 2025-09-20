# Song of Rest Implementation

This document outlines the implementation of Song of Rest display under the Bardic Inspiration section for Bard characters.

## Implementation Overview

### 1. **Database Integration**
- **Location**: `lib/database.ts`
- **Changes**: Updated `loadCharacter()` and `loadAllCharacters()` to include `songOfRest: undefined` in spell data
- **Purpose**: Ensures Song of Rest is properly initialized when loading characters from database

### 2. **Class Data Population**
- **Location**: `app/page.tsx` - `updateSpellSlotsFromClass()` function
- **Changes**: Added `getSongOfRestData()` call and included `songOfRest` in updated spell data
- **Purpose**: Populates Song of Rest data based on character level and class

### 3. **UI Display**
- **Location**: `app/page.tsx` - Spells section
- **Changes**: 
  - Moved Song of Rest under Bardic Inspiration section
  - Combined both features under single "Bardic Inspiration" header
  - Added clickable functionality with hover effects
- **Purpose**: Provides intuitive display and interaction for Bard features

### 4. **Functionality**
- **Location**: `app/page.tsx` - `toggleSongOfRest()` function
- **Changes**: Added function to toggle Song of Rest availability
- **Purpose**: Allows players to mark Song of Rest as used/available

## Features

### **Display Rules**
1. **Class Restriction**: Only appears for Bard characters
2. **Level Requirement**: Available starting at level 2
3. **Healing Die Progression**:
   - Level 2-8: 1d6 healing
   - Level 9-12: 1d8 healing  
   - Level 13-16: 1d10 healing
   - Level 17-20: 1d12 healing

### **UI Behavior**
- **Location**: Under Bardic Inspiration section in spells
- **Interaction**: Click to toggle between "Available" and "Used"
- **Visual**: Hover effects and clear status badges
- **Layout**: Integrated with Bardic Inspiration for cohesive Bard feature display

## Code Changes

### **Files Modified**
1. `app/page.tsx`
   - Added `getSongOfRestData` import
   - Updated `updateSpellSlotsFromClass()` to populate Song of Rest
   - Added `toggleSongOfRest()` function
   - Modified UI to display Song of Rest under Bardic Inspiration

2. `lib/database.ts`
   - Updated `loadCharacter()` to include `songOfRest: undefined`
   - Updated `loadAllCharacters()` to include `songOfRest: undefined`

### **Functions Added**
- `toggleSongOfRest()`: Toggles Song of Rest availability status

### **Functions Enhanced**
- `updateSpellSlotsFromClass()`: Now populates Song of Rest data
- `loadCharacter()`: Now initializes Song of Rest field
- `loadAllCharacters()`: Now initializes Song of Rest field

## Testing

### **Verification Script**
- **File**: `scripts/13-test-song-of-rest-display.sql`
- **Purpose**: Tests database configuration and feature availability
- **Coverage**: Level-based availability, class restrictions, feature descriptions

### **Manual Testing**
1. Create a Bard character
2. Verify Song of Rest appears under Bardic Inspiration at level 2+
3. Test click functionality to toggle Available/Used
4. Verify healing die progression at different levels
5. Confirm non-Bard characters don't see Song of Rest

## Benefits

1. **Intuitive Organization**: Bard features grouped together
2. **Level-Appropriate Display**: Healing die scales with character level
3. **Interactive**: Players can track usage
4. **Consistent**: Follows same patterns as other spell features
5. **Isolated**: Only appears for appropriate classes

## Future Enhancements

- Add tooltip with full Song of Rest description
- Consider adding short rest tracking integration
- Add visual indicators for healing die progression
- Consider adding usage tracking per short rest
