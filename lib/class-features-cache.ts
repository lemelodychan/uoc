/**
 * Class Features Cache
 * 
 * This module provides caching for class features to avoid unnecessary database queries.
 * Features are cached by class_id + level + subclass combination and persist until the app tab is refreshed.
 */

interface CachedFeatures {
  features: any[]
  timestamp: number
  classId: string
  level: number
  subclass?: string
}

interface PreloadRequest {
  classId: string
  level: number
  subclass?: string
  priority: 'high' | 'medium' | 'low'
}

class ClassFeaturesCache {
  private cache = new Map<string, CachedFeatures>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
  private preloadQueue: PreloadRequest[] = []
  private isPreloading = false

  /**
   * Generate a cache key for the given parameters
   */
  private getCacheKey(classId: string, level: number, subclass?: string): string {
    return `${classId}-${level}-${subclass || 'null'}`
  }

  /**
   * Check if cached data exists and is still valid
   */
  private isValid(cached: CachedFeatures): boolean {
    const now = Date.now()
    return (now - cached.timestamp) < this.CACHE_DURATION
  }

  /**
   * Get cached features if they exist and are valid
   */
  get(classId: string, level: number, subclass?: string): any[] | null {
    const key = this.getCacheKey(classId, level, subclass)
    const cached = this.cache.get(key)
    
    if (cached && this.isValid(cached)) {
      return cached.features
    }
    
    if (cached) {
      this.cache.delete(key)
    }
    
    return null
  }

  /**
   * Store features in cache
   */
  set(classId: string, level: number, features: any[], subclass?: string): void {
    const key = this.getCacheKey(classId, level, subclass)
    const cached: CachedFeatures = {
      features,
      timestamp: Date.now(),
      classId,
      level,
      subclass
    }
    
    this.cache.set(key, cached)
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[]; entries: Array<{ key: string; timestamp: number; featureCount: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      timestamp: cached.timestamp,
      featureCount: cached.features.length
    }))
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries
    }
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    const now = Date.now()
    let removedCount = 0
    
    for (const [key, cached] of this.cache.entries()) {
      if (!this.isValid(cached)) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
    }
  }

  /**
   * Add a preload request to the queue
   */
  preload(classId: string, level: number, subclass?: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const key = this.getCacheKey(classId, level, subclass)
    
    // Don't preload if already cached
    if (this.cache.has(key)) {
      return
    }
    
    // Don't add duplicates
    const exists = this.preloadQueue.some(req => 
      req.classId === classId && req.level === level && req.subclass === subclass
    )
    
    if (!exists) {
      this.preloadQueue.push({ classId, level, subclass, priority })
    }
  }

  /**
   * Process the preload queue
   */
  async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return
    }

    this.isPreloading = true

    try {
      // Sort by priority (high first)
      const sortedQueue = [...this.preloadQueue].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      // Process in batches to avoid overwhelming the database
      const batchSize = 3
      for (let i = 0; i < sortedQueue.length; i += batchSize) {
        const batch = sortedQueue.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (request) => {
          try {
            const { loadClassFeatures } = await import('./database')
            const { features, error } = await loadClassFeatures(
              request.classId, 
              request.level, 
              request.subclass
            )
            
            if (error) {
            } else {
            }
          } catch (err) {
          }
        }))

        // Small delay between batches
        if (i + batchSize < sortedQueue.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } finally {
      this.preloadQueue = []
      this.isPreloading = false
    }
  }

  /**
   * Preload features for all characters
   */
  async preloadForCharacters(characters: any[]): Promise<void> {
    const preloadRequests: PreloadRequest[] = []

    for (const character of characters) {
      if (character.classes && character.classes.length > 0) {
        // Multiclass character
        for (const charClass of character.classes) {
          if (charClass.class_id) {
            preloadRequests.push({
              classId: charClass.class_id,
              level: charClass.level,
              subclass: charClass.subclass,
              priority: 'high'
            })
          }
        }
      } else if (character.class) {
        // Single class character - we need to get the class_id
        try {
          const { loadClassData } = await import('./database')
          const { classData } = await loadClassData(character.class, character.subclass)
          
          if (classData?.id) {
            preloadRequests.push({
              classId: classData.id,
              level: character.level,
              subclass: character.subclass,
              priority: 'high'
            })
          }
        } catch (error) {
        }
      }
    }

    // Add all requests to the queue
    for (const request of preloadRequests) {
      this.preload(request.classId, request.level, request.subclass, request.priority)
    }

    // Process the queue
    await this.processPreloadQueue()
  }
}

// Create a singleton instance
export const classFeaturesCache = new ClassFeaturesCache()

// Clean up expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    classFeaturesCache.cleanup()
  }, 10 * 60 * 1000) // 10 minutes
}

// Clear cache when the page is about to be unloaded (tab refresh/close)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    classFeaturesCache.clear()
  })
  
  // Add cache debugging to window object in development
  if (process.env.NODE_ENV === 'development') {
    (window as any).classFeaturesCache = classFeaturesCache
  }
}
