"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import type { CampaignNote } from "@/lib/database"

interface CampaignNoteReadModalProps {
  isOpen: boolean
  onClose: () => void
  note: CampaignNote | null
  onEdit: () => void
  onDelete: () => void
  authorName: string
  canEdit: boolean
}

export function CampaignNoteReadModal({ 
  isOpen, 
  onClose, 
  note,
  onEdit,
  onDelete,
  authorName,
  canEdit
}: CampaignNoteReadModalProps) {
  if (!note) return null

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
      <DialogContent className="!max-w-[800px] !w-[90vw] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-start justify-between">
              <div className="gap-2 flex flex-col">
                <DialogTitle className="text-2xl">{note.title}</DialogTitle>
                <div className="flex flex-row gap-4 text-xs text-muted-foreground/70">
                  {note.session_date && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:calendar-days" className="w-3 h-3" />
                      {new Date(note.session_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Icon icon="lucide:feather" className="w-3 h-3" />
                    {authorName}
                  </div>
                  {note.members_attending && note.members_attending.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Icon icon="lucide:users" className="w-3 h-3" />
                      {note.members_attending.join(", ")}
                    </div>
                  )}
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
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: note.content }}
            style={{
              lineHeight: '1.6'
            }}
          />

          {note.updated_at !== note.created_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-2">
              <Icon icon="lucide:edit" className="w-3 h-3" />
              Edited {formatDate(note.updated_at)}
            </div>
          )}
        </div>

        <div className="flex justify-between p-4 border-t gap-2">
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

      </DialogContent>
    </Dialog>
  )
}
