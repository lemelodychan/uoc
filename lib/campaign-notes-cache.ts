import type { CampaignNote } from './database'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface CampaignNotesCache {
  [campaignId: string]: CacheEntry<CampaignNote[]>
}

class CampaignNotesCacheManager {
  private memoryCache: CampaignNotesCache = {}
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly STALE_THRESHOLD = 2 * 60 * 1000 // 2 minutes (consider stale after this)
  private readonly STORAGE_KEY = 'uoc.campaign-notes-cache'

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return
      
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CampaignNotesCache
        const now = Date.now()
        
        // Filter out expired entries
        Object.keys(parsed).forEach(campaignId => {
          if (parsed[campaignId] && parsed[campaignId].expiresAt > now) {
            this.memoryCache[campaignId] = parsed[campaignId]
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load campaign notes cache from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memoryCache))
    } catch (error) {
      console.warn('Failed to save campaign notes cache to storage:', error)
    }
  }

  get(campaignId: string): CampaignNote[] | null {
    const entry = this.memoryCache[campaignId]
    if (!entry) return null

    const now = Date.now()
    if (entry.expiresAt <= now) {
      // Expired, remove from cache
      delete this.memoryCache[campaignId]
      this.saveToStorage()
      return null
    }

    return entry.data
  }

  set(campaignId: string, notes: CampaignNote[]): void {
    const now = Date.now()
    this.memoryCache[campaignId] = {
      data: notes,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    }
    this.saveToStorage()
  }

  isStale(campaignId: string): boolean {
    const entry = this.memoryCache[campaignId]
    if (!entry) return true

    const now = Date.now()
    return entry.timestamp + this.STALE_THRESHOLD <= now
  }

  invalidate(campaignId: string): void {
    delete this.memoryCache[campaignId]
    this.saveToStorage()
  }

  invalidateAll(): void {
    this.memoryCache = {}
    this.saveToStorage()
  }

  // Add a note to the cache without refetching
  addNote(campaignId: string, note: CampaignNote): void {
    const cached = this.get(campaignId)
    if (cached) {
      const updated = [note, ...cached]
      this.set(campaignId, updated)
    }
  }

  // Update a note in the cache without refetching
  updateNote(campaignId: string, noteId: string, updates: Partial<CampaignNote>): void {
    const cached = this.get(campaignId)
    if (cached) {
      const updated = cached.map(note => 
        note.id === noteId ? { ...note, ...updates } : note
      )
      this.set(campaignId, updated)
    }
  }

  // Remove a note from the cache without refetching
  removeNote(campaignId: string, noteId: string): void {
    const cached = this.get(campaignId)
    if (cached) {
      const updated = cached.filter(note => note.id !== noteId)
      this.set(campaignId, updated)
    }
  }

  // Get cache statistics for debugging
  getStats(): { totalEntries: number; expiredEntries: number; staleEntries: number } {
    const now = Date.now()
    let expiredEntries = 0
    let staleEntries = 0

    Object.values(this.memoryCache).forEach(entry => {
      if (entry.expiresAt <= now) {
        expiredEntries++
      } else if (entry.timestamp + this.STALE_THRESHOLD <= now) {
        staleEntries++
      }
    })

    return {
      totalEntries: Object.keys(this.memoryCache).length,
      expiredEntries,
      staleEntries
    }
  }
}

// Singleton instance
export const campaignNotesCache = new CampaignNotesCacheManager()

// Cache-aware wrapper for getCampaignNotes
export const getCachedCampaignNotes = async (
  campaignId: string,
  forceRefresh = false
): Promise<{ 
  notes: CampaignNote[]; 
  fromCache: boolean; 
  isStale: boolean;
  error?: string 
}> => {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = campaignNotesCache.get(campaignId)
    if (cached) {
      return {
        notes: cached,
        fromCache: true,
        isStale: campaignNotesCache.isStale(campaignId)
      }
    }
  }

  // Fetch from database
  try {
    const { getCampaignNotes } = await import('./database')
    const result = await getCampaignNotes(campaignId)
    
    if (result.error) {
      return {
        notes: [],
        fromCache: false,
        isStale: false,
        error: result.error
      }
    }

    const notes = result.notes || []
    
    // Cache the result
    campaignNotesCache.set(campaignId, notes)
    
    return {
      notes,
      fromCache: false,
      isStale: false
    }
  } catch (error) {
    console.error('Error fetching campaign notes:', error)
    return {
      notes: [],
      fromCache: false,
      isStale: false,
      error: 'Failed to fetch campaign notes'
    }
  }
}

// Background refresh for stale cache
export const refreshStaleCampaignNotes = async (campaignId: string): Promise<void> => {
  if (campaignNotesCache.isStale(campaignId)) {
    try {
      const result = await getCachedCampaignNotes(campaignId, true)
      if (result.error) {
        console.warn(`Failed to refresh stale cache for campaign ${campaignId}:`, result.error)
      }
    } catch (error) {
      console.warn(`Error refreshing stale cache for campaign ${campaignId}:`, error)
    }
  }
}

// Cache invalidation helpers
export const invalidateCampaignNotesCache = (campaignId?: string) => {
  if (campaignId) {
    campaignNotesCache.invalidate(campaignId)
  } else {
    campaignNotesCache.invalidateAll()
  }
}

export const addNoteToCache = (campaignId: string, note: CampaignNote) => {
  campaignNotesCache.addNote(campaignId, note)
}

export const updateNoteInCache = (campaignId: string, noteId: string, updates: Partial<CampaignNote>) => {
  campaignNotesCache.updateNote(campaignId, noteId, updates)
}

export const removeNoteFromCache = (campaignId: string, noteId: string) => {
  campaignNotesCache.removeNote(campaignId, noteId)
}
