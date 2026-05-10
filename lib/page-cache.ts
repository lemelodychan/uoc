/**
 * Page-level data cache for seamless navigation.
 * Session-scoped: data is loaded once per hard refresh, never re-fetched during navigation.
 * Per-character full data is loaded on first visit to that character, then cached.
 */

import type { Campaign, CharacterData } from "@/lib/character-data"
import type { CampaignResource, CampaignLink } from "@/lib/database"

interface CampaignPageData {
  characters: CharacterData[]
  users: any[]
  resources: CampaignResource[]
  links: CampaignLink[]
}

class PageCache {
  private campaignsCache: Campaign[] | null = null
  private campaignPageCache: Map<string, CampaignPageData> = new Map()
  private allCharactersCache: CharacterData[] | null = null
  private usersCache: any[] | null = null
  // Tracks which character IDs have had full data loaded via loadCharacter()
  private fullyLoadedCharacterIds: Set<string> = new Set()

  // --- Fully loaded character tracking ---

  isCharacterFullyLoaded(characterId: string): boolean {
    return this.fullyLoadedCharacterIds.has(characterId)
  }

  markCharacterFullyLoaded(characterId: string): void {
    this.fullyLoadedCharacterIds.add(characterId)
  }

  // --- Campaigns list ---

  getCampaigns(): Campaign[] | null {
    return this.campaignsCache
  }

  setCampaigns(campaigns: Campaign[]): void {
    this.campaignsCache = campaigns
  }

  hasCampaigns(): boolean {
    return this.campaignsCache !== null
  }

  // --- Per-campaign page data ---

  getCampaignPage(campaignId: string): CampaignPageData | null {
    return this.campaignPageCache.get(campaignId) ?? null
  }

  setCampaignPage(campaignId: string, data: CampaignPageData): void {
    this.campaignPageCache.set(campaignId, data)
  }

  hasCampaignPage(campaignId: string): boolean {
    return this.campaignPageCache.has(campaignId)
  }

  invalidateCampaignPage(campaignId: string): void {
    this.campaignPageCache.delete(campaignId)
  }

  // --- All characters (used by CharacterSheetContent) ---

  getAllCharacters(): CharacterData[] | null {
    return this.allCharactersCache
  }

  setAllCharacters(characters: CharacterData[]): void {
    // Clear the fully-loaded flag for any characters being stored with minimal data
    // (skills array empty = minimal record from progressive load).
    // This prevents loadActiveCharacterIfNeeded from skipping a re-fetch after the
    // full data has been evicted by a campaign or settings page reload.
    for (const char of characters) {
      if (!char.skills || char.skills.length === 0) {
        this.fullyLoadedCharacterIds.delete(char.id)
      }
    }
    this.allCharactersCache = characters
  }

  hasAllCharacters(): boolean {
    return this.allCharactersCache !== null
  }

  // --- Users list ---

  getUsers(): any[] | null {
    return this.usersCache
  }

  setUsers(users: any[]): void {
    this.usersCache = users
  }

  clear(): void {
    this.campaignsCache = null
    this.campaignPageCache.clear()
    this.allCharactersCache = null
    this.usersCache = null
    this.fullyLoadedCharacterIds.clear()
  }
}

export const pageCache = new PageCache()
