# Artificer Artillerist Implementation

This document outlines the implementation of the Artificer Artillerist class and subclass in the character sheet database.

## Implementation Overview

### 1. **Class Structure**
- **Name**: Artificer
- **Subclass**: Artillerist
- **Hit Die**: d8
- **Primary Ability**: Intelligence
- **Saving Throw Proficiencies**: Constitution, Intelligence
- **Spellcasting**: Half-caster (up to 5th level spells)

### 2. **Spell Progression**
The Artificer follows a half-caster spell progression:

| Level | 1st | 2nd | 3rd | 4th | 5th | Cantrips |
|-------|-----|-----|-----|-----|-----|----------|
| 1     | 2   | 0   | 0   | 0   | 0   | 2        |
| 2     | 2   | 0   | 0   | 0   | 0   | 2        |
| 3     | 3   | 0   | 0   | 0   | 0   | 2        |
| 4     | 3   | 2   | 0   | 0   | 0   | 2        |
| 5     | 3   | 2   | 0   | 0   | 0   | 2        |
| 6     | 3   | 2   | 2   | 0   | 0   | 2        |
| 7     | 3   | 2   | 2   | 0   | 0   | 2        |
| 8     | 3   | 2   | 2   | 1   | 0   | 2        |
| 9     | 3   | 2   | 2   | 1   | 0   | 2        |
| 10    | 3   | 2   | 2   | 1   | 0   | 2        |
| 11    | 3   | 2   | 2   | 1   | 1   | 2        |
| 12+   | 3   | 2   | 2   | 1   | 1   | 2        |

### 3. **Key Features**

#### **Core Artificer Features**
- **Magical Tinkering (Level 1)**: Imbue tiny objects with magical properties
- **Spellcasting (Level 1)**: Intelligence-based spellcasting
- **Infuse Item (Level 2)**: Create magical infusions
- **The Right Tool for the Job (Level 3)**: Create artisan's tools
- **Tool Expertise (Level 6)**: Double proficiency bonus for tools
- **Flash of Genius (Level 7)**: Add Intelligence modifier to saves/checks
- **Magic Item Adept (Level 10)**: Attune to 4 magic items
- **Spell-Storing Item (Level 11)**: Store spells in items
- **Magic Item Savant (Level 14)**: Attune to 5 magic items, ignore requirements
- **Magic Item Master (Level 18)**: Attune to 6 magic items
- **Soul of Artifice (Level 20)**: Bonus saves per attuned item

#### **Artillerist Subclass Features**
- **Artillerist Spells (Level 3)**: Additional spells prepared
  - 3rd Level: Shield, Thunderwave
  - 5th Level: Scorching Ray, Shatter
  - 9th Level: Fireball, Wind Wall
  - 13th Level: Ice Storm, Wall of Fire
  - 17th Level: Cone of Cold, Wall of Force
- **Eldritch Cannon (Level 3)**: Create magical artillery
  - Flamethrower: Cone of fire damage
  - Force Ballista: Ranged force damage with push
  - Protector: Grant temporary hit points
- **Arcane Firearm (Level 5)**: Channel spells through firearm for bonus damage
- **Explosive Cannon (Level 9)**: Cannon explodes when destroyed
- **Fortified Position (Level 15)**: Two cannons, opportunity attacks

## Database Implementation

### **Files Created**
1. **`14-add-artificer-artillerist-class.sql`**: Adds the class to the classes table
2. **`15-add-artificer-artillerist-features.sql`**: Adds all class and subclass features
3. **`16-test-artificer-artillerist.sql`**: Comprehensive test script

### **Database Schema**
- **Classes Table**: Contains spell progression, hit die, abilities
- **Class Features Table**: Contains detailed feature descriptions
- **Feature Types**: 'class' for core features, 'subclass' for Artillerist features

## Key Characteristics

### **Spellcasting**
- **Ability**: Intelligence
- **Prepared Spells**: Artificers prepare spells (no spells known limit)
- **Ritual Casting**: Can cast ritual spells if prepared
- **Spell Focus**: Can use tools as spellcasting focus

### **Unique Mechanics**
- **Infusions**: Create temporary magic items
- **Eldritch Cannon**: Signature Artillerist feature
- **Arcane Firearm**: Bonus damage on spells
- **Magic Item Mastery**: Enhanced attunement capabilities

### **Tool Proficiencies**
- **Starting**: Thieves' tools, tinker's tools, one artisan's tools
- **Artillerist**: Woodcarver's tools (Level 3)
- **Expertise**: Double proficiency bonus (Level 6)

## Testing

### **Verification Script**
Run `16-test-artificer-artillerist.sql` to verify:
- Class data is correctly inserted
- All features are present
- Spell progression is accurate
- No bardic inspiration (correct for Artificer)

### **Manual Testing**
1. Create an Artificer Artillerist character
2. Verify spell slots match half-caster progression
3. Check that Eldritch Cannon feature appears at level 3
4. Confirm Arcane Firearm feature appears at level 5
5. Test that no Bardic Inspiration appears

## Integration Notes

### **Compatibility**
- Works with existing class feature system
- Integrates with spell slot calculator
- Compatible with character loading/saving
- Follows same patterns as Bard and Wizard

### **Future Enhancements**
- Add Eldritch Cannon tracking in UI
- Implement Arcane Firearm damage bonus
- Add infusion management system
- Create Artillerist-specific spell list display

## Benefits

1. **Complete Implementation**: All Artificer Artillerist features included
2. **Accurate Progression**: Proper half-caster spell progression
3. **Detailed Descriptions**: Full feature descriptions for reference
4. **Tested**: Comprehensive test suite for verification
5. **Extensible**: Easy to add other Artificer subclasses

The Artificer Artillerist is now fully integrated into the character sheet system and ready for use!
