"use client"

import { useEffect } from "react"
import { racesCache } from "@/lib/races-cache"

export function RaceCacheBootstrap() {
  useEffect(() => {
    racesCache.ensureLoaded()
  }, [])
  return null
}


