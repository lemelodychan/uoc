import { useState, useEffect, useCallback } from 'react'
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

  const loadFeatures = useCallback(async (forceRefresh = false) => {
    if (!character?.id) {
      setFeatures([])
      setError(null)
      setFromCache(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const allFeatures: any[] = []
      let hasCacheMiss = false

      // Handle multiclassing - load features for each class
      if (character.classes && character.classes.length > 0) {
        for (const charClass of character.classes) {
          // Get class_id for this class
          const { loadClassData } = await import('@/lib/database')
          const { classData } = await loadClassData(charClass.name, charClass.subclass)
          
          if (classData?.id) {
            // Check cache first
            const cachedFeatures = classFeaturesCache.get(classData.id, charClass.level, charClass.subclass)
            
            if (cachedFeatures && !forceRefresh) {
              allFeatures.push(...cachedFeatures)
              setFromCache(true)
            } else {
              // Load from database
              if (!hasCacheMiss) {
                hasCacheMiss = true
              }
              
              const { loadClassFeatures } = await import('@/lib/database')
              const { features, error } = await loadClassFeatures(
                classData.id, 
                charClass.level, 
                charClass.subclass
              )
              
              if (error) {
                console.error(`Error loading features for ${charClass.name}:`, error)
                setError(error)
              } else if (features) {
                allFeatures.push(...features)
              }
            }
          }
        }
      } else {
        // Single class character
        const { loadClassData } = await import('@/lib/database')
        const { classData } = await loadClassData(character.class, character.subclass)
        
        if (classData?.id) {
          // Check cache first
          const cachedFeatures = classFeaturesCache.get(classData.id, character.level, character.subclass)
          
          if (cachedFeatures && !forceRefresh) {
            allFeatures.push(...cachedFeatures)
            setFromCache(true)
          } else {
            // Load from database
            if (!hasCacheMiss) {
              hasCacheMiss = true
            }
            
            const { loadClassFeatures } = await import('@/lib/database')
            const { features, error } = await loadClassFeatures(
              classData.id, 
              character.level, 
              character.subclass
            )
            
            if (error) {
              console.error(`Error loading features for ${character.class}:`, error)
              setError(error)
            } else if (features) {
              allFeatures.push(...features)
            }
          }
        }
      }

      setFeatures(allFeatures)
    } catch (err) {
      console.error('Error loading class features:', err)
      setError('Failed to load class features')
      setFeatures([])
      setFromCache(false)
    } finally {
      setLoading(false)
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
