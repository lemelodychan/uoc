import { useState, useEffect, useCallback } from 'react'
import type { CampaignNote } from '@/lib/database'
import { 
  getCachedCampaignNotes, 
  refreshStaleCampaignNotes,
  invalidateCampaignNotesCache 
} from '@/lib/campaign-notes-cache'

interface UseCampaignNotesResult {
  notes: CampaignNote[]
  loading: boolean
  error: string | null
  fromCache: boolean
  isStale: boolean
  refresh: () => Promise<void>
  invalidateCache: () => void
}

export function useCampaignNotes(campaignId: string | undefined): UseCampaignNotesResult {
  const [notes, setNotes] = useState<CampaignNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [isStale, setIsStale] = useState(false)

  const loadNotes = useCallback(async (forceRefresh = false) => {
    if (!campaignId) {
      setNotes([])
      setError(null)
      setFromCache(false)
      setIsStale(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await getCachedCampaignNotes(campaignId, forceRefresh)
      
      setNotes(result.notes)
      setFromCache(result.fromCache)
      setIsStale(result.isStale)
      
      if (result.error) {
        setError(result.error)
      }

      // If data is stale, refresh in background
      if (result.isStale && !forceRefresh) {
        refreshStaleCampaignNotes(campaignId).catch(err => {
          console.warn('Background refresh failed:', err)
        })
      }
    } catch (err) {
      console.error('Error loading campaign notes:', err)
      setError('Failed to load campaign notes')
      setNotes([])
      setFromCache(false)
      setIsStale(false)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  const refresh = useCallback(async () => {
    await loadNotes(true)
  }, [loadNotes])

  const invalidateCache = useCallback(() => {
    if (campaignId) {
      invalidateCampaignNotesCache(campaignId)
      loadNotes(true)
    }
  }, [campaignId, loadNotes])

  // Load notes when campaign ID changes
  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Set up periodic background refresh for stale data
  useEffect(() => {
    if (!campaignId || !isStale) return

    const interval = setInterval(() => {
      refreshStaleCampaignNotes(campaignId).catch(err => {
        console.warn('Periodic background refresh failed:', err)
      })
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [campaignId, isStale])

  return {
    notes,
    loading,
    error,
    fromCache,
    isStale,
    refresh,
    invalidateCache
  }
}
