type RacesById = Record<string, string>

class RacesCacheManager {
  private memoryMap: RacesById | null = null
  private readonly STORAGE_KEY = 'uoc.racesById.v1'
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private emitter: EventTarget | null = null

  private getEmitter(): EventTarget {
    if (!this.emitter) this.emitter = new EventTarget()
    return this.emitter
  }

  private loadFromStorage(): RacesById | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { map: RacesById; ts: number }
      if (!parsed?.map || !parsed?.ts) return null
      if (Date.now() - parsed.ts > this.CACHE_DURATION) return null
      return parsed.map
    } catch {
      return null
    }
  }

  private saveToStorage(map: RacesById): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ map, ts: Date.now() }))
    } catch {
      // ignore storage errors
    }
  }

  get(): RacesById | null {
    return this.memoryMap
  }

  getName(id: string): string | undefined {
    return this.memoryMap ? this.memoryMap[id] : undefined
  }

  async ensureLoaded(): Promise<void> {
    if (this.memoryMap) return
    // Try storage
    const fromStorage = this.loadFromStorage()
    if (fromStorage) {
      this.memoryMap = fromStorage
      this.notify()
      return
    }
    // Fetch
    const { loadAllRaces } = await import('./database')
    const { races } = await loadAllRaces()
    const map: RacesById = {}
    for (const r of races || []) map[r.id] = r.name
    this.memoryMap = map
    this.saveToStorage(map)
    this.notify()
  }

  setFromList(list: Array<{ id: string; name: string }>): void {
    const map: RacesById = {}
    for (const r of list) map[r.id] = r.name
    this.memoryMap = map
    this.saveToStorage(map)
    this.notify()
  }

  upsert(id: string, name: string): void {
    const map: RacesById = { ...(this.memoryMap || {}) }
    map[id] = name
    this.memoryMap = map
    this.saveToStorage(map)
    this.notify()
  }

  remove(id: string): void {
    if (!this.memoryMap) return
    const map = { ...this.memoryMap }
    delete map[id]
    this.memoryMap = map
    this.saveToStorage(map)
    this.notify()
  }

  invalidate(): void {
    this.memoryMap = null
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(this.STORAGE_KEY) } catch {}
    }
    this.notify()
  }

  subscribe(listener: (map: RacesById | null) => void): () => void {
    const emitter = this.getEmitter()
    const handler = ((event: Event) => {
      listener((event as CustomEvent<RacesById | null>).detail)
    }) as EventListener
    emitter.addEventListener('races-cache-updated', handler)
    return () => emitter.removeEventListener('races-cache-updated', handler)
  }

  private notify(): void {
    const emitter = this.getEmitter()
    const event = new CustomEvent('races-cache-updated', { detail: this.memoryMap })
    emitter.dispatchEvent(event)
  }
}

export const racesCache = new RacesCacheManager()


