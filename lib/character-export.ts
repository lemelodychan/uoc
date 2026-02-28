import type { CharacterData } from "@/lib/character-data"
import {
  calculateModifier,
  calculateProficiencyBonus,
  getTotalLevel,
  calculateSkillBonus,
  calculateSavingThrowBonus,
} from "@/lib/character-data"

const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

export interface CharacterExportSummary {
  basic: {
    name: string
    level: number
    classes: Array<{ name: string; subclass?: string; level: number }>
    race: string
    background: string
    alignment: string
    visibility: string
    isNPC?: boolean
  }
  combat: {
    armorClass: number
    initiative: number
    speed: number
    currentHitPoints: number
    maxHitPoints: number
    temporaryHitPoints?: number
    proficiencyBonus: number
    deathSaves?: { successes: number; failures: number }
    hitDice?: { total: number; used: number; dieType: string }
    hitDiceByClass?: Array<{
      className: string
      dieType: string
      total: number
      used: number
    }>
  }
  abilities: Record<
    string,
    { score: number; modifier: number }
  >
  savingThrows: Array<{
    ability: string
    proficient: boolean
    modifier: number
  }>
  skills: Array<{
    name: string
    ability: string
    proficiency: string
    modifier: number
  }>
  weapons: Array<{
    name: string
    attackBonus: string
    damageType: string
    properties?: string[]
    ammunition?: string
  }>
  spellcasting: {
    spellSaveDC: number
    spellAttackBonus: number
    cantripsKnown: number
    spellsKnown: number
    spellSlots: Array<{ level: number; total: number; used?: number }>
    cantrips: Array<{ name: string }>
    spells: Array<{ name: string; level: number; prepared: boolean }>
  }
  features: Array<{ name: string; description: string }>
  classFeatures: Array<{
    name: string
    source: string
    className: string
    level: number
    description: string
  }>
  feats: Array<{ name: string; description: string }>
  tools: Array<{ name: string; proficiency: string }>
  languages: string
  equipment: string
  money?: { gold: number; silver: number; copper: number }
  magicItems?: Array<{ name: string; description: string }>
  armor?: Array<{
    name: string
    armorType: string
    baseAC: number
    equipped: boolean
    magicBonus?: number
  }>
  equipmentProficiencies?: Record<string, boolean>
  defenses?: {
    darkvision: number | null
    damageVulnerabilities: string[]
    damageResistances: string[]
    damageImmunities: string[]
    conditionImmunities: string[]
  }
}

function truncateDescription(text: string, maxLen: number = 200): string {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen) + "..."
}

export function buildCharacterExportSummary(
  character: CharacterData
): CharacterExportSummary {
  const totalLevel =
    character.classes?.length > 0
      ? getTotalLevel(character.classes)
      : character.level || 1
  const proficiencyBonus =
    character.proficiencyBonus ?? calculateProficiencyBonus(totalLevel)

  const abilities: CharacterExportSummary["abilities"] = {}
  for (const ab of ABILITIES) {
    const score = character[ab] as number
    abilities[ab] = {
      score: score ?? 10,
      modifier: calculateModifier(score ?? 10),
    }
  }

  const savingThrows: CharacterExportSummary["savingThrows"] = ABILITIES.map(
    (ability) => ({
      ability,
      proficient:
        character.savingThrowProficiencies?.find((st) => st.ability === ability)
          ?.proficient ?? false,
      modifier: calculateSavingThrowBonus(
        character,
        ability,
        proficiencyBonus
      ),
    })
  )

  const skills: CharacterExportSummary["skills"] = (character.skills ?? []).map(
    (skill) => ({
      name: skill.name,
      ability: skill.ability,
      proficiency: skill.proficiency,
      modifier: calculateSkillBonus(character, skill),
    })
  )

  const sd = character.spellData
  const spellSlots = (sd?.spellSlots ?? []).map((slot) => ({
    level: slot.level,
    total: slot.total,
    used: (character.spellSlotsUsed as Record<number, number>)?.[slot.level],
  }))
  const cantrips = (sd?.spells ?? []).filter((s) => s.level === 0)
  const spells = (sd?.spells ?? []).filter((s) => s.level > 0)

  return {
    basic: {
      name: character.name,
      level: totalLevel,
      classes: (character.classes ?? []).map((c) => ({
        name: c.name,
        subclass: c.subclass,
        level: c.level,
      })),
      race: character.race ?? "",
      background: character.background ?? "",
      alignment: character.alignment ?? "",
      visibility: character.visibility ?? "public",
      isNPC: character.isNPC,
    },
    combat: {
      armorClass: character.armorClass ?? 0,
      initiative: character.initiative ?? 0,
      speed: character.speed ?? 0,
      currentHitPoints: character.currentHitPoints ?? 0,
      maxHitPoints: character.maxHitPoints ?? 0,
      temporaryHitPoints: character.temporaryHitPoints,
      proficiencyBonus,
      deathSaves: character.deathSaves,
      hitDice: character.hitDice,
      hitDiceByClass: character.hitDiceByClass,
    },
    abilities,
    savingThrows,
    skills,
    weapons: (character.weapons ?? []).map((w) => ({
      name: w.name,
      attackBonus: w.attackBonus,
      damageType: w.damageType,
      properties: w.weaponProperties,
      ammunition:
        w.maxAmmunition != null
          ? `${w.usedAmmunition ?? 0}/${w.maxAmmunition}`
          : undefined,
    })),
    spellcasting: {
      spellSaveDC: sd?.spellSaveDC ?? 0,
      spellAttackBonus: sd?.spellAttackBonus ?? 0,
      cantripsKnown: sd?.cantripsKnown ?? 0,
      spellsKnown: sd?.spellsKnown ?? 0,
      spellSlots,
      cantrips: cantrips.map((s) => ({ name: s.name })),
      spells: spells.map((s) => ({
        name: s.name,
        level: s.level,
        prepared: s.isPrepared ?? false,
      })),
    },
    features: (character.features ?? []).map((f) => ({
      name: f.name,
      description: truncateDescription(f.description ?? ""),
    })),
    classFeatures: (character.classFeatures ?? []).map((f) => ({
      name: f.name,
      source: f.source ?? "",
      className: f.className ?? "",
      level: f.level ?? 0,
      description: truncateDescription(f.description ?? ""),
    })),
    feats: (character.feats ?? []).map((f) => ({
      name: f.name,
      description: truncateDescription(f.description ?? ""),
    })),
    tools: (character.toolsProficiencies ?? []).map((t) => ({
      name: t.name,
      proficiency: t.proficiency,
    })),
    languages: character.languages ?? "",
    equipment: character.equipment ?? "",
    money: character.money,
    magicItems: character.magicItems?.map((m) => ({
      name: m.name,
      description: truncateDescription(m.description ?? ""),
    })),
    armor: (character.armor ?? []).map(a => ({
      name: a.name,
      armorType: a.armorType,
      baseAC: a.baseAC,
      equipped: a.equipped,
      ...(a.magicBonus ? { magicBonus: a.magicBonus } : {}),
    })),
    equipmentProficiencies: character.equipmentProficiencies,
    defenses: {
      darkvision: character.darkvision ?? null,
      damageVulnerabilities: character.damageVulnerabilities ?? [],
      damageResistances: character.damageResistances ?? [],
      damageImmunities: character.damageImmunities ?? [],
      conditionImmunities: character.conditionImmunities ?? [],
    },
  }
}

export function exportCharacterAsJson(
  character: CharacterData,
  options: { full?: boolean } = {}
): string {
  if (options.full) {
    const payload = {
      ...character,
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(payload, null, 2)
  }
  const summary = buildCharacterExportSummary(character)
  return JSON.stringify(summary, null, 2)
}

function escapeCsvValue(value: string): string {
  if (value == null) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvRow(values: (string | number | boolean | undefined)[]): string {
  return values.map((v) => escapeCsvValue(v != null ? String(v) : "")).join(",")
}

export function exportCharacterAsCsv(character: CharacterData): string {
  const summary = buildCharacterExportSummary(character)
  const lines: string[] = []

  lines.push("# Basic")
  lines.push(
    csvRow([
      "name",
      "level",
      "classes",
      "race",
      "background",
      "alignment",
      "visibility",
      "isNPC",
    ])
  )
  const classesStr = summary.basic.classes
    .map((c) => `${c.name} ${c.subclass ? `(${c.subclass})` : ""} ${c.level}`)
    .join("; ")
  lines.push(
    csvRow([
      summary.basic.name,
      summary.basic.level,
      classesStr,
      summary.basic.race,
      summary.basic.background,
      summary.basic.alignment,
      summary.basic.visibility,
      summary.basic.isNPC ?? false,
    ])
  )
  lines.push("")

  lines.push("# Abilities")
  lines.push(csvRow(["ability", "score", "modifier"]))
  for (const ab of ABILITIES) {
    const a = summary.abilities[ab]
    if (a) lines.push(csvRow([ab, a.score, a.modifier]))
  }
  lines.push("")

  lines.push("# Combat")
  lines.push(
    csvRow([
      "armorClass",
      "initiative",
      "speed",
      "currentHitPoints",
      "maxHitPoints",
      "temporaryHitPoints",
      "proficiencyBonus",
    ])
  )
  lines.push(
    csvRow([
      summary.combat.armorClass,
      summary.combat.initiative,
      summary.combat.speed,
      summary.combat.currentHitPoints,
      summary.combat.maxHitPoints,
      summary.combat.temporaryHitPoints ?? "",
      summary.combat.proficiencyBonus,
    ])
  )
  lines.push("")

  lines.push("# Saving Throws")
  lines.push(csvRow(["ability", "proficient", "modifier"]))
  for (const st of summary.savingThrows) {
    lines.push(csvRow([st.ability, st.proficient, st.modifier]))
  }
  lines.push("")

  lines.push("# Skills")
  lines.push(csvRow(["name", "ability", "proficiency", "modifier"]))
  for (const sk of summary.skills) {
    lines.push(csvRow([sk.name, sk.ability, sk.proficiency, sk.modifier]))
  }
  lines.push("")

  lines.push("# Classes")
  lines.push(csvRow(["name", "subclass", "level"]))
  for (const c of summary.basic.classes) {
    lines.push(csvRow([c.name, c.subclass ?? "", c.level]))
  }
  lines.push("")

  lines.push("# Weapons")
  lines.push(csvRow(["name", "attackBonus", "damageType", "properties", "ammunition"]))
  for (const w of summary.weapons) {
    lines.push(
      csvRow([
        w.name,
        w.attackBonus,
        w.damageType,
        w.properties?.join("; ") ?? "",
        w.ammunition ?? "",
      ])
    )
  }
  lines.push("")

  lines.push("# Spells")
  lines.push(csvRow(["name", "level", "prepared"]))
  for (const s of summary.spellcasting.cantrips) {
    lines.push(csvRow([s.name, 0, true]))
  }
  for (const s of summary.spellcasting.spells) {
    lines.push(csvRow([s.name, s.level, s.prepared]))
  }
  lines.push("")

  lines.push("# Features")
  lines.push(csvRow(["name", "description"]))
  for (const f of summary.features) {
    lines.push(csvRow([f.name, f.description]))
  }
  lines.push("")

  lines.push("# Class Features")
  lines.push(csvRow(["name", "source", "className", "level", "description"]))
  for (const f of summary.classFeatures) {
    lines.push(
      csvRow([f.name, f.source, f.className, f.level, f.description])
    )
  }
  lines.push("")

  lines.push("# Feats")
  lines.push(csvRow(["name", "description"]))
  for (const f of summary.feats) {
    lines.push(csvRow([f.name, f.description]))
  }
  lines.push("")

  lines.push("# Tools")
  lines.push(csvRow(["name", "proficiency"]))
  for (const t of summary.tools) {
    lines.push(csvRow([t.name, t.proficiency]))
  }
  lines.push("")

  lines.push("# Languages")
  lines.push(csvRow(["languages"]))
  lines.push(csvRow([summary.languages]))
  lines.push("")

  lines.push("# Equipment")
  lines.push(csvRow(["equipment"]))
  lines.push(csvRow([summary.equipment]))
  lines.push("")

  if (summary.money) {
    lines.push("# Money")
    lines.push(csvRow(["gold", "silver", "copper"]))
    lines.push(
      csvRow([
        summary.money.gold,
        summary.money.silver,
        summary.money.copper,
      ])
    )
    lines.push("")
  }

  if (summary.armor && summary.armor.length > 0) {
    lines.push("# Armor")
    lines.push(csvRow(["Name", "Type", "Base AC", "Magic Bonus", "Equipped"]))
    for (const a of summary.armor) {
      lines.push(csvRow([a.name, a.armorType, a.baseAC, a.magicBonus ?? "", a.equipped]))
    }
    lines.push("")
  }

  if (summary.defenses) {
    const d = summary.defenses
    const hasAny =
      d.darkvision != null ||
      d.damageVulnerabilities.length > 0 ||
      d.damageResistances.length > 0 ||
      d.damageImmunities.length > 0 ||
      d.conditionImmunities.length > 0
    if (hasAny) {
      lines.push("# Defenses")
      lines.push(
        csvRow(["Darkvision", d.darkvision != null ? `${d.darkvision} ft` : "None"])
      )
      lines.push(
        csvRow(["Damage Vulnerabilities", d.damageVulnerabilities.length > 0 ? d.damageVulnerabilities.join(", ") : "None"])
      )
      lines.push(
        csvRow(["Damage Resistances", d.damageResistances.length > 0 ? d.damageResistances.join(", ") : "None"])
      )
      lines.push(
        csvRow(["Damage Immunities", d.damageImmunities.length > 0 ? d.damageImmunities.join(", ") : "None"])
      )
      lines.push(
        csvRow(["Condition Immunities", d.conditionImmunities.length > 0 ? d.conditionImmunities.join(", ") : "None"])
      )
      lines.push("")
    }
  }

  return lines.join("\r\n")
}

export function sanitizeFilename(name: string): string {
  const safe = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim() || "character"
  return safe.slice(0, 100)
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
