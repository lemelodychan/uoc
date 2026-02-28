# UoC — Codebase Rundown

A practical guide to how the app is built and how D&D mechanics are implemented.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, React 18, TypeScript) |
| UI | shadcn/ui + Tailwind CSS |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (email / OAuth) |
| Icons | Iconify |

### Directory map

```
app/                  Next.js pages + API routes (/api/spells, /api/users, etc.)
components/
  character-sheet/    Read-only display panels (Skills, CombatStats, Spellcasting…)
  edit-modals/        Every edit dialog (one modal per concern)
  ui/                 Reusable primitives (Badge, Card, PassiveBonusesEditor…)
lib/                  Pure business logic — calculations, DB calls, feature utils
hooks/                Custom React hooks
scripts/              Numbered SQL migrations (83 so far)
```

---

## Database tables

| Table | Purpose |
|-------|---------|
| `characters` | Main character data (JSONB for complex fields) |
| `classes` | Class library — spell slot arrays, hit die, caster type |
| `class_features` | Feature library — per-level features with type + passive_bonuses JSONB |
| `feats` | Feat library — name, description, passive_bonuses, prerequisites |
| `races` | Race library — features array with passive_bonuses |
| `backgrounds` | Background library — background_feature JSONB |
| `spells` | Shared spell library |
| `spell_classes` | M2M join: spells ↔ classes |
| `campaigns` | Campaign config, DM id, session scheduling |
| `user_profiles` | Display names + permission levels |

### Key `characters` columns

- Ability scores are plain integers (`strength`, `dexterity`, …)
- Multiclass: `classes` JSONB array `[{name, level, class_id, subclass}]`; the `class_name` + `level` columns are kept for backward compat
- Feature tracking: `class_features_skills_usage` JSONB (the unified usage object)
- Defence fields added in script 79: `darkvision`, `damage_resistances`, `damage_immunities`, `condition_immunities`, `innate_spells`, `armor`
- Spell slot usage: `spell_slots_1_used` … `spell_slots_9_used` (integers, reset on long rest)

---

## Core data model (`lib/character-data.ts`)

`CharacterData` is the central runtime interface. Everything you see on the sheet lives here.

```
id, name, race, background, alignment, visibility, userId
class / subclass / level         ← legacy single-class fields (kept for compat)
classes[]                        ← primary multiclass array
  └─ classData {}                ← loaded from `classes` table (spellcasting_ability, hit_die…)

// Ability scores
strength, dexterity, constitution, intelligence, wisdom, charisma

// Combat
armorClass, initiative, speed, currentHitPoints, maxHitPoints, temporaryHitPoints
deathSaves { successes, failures }
exhaustion
hitDice / hitDiceByClass[]

// Proficiencies
skills[]                         ← {name, ability, proficiency: "none"|"proficient"|"expertise"}
savingThrowProficiencies[]
toolsProficiencies[]
equipmentProficiencies {}        ← boolean flags per armor/weapon category

// Features & feats
classFeatures[]                  ← loaded from DB, read-only display
classFeatureSkillsUsage {}       ← usage tracking (slots, points, selections…)
features[]                       ← free-form features with optional usage tracking
feats[]                          ← {name, description, passiveBonuses?, choices?}

// Spellcasting
spellData { spellAttackBonus, spellSaveDC, spellSlots[], featSpellSlots[], spells[], … }
innateSpells[]                   ← from race / feat / class, tracked separately
spellSlotsUsed { 1..9 }

// Defences & senses
darkvision?, damageVulnerabilities?, damageResistances?, damageImmunities?
conditionImmunities?
armor[]                          ← ArmorItem list, only equipped=true items affect AC

// Background / race bonus data
backgroundData { background_feature { name, description, passive_bonuses } }
racesData[]     { id, features[] }  ← populated on character load
```

---

## Stat calculations

All calculation functions live in `lib/character-data.ts`.

### Ability modifier
```
floor((score - 10) / 2)
```
STR 16 → +3, WIS 8 → −1.

### Proficiency bonus
```
level 1–4  → +2
level 5–8  → +3
level 9–12 → +4
level 13–16 → +5
level 17–20 → +6
```

### Skill bonus
```
ability_modifier
+ proficiency_bonus × multiplier   (0 = none, 1 = proficient, 2 = expertise)
+ passive bonus from features       (e.g. Jack of All Trades adds ½ prof to non-proficient skills)
+ manual modifier (tool proficiencies only)
```

`checkPassiveBonusFromFeatures(character, bonusKey)` checks four sources in order:
1. `classFeatureSkillsUsage` entries (class features like Jack of All Trades)
2. `feats[].passiveBonuses` (e.g. a feat granting half-prof to certain skills)
3. `backgroundData.background_feature.passive_bonuses`
4. `racesData[].features[].passive_bonuses`

### Armor Class

`calculateArmorClass(character)` works in three stages:

1. **Equipped armor** — for each `armor[]` item where `equipped = true`:
   - Light: `baseAC + DEX mod`
   - Medium: `baseAC + min(DEX mod, dexCap)` (usually 2)
   - Heavy: `baseAC` (no DEX)
   - Shield: adds flat `baseAC` (usually +2) on top of any armor
   - Magic: `+ magicBonus`

2. **Unarmored defense** — if no body armor equipped, class features can override the base 10:
   - Barbarian: `10 + DEX + CON`
   - Monk: `10 + DEX + WIS`
   These are stored as `passive_bonuses.ac_calculation` formulas on the class feature, evaluated at runtime.

3. **Winner** — the highest valid AC across all options is used.

**Example:** A level 5 Barbarian (DEX 14, CON 16) wearing no armor gets AC = 10 + 2 + 3 = **15**. Equipping a shield adds another +2 for **17**.

### Spell save DC & attack bonus
```
Spell save DC      = 8 + proficiency_bonus + spellcasting_ability_modifier
Spell attack bonus =     proficiency_bonus + spellcasting_ability_modifier
```
For multiclass characters, the highest spellcasting ability modifier across all caster classes is used.

### Passive Perception / Insight
```
10 + wisdom_modifier + proficiency_bonus (if proficient in Perception/Insight)
   + half_proficiency_bonus (if Jack of All Trades and not proficient)
```

### Initiative
```
dexterity_modifier
(no proficiency bonus unless a feat grants it — e.g. Alert would be handled via passive_bonuses)
```

---

## Spell slot system

### Single-class

Spell slots come from the `classes` table: each class has nine columns (`spell_slots_1` … `spell_slots_9`), each a 20-element array. Index into the array with `level - 1`.

Example — Wizard level 5: `spell_slots_1[4]` = 4 slots, `spell_slots_3[4]` = 2 slots.

`lib/spell-slot-calculator.ts` fetches the class row, extracts the arrays, and returns `SpellSlot[]`.

### Multiclass spell slots

Multiclass caster levels are combined using the standard PHB table:
- Full casters (Bard, Cleric, Druid, Sorcerer, Wizard, Artificer) contribute full levels
- Half casters (Paladin, Ranger) contribute half
- Third casters (Arcane Trickster, Eldritch Knight) contribute a third

Combined level is looked up in a combined-caster table to get the final slot array.

### Pact Magic (Warlock)

Warlock slots are kept separate (`isWarlockSlot: true`) and replenish on short rest, not long rest. The slot count and level come from the Warlock class entry (`slots_replenish_on: 'short_rest'`).

### Feat spell slots

Spells from feats (Fey Touched, Shadow Touched, etc.) are tracked separately as `featSpellSlots[]` on `spellData`:
```
{ spellName: "Misty Step", featName: "Fey Touched", usesPerLongRest: 1, currentUses: 1 }
```
These display in the Spellcasting card with their own dot toggles.

### Innate spells

Spells from races or class features that don't use spell slots:
```
{ id, name, level, usesPerDay: 3 | 'at_will', currentUses, castingAbility, sourceName, resetOn }
```
`resetOn: 'long_rest'` (default) or `'short_rest'`. The long rest handler resets `currentUses = usesPerDay` for all non-short-rest innate spells.

---

## Class feature system

### The unified usage object

`classFeatureSkillsUsage` is a record keyed by feature ID. Each entry can hold different shapes depending on the feature type:

| Feature type | Fields used | Example |
|---|---|---|
| `slots` | `currentUses`, `maxUses` | Bardic Inspiration |
| `points_pool` | `currentPoints`, `maxPoints` | Ki Points, Sorcery Points |
| `options_list` | `selectedOptions[]`, `maxSelections` | Eldritch Invocations |
| `special_ux` | `customState {}` | Eldritch Cannon |
| `availability_toggle` | `isAvailable` | Song of Rest |
| `skill_modifier` | *(passive, no tracking)* | Jack of All Trades |

### Formula evaluation

`calculateUsesFromFormula(formula, character)` in `lib/class-feature-templates.ts` replaces tokens and evaluates:

- `charisma_modifier` → `floor((CHA - 10) / 2)`
- `proficiency_bonus` → level-based value
- `level` → character total level
- `half_level` → `floor(level / 2)`

Example — Lay on Hands max pool: `"level * 5"` at level 6 = **30 HP**.

Example — Bardic Inspiration uses: `"charisma_modifier"` with CHA 18 = **4 uses**.

### Passive bonuses on features

Some features just affect calculations without tracking usage. These are stored as `passive_bonuses` JSONB on the `class_features` row:

```json
{
  "ac_calculation": {
    "formula": "10 + dexterity_modifier + wisdom_modifier",
    "condition": "no_armor"
  }
}
```

```json
{
  "skill_bonus": {
    "type": "half_proficiency",
    "target": "all_non_proficient"
  }
}
```

---

## Race / background / feat bonus pipeline

When a character loads, passive bonuses are aggregated from all four sources by `getPassiveBonuses()` and fed into the calculation functions. Nothing is hardcoded — a Barbarian gets Unarmored Defense because their class feature has an `ac_calculation` passive bonus, not because of an `if (class === "Barbarian")` check.

**Race application flow:**

1. `raceIds[]` stores up to two race IDs (supports Half-races)
2. On load, `loadRaceFeatures()` fetches race rows and stores in `racesData[]`
3. `applyRaceModifications()` copies racial traits into the character:
   - Darkvision range → `character.darkvision`
   - Damage resistances/immunities → arrays
   - Languages → `character.languages`
   - Innate spells → merged into `character.innateSpells[]`
4. If the race changes, `revertRaceModifications()` undoes all of the above before re-applying

**Equipment proficiency flow:**

Class and background each have an `equipment_proficiencies` object. On character creation (and level-up), `applyClassProficiencies()` and `applyBackgroundProficiencies()` merge their boolean flags into the single `character.equipmentProficiencies` map.

---

## State management (`app/page.tsx`)

The entire app state lives in one large component. Key patterns:

### `updateCharacter(updates)`
Merges partial updates into the active character in the `characters[]` array, recalculates derived stats (AC, spell slots if class changed), and schedules an auto-save.

### `triggerAutoSave()`
Debounced 500 ms. Calls `patchCharacter(id, data)` which does a `PATCH` to the DB. UI shows a saving indicator.

### Long rest
`handleLongRest()` does all of the following in one shot:
- Resets `currentHitPoints` to max
- Resets all spell slot usage to 0
- Resets `classFeatureSkillsUsage` entries that replenish on long rest
- Resets `featSpellSlots[].currentUses` to `usesPerLongRest`
- Resets innate spells with `resetOn !== 'short_rest'`
- Resets hit dice used (half, rounded down, per PHB)
- Broadcasts a Supabase Realtime event so all party members update simultaneously

### Modal pattern
Each editable section has a `[sectionModalOpen, setSectionModalOpen]` state and a handler like `handleArmorUpdate(updates)`. Modals receive `character` (read) + `onSave(updates)` (write). No modal touches the DB directly — they all go through `updateCharacter`.

---

## Auth & permissions

| Role | Can do |
|------|--------|
| `viewer` | Read public characters and campaign members |
| `editor` | Own/edit their characters, create campaigns |
| `superadmin` | Edit all characters, manage users, access admin pages |

**DM override:** A campaign's `dungeonMasterId` can edit any character in that campaign, even private ones. Checked via `canEditCharacterWithCampaign()`.

**RLS:** Supabase Row Level Security enforces visibility at the DB layer — private characters are never returned for users who don't own them (superadmin bypass is handled server-side).

---

## Admin pages

### `/feat-editor-page`
Superadmin only. Edit feat `passive_bonuses` (AC formulas, skill bonus type) and `prerequisites` (min level, ability score minimums, spellcasting requirement). Changes persist to the `feats` table and affect all characters who have that feat.

### `/background-editor-page`
Edit background features — name, description, and `passive_bonuses`. Used to fill in PHB background features (script 82 pre-populated the standard ones).

---

## Key design decisions

**Data-driven over hardcoded**
Class features, spell slots, passive bonuses, and equipment proficiencies all come from the database. Adding a new class doesn't require a code change — you add rows to `classes` and `class_features`.

**JSONB for evolution**
Complex fields (`classFeatureSkillsUsage`, `backgroundData`, `passive_bonuses`, `armor`) are stored as JSONB. This allows adding new sub-fields without a migration, and defaults gracefully to empty when absent.

**Multiclass-first**
`classes[]` is the truth. The legacy `class` string and `level` integer are kept populated for backward compat (older code paths read them) but all new logic reads `classes[]`.

**Formula evaluation**
Instead of hardcoding `CHA mod` for Bardic Inspiration and `level × 5` for Lay on Hands, the feature's `class_features_skills.formula` field holds the expression string. The evaluator runs at render time so no migration is needed when rules change.

**Passive calculation aggregation**
AC, skill bonuses, and tool bonuses don't know about specific class names. They ask "does any passive bonus in feats/backgrounds/races/class features affect this stat?" and aggregate the answers. This means a feat, a race feature, and a class feature can all contribute to the same stat without touching the calculation code.
