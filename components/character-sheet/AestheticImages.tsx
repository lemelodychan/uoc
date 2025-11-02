"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { CharacterData } from "@/lib/character-data"

interface AestheticImagesProps {
  character: CharacterData
}

export function AestheticImages({ character }: AestheticImagesProps) {
  // Don't render if no aesthetic images are provided
  if (!character.aestheticImages || character.aestheticImages.length === 0) {
    return null
  }

  // Ensure we have exactly 6 slots, preserving order and empty slots
  // Pad to 6 elements if shorter, but preserve exact order from database
  const images = Array.from({ length: 6 }, (_, index) => {
    return character.aestheticImages[index] !== undefined 
      ? character.aestheticImages[index] 
      : ""
  })

  // Check if we have any valid images at all
  const hasValidImages = images.some(url => url && url.trim() !== '')
  
  if (!hasValidImages) {
    return null
  }

  return (
    <Card className="p-0 rounded-none border-0 border-b overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-6 gap-0">
          {images.map((imageUrl, index) => {
            const hasImage = imageUrl && imageUrl.trim() !== ''
            return (
              <div key={index} className={`relative group h-[112px] ${!hasImage ? 'flex items-center justify-center' : ''}`}>
                {hasImage ? (
                  <img
                    src={imageUrl}
                    alt={`Aesthetic image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide the image if it fails to load
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="text-muted-foreground/40 text-xs">Empty</div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
