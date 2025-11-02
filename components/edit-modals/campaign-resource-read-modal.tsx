"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import type { CampaignResource } from "@/lib/database"
import { useEffect, useRef } from "react"

interface CampaignResourceReadModalProps {
  isOpen: boolean
  onClose: () => void
  resource: CampaignResource | null
  onEdit: () => void
  onDelete: () => void
  authorName: string
  canEdit?: boolean
}

export function CampaignResourceReadModal({
  isOpen,
  onClose,
  resource,
  onEdit,
  onDelete,
  authorName,
  canEdit = true
}: CampaignResourceReadModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Add image styling after content is rendered
  // Must be called before early return to follow rules of hooks
  useEffect(() => {
    if (contentRef.current && resource?.content) {
      const images = contentRef.current.querySelectorAll('img')
      images.forEach((img) => {
        // Ensure images have proper attributes
        if (!img.alt) {
          img.alt = 'Campaign resource image'
        }
        
        // Ensure images have border-radius
        img.style.borderRadius = '8px'
        img.style.display = 'block'
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.objectFit = 'contain'
      })
    }
  }, [resource?.content, isOpen])

  if (!resource) return null

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-start justify-between">
            <div className="gap-2 flex flex-col">
              <DialogTitle className="text-2xl">{resource.title}</DialogTitle>
              <div className="flex flex-row gap-4 text-xs text-muted-foreground/70">
                <div className="flex items-center gap-1">
                  <Icon icon="lucide:calendar" className="w-3 h-3" />
                  {formatDate(resource.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="lucide:feather" className="w-3 h-3" />
                  {authorName}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col overflow-auto p-4 bg-background max-h-[70vh]">
          {/* Hidden editor to load CSS styles */}
          <div style={{ display: 'none' }}>
            <WysiwygEditor value="" onChange={() => {}} />
          </div>

          <div 
            ref={contentRef}
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: resource.content }}
            style={{
              lineHeight: '1.6'
            }}
          />

          {resource.updated_at !== resource.created_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-2">
              <Icon icon="lucide:edit" className="w-3 h-3" />
              Edited {formatDate(resource.updated_at)}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-between p-4 border-t gap-2 bg-card">
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Icon icon="lucide:trash-2" className="w-4 h-4" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-2"
            >
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}

export default CampaignResourceReadModal


