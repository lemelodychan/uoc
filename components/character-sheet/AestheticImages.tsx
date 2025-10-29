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

  // Filter out empty strings and limit to 6 images
  const validImages = character.aestheticImages
    .filter(url => url && url.trim() !== '')
    .slice(0, 6)

  // Don't render if no valid images after filtering
  if (validImages.length === 0) {
    return null
  }

  return (
    <Card className="p-0 rounded-none border-0 border-b overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-6 gap-0">
          {validImages.map((imageUrl, index) => (
            <div key={index} className="relative group h-[112px]">
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
            </div>
          ))}
          {/* Fill remaining slots with empty placeholders if less than 6 images */}
          {Array.from({ length: 6 - validImages.length }).map((_, index) => (
            <div key={`empty-${index}`} className="h-[112px] flex items-center justify-center">
              <div className="text-muted-foreground/40 text-xs">Empty</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
