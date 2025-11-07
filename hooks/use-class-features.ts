import { useState, useEffect, useCallback, useRef } from 'react'
import type { CharacterData } from '@/lib/character-data'
import { classFeaturesCache } from '@/lib/class-features-cache'

interface UseClassFeaturesResult {
  features: any[]
  loading: boolean
  error: string | null
  fromCache: boolean
  refresh: () => Promise<void>
}

export function useClassFeatures(character: CharacterData | undefined): UseClassFeaturesResult {
  const [features, setFeatures] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [currentCharacterId, setCurrentCharacterId] = useState<string | undefined>(character?.id)
  const loadAbortRef = useRef<AbortController | null>(null)

  // Immediately clear features when character ID changes to prevent showing stale data
  useEffect(() => {
    if (character?.id !== currentCharacterId) {
      // Abort any in-flight requests for the previous character
      if (loadAbortRef.current) {
        loadAbortRef.current.abort()
      }
      setCurrentCharacterId(character?.id)
      setFeatures([])
      setError(null)
      setFromCache(false)
      setLoading(true) // Set loading to true immediately when character changes
    }
  }, [character?.id, currentCharacterId])

  const loadFeatures = useCallback(async (forceRefresh = false) => {
    if (!character?.id) {
      setFeatures([])
      setError(null)
      setFromCache(false)
      setLoading(false)
      return
    }

    // Abort any previous request
    if (loadAbortRef.current) {
      loadAbortRef.current.abort()
    }

    // Create new abort controller for this request
    const abortController = new AbortController()
    loadAbortRef.current = abortController

    setLoading(true)
    setError(null)

    try {
      const allFeatures: any[] = []
      let hasCacheMiss = false

      // Handle multiclassing - load features for each class
      if (character.classes && character.classes.length > 0) {
        for (const charClass of character.classes) {
          // Get base class_id for this class (where subclass IS NULL)
          // loadClassFeatures will handle loading subclass features if subclass is provided
          const { loadClassData } = await import('@/lib/database')
          const { classData: baseClassData } = await loadClassData(charClass.name)
          
          if (baseClassData?.id) {
            // Check cache first - use base class_id for caching
            const cachedFeatures = classFeaturesCache.get(baseClassData.id, charClass.level, charClass.subclass)
            
            if (cachedFeatures && !forceRefresh) {
              const featuresWithClassName = cachedFeatures.map(f => ({
                ...f,
                className: f.className || charClass.name
              }))
              allFeatures.push(...featuresWithClassName)
              setFromCache(true)
            } else {
              // Load from database
              if (!hasCacheMiss) {
                hasCacheMiss = true
              }
              
              const { loadClassFeatures } = await import('@/lib/database')
              // Pass base class_id - loadClassFeatures will handle loading subclass features
              const { features, error } = await loadClassFeatures(
                baseClassData.id, 
                charClass.level, 
                charClass.subclass
              )
              
              if (error) {
                console.error(`Error loading features for ${charClass.name}:`, error)
                setError(error)
              } else if (features) {
                // Ensure all features have the correct className set
                const featuresWithClassName = features.map(f => ({
                  ...f,
                  className: f.className || charClass.name
                }))
                allFeatures.push(...featuresWithClassName)
              }
            }
          }
        }
      } else {
        // Single class character
        const { loadClassData } = await import('@/lib/database')
        // Get base class_id (where subclass IS NULL)
        const { classData: baseClassData } = await loadClassData(character.class)
        
        if (baseClassData?.id) {
          // Check cache first - use base class_id for caching
          const cachedFeatures = classFeaturesCache.get(baseClassData.id, character.level, character.subclass)
          
          if (cachedFeatures && !forceRefresh) {
            allFeatures.push(...cachedFeatures)
            setFromCache(true)
          } else {
            // Load from database
            if (!hasCacheMiss) {
              hasCacheMiss = true
            }
            
            const { loadClassFeatures } = await import('@/lib/database')
            // Pass base class_id - loadClassFeatures will handle loading subclass features
            const { features, error } = await loadClassFeatures(
              baseClassData.id, 
              character.level, 
              character.subclass
            )
            
            if (error) {
              console.error(`Error loading features for ${character.class}:`, error)
              setError(error)
            } else if (features) {
              // Ensure all features have the correct className set
              const featuresWithClassName = features.map(f => ({
                ...f,
                className: f.className || character.class
              }))
              allFeatures.push(...featuresWithClassName)
            }
          }
        }
      }

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setFeatures(allFeatures)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        console.error('Error loading class features:', err)
        setError('Failed to load class features')
        setFeatures([])
        setFromCache(false)
      }
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [
    character?.id,
    character?.class,
    character?.subclass,
    character?.level,
    character?.classes
  ])

  const refresh = useCallback(async () => {
    await loadFeatures(true)
  }, [loadFeatures])

  // Load features when character changes
  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  return {
    features,
    loading,
    error,
    fromCache,
    refresh
  }
}

// Hook for preloading class features for multiple characters
export function useClassFeaturesPreloader() {
  const preloadForCharacters = useCallback(async (characters: CharacterData[]) => {
    try {
      await classFeaturesCache.preloadForCharacters(characters)
    } catch (error) {
      console.error('Error preloading class features:', error)
    }
  }, [])

  return { preloadForCharacters }
}
