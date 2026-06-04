// Blood Hunter (Order of the Profane Soul) — Otherworldly Patron data.
// Source: https://dnd5e.wikidot.com/blood-hunter:profane-soul (2022 version)
//
// Each patron defines the content of three Profane Soul features:
//   Rite Focus (3rd) · Revealed Arcana (7th) · Unsealed Arcana (15th)

export interface BloodHunterPatron {
  id: string
  name: string
  source: string
  riteFocus: string
  revealedArcana: string
  unsealedArcana: string
}

export const BLOOD_HUNTER_PATRONS: BloodHunterPatron[] = [
  {
    id: "archfey",
    name: "The Archfey",
    source: "PHB",
    riteFocus:
      "When you damage a creature with your rite weapon, it glows with faint light until the end of your next turn, gaining no benefit from half or three-quarters cover or from being invisible.",
    revealedArcana: "Blur",
    unsealedArcana: "Slow",
  },
  {
    id: "celestial",
    name: "The Celestial",
    source: "XGtE",
    riteFocus:
      "As a bonus action, you can expend a use of your Blood Maledict feature to heal a creature you can see within 60 feet of you for one roll of your hemocraft die + your Hemocraft modifier (minimum of +1).",
    revealedArcana: "Lesser Restoration",
    unsealedArcana: "Revivify",
  },
  {
    id: "fathomless",
    name: "The Fathomless",
    source: "TCE",
    riteFocus:
      "You can breathe underwater, and once per turn when you damage a creature with your rite weapon, you can reduce its speed by 10 feet until the start of your next turn.",
    revealedArcana: "Gust of Wind",
    unsealedArcana: "Lightning Bolt",
  },
  {
    id: "fiend",
    name: "The Fiend",
    source: "PHB",
    riteFocus:
      "While using the Rite of the Flame, if you roll a 1 or 2 on your rite damage die, you can reroll the die. You must use the new roll.",
    revealedArcana: "Scorching Ray",
    unsealedArcana: "Fireball",
  },
  {
    id: "genie",
    name: "The Genie",
    source: "TCE",
    riteFocus:
      "As a bonus action, you can expend a use of your Blood Maledict feature to gain a flying speed of 30 feet for a number of rounds equal to your Hemocraft modifier (minimum of 1).",
    revealedArcana: "Phantasmal Force",
    unsealedArcana: "Protection from Energy",
  },
  {
    id: "great-old-one",
    name: "The Great Old One",
    source: "PHB",
    riteFocus:
      "When you score a critical hit against a creature with your rite weapon, that creature and any other creatures of your choice within 10 feet of it are frightened of you until the end of your next turn.",
    revealedArcana: "Detect Thoughts",
    unsealedArcana: "Haste",
  },
  {
    id: "hexblade",
    name: "The Hexblade",
    source: "XGtE",
    riteFocus:
      "Whenever you target a creature with a blood curse, your next attack roll against that creature deals additional damage equal to your proficiency bonus.",
    revealedArcana: "Branding Smite",
    unsealedArcana: "Blink",
  },
  {
    id: "undead",
    name: "The Undead",
    source: "VRGR",
    riteFocus:
      "When you take necrotic damage, you can use your reaction to halve it. In addition, your appearance changes to reflect your patron while you have an active crimson rite.",
    revealedArcana: "Blindness/Deafness",
    unsealedArcana: "Speak with Dead",
  },
  {
    id: "undying",
    name: "The Undying",
    source: "SCAG",
    riteFocus:
      "Whenever you reduce a hostile creature that threatens you to 0 hit points, you regain hit points equal to one roll of your hemocraft die.",
    revealedArcana: "Silence",
    unsealedArcana: "Bestow Curse",
  },
]
