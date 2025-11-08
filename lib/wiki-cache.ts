/**
 * Wiki Content Cache
 * Caches classes, races, and backgrounds data for the wiki page
 * Spells are not cached as they change more frequently
 */

interface CachedWikiData<T> {
  data: T
  timestamp: number
}

class WikiCache {
  private classesCache: CachedWikiData<any> | null = null
  private racesCache: CachedWikiData<any> | null = null
  private backgroundsCache: CachedWikiData<any> | null = null
  private classFeaturesCache: Map<string, CachedWikiData<any[]>> = new Map()
  
  // Cache duration: 5 minutes (300000ms)
  private readonly CACHE_DURATION = 5 * 60 * 1000

  private isValid(cached: CachedWikiData<any> | null): boolean {
    if (!cached) return false
    const now = Date.now()
    return (now - cached.timestamp) < this.CACHE_DURATION
  }

  // Classes cache
  getClasses(): any[] | null {
    if (this.isValid(this.classesCache)) {
      return this.classesCache!.data
    }
    this.classesCache = null
    return null
  }

  setClasses(classes: any[]): void {
    this.classesCache = {
      data: classes,
      timestamp: Date.now()
    }
  }

  // Races cache
  getRaces(): any[] | null {
    if (this.isValid(this.racesCache)) {
      return this.racesCache!.data
    }
    this.racesCache = null
    return null
  }

  setRaces(races: any[]): void {
    this.racesCache = {
      data: races,
      timestamp: Date.now()
    }
  }

  // Backgrounds cache
  getBackgrounds(): any[] | null {
    if (this.isValid(this.backgroundsCache)) {
      return this.backgroundsCache!.data
    }
    this.backgroundsCache = null
    return null
  }

  setBackgrounds(backgrounds: any[]): void {
    this.backgroundsCache = {
      data: backgrounds,
      timestamp: Date.now()
    }
  }

  // Class features cache (keyed by base class ID)
  getClassFeatures(baseClassId: string): any[] | null {
    const cached = this.classFeaturesCache.get(baseClassId)
    if (cached && this.isValid(cached)) {
      return cached.data
    }
    if (cached) {
      this.classFeaturesCache.delete(baseClassId)
    }
    return null
  }

  setClassFeatures(baseClassId: string, features: any[]): void {
    this.classFeaturesCache.set(baseClassId, {
      data: features,
      timestamp: Date.now()
    })
  }

  // Invalidate specific caches
  invalidateClasses(): void {
    this.classesCache = null
    this.classFeaturesCache.clear()
  }

  invalidateRaces(): void {
    this.racesCache = null
  }

  invalidateBackgrounds(): void {
    this.backgroundsCache = null
  }

  invalidateClassFeatures(baseClassId?: string): void {
    if (baseClassId) {
      this.classFeaturesCache.delete(baseClassId)
    } else {
      this.classFeaturesCache.clear()
    }
  }

  // Clear all caches
  clear(): void {
    this.classesCache = null
    this.racesCache = null
    this.backgroundsCache = null
    this.classFeaturesCache.clear()
  }
}

// Export singleton instance
export const wikiCache = new WikiCache()

