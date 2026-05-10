"use client"

import { Suspense } from "react"
import { CharacterSheetContent } from "@/app/page"

interface CharacterPageClientProps {
  characterId: string
  campaignSlug: string
}

export function CharacterPageClient({ characterId }: CharacterPageClientProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading character…</div>}>
      <CharacterSheetContent initialCharacterId={characterId} />
    </Suspense>
  )
}
