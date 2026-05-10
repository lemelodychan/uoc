export function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')      // remove special chars
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')             // trim leading/trailing dashes
}

export function generateCampaignSlug(name: string, sequenceNumber: number): string {
  return `c${sequenceNumber}-${toKebabCase(name)}`
}

export function generateCharacterSlug(name: string, sequenceNumber: number, isNPC: boolean): string {
  const prefix = isNPC ? 'npc' : 'u'
  return `${prefix}${sequenceNumber}-${toKebabCase(name)}`
}

// Resolves a unique slug by appending -2, -3 etc. if the base slug is already taken
export async function resolveUniqueSlug(
  baseSlug: string,
  table: 'campaigns' | 'characters',
  supabase: any
): Promise<string> {
  let slug = baseSlug
  let counter = 2
  while (true) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    slug = `${baseSlug}-${counter++}`
  }
}
