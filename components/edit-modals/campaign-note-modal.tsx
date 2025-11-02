"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import { Icon } from "@iconify/react"
import type { CampaignNote } from "@/lib/database"
import { Badge } from "@/components/ui/badge"

interface CampaignNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: Omit<CampaignNote, 'id' | 'created_at' | 'updated_at'>) => void
  editingNote?: CampaignNote | null
  campaignId: string
  currentUserId: string
}

export function CampaignNoteModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingNote,
  campaignId,
  currentUserId
}: CampaignNoteModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [sessionDate, setSessionDate] = useState("")
  const [membersAttending, setMembersAttending] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Update form state when editingNote changes
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || "")
      setContent(editingNote.content || "")
      setSessionDate(editingNote.session_date || "")
      setMembersAttending(editingNote.members_attending?.join(", ") || "")
    } else {
      setTitle("")
      setContent("")
      setSessionDate("")
      setMembersAttending("")
    }
  }, [editingNote])

  const handleSave = async () => {
    if (!title.trim()) {
      return
    }

    setIsLoading(true)
    try {
      await onSave({
        campaign_id: campaignId,
        author_id: currentUserId,
        title: title.trim(),
        content: content,
        session_date: sessionDate || undefined,
        members_attending: membersAttending.trim() ? membersAttending.split(",").map(m => m.trim()).filter(m => m) : undefined
      })
      onClose()
    } catch (error) {
      console.error("Error saving note:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setContent("")
    setSessionDate("")
    setMembersAttending("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[90vw] !w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {editingNote ? "Edit Session Note" : "Create Session Note"}
          </DialogTitle>
          <DialogDescription>
            {editingNote ? "Update your session note below." : "Create a new session note to share with your party."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 p-4 bg-background">
          <div className="flex flex-col gap-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="session-date">Session Date <Badge variant="secondary">Optional</Badge></Label>
              <div className="relative">
                <Input
                  id="session-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full pl-10 pr-10 font-sans"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                />
                <Icon 
                  icon="lucide:calendar" 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer pointer-events-auto" 
                  onClick={() => {
                    const input = document.getElementById('session-date') as HTMLInputElement
                    if (input) {
                      try {
                        input.showPicker?.()
                      } catch {
                        input.focus()
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="members-attending">Members Attending <Badge variant="secondary">Optional</Badge></Label>
              <Input
                id="members-attending"
                value={membersAttending}
                onChange={(e) => setMembersAttending(e.target.value)}
                placeholder="Enter names separated by commas..."
                className="w-full"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <WysiwygEditor
              value={content}
              onChange={setContent}
              placeholder="Write your session notes here..."
            />
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icon icon="lucide:save" className="w-4 h-4" />
                {editingNote ? "Update Note" : "Create Note"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <style jsx global>{`
        /* Date picker styling */
        input[type="date"] {
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
        }
        
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          width: 20px;
          height: 20px;
          z-index: 1;
        }
        
        input[type="date"]::-webkit-datetime-edit-text {
          color: inherit;
        }
        
        input[type="date"]::-webkit-datetime-edit-month-field,
        input[type="date"]::-webkit-datetime-edit-day-field,
        input[type="date"]::-webkit-datetime-edit-year-field {
          color: inherit;
        }

        /* Calendar dropdown styling */
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          background: transparent;
        }

        /* Firefox date picker styling */
        input[type="date"]::-moz-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          width: 20px;
          height: 20px;
          z-index: 1;
        }

        /* Ensure calendar popup uses correct styling */
        input[type="date"]:focus {
          outline: none;
          ring: 2px;
          ring-color: hsl(var(--ring));
          ring-offset: 2px;
        }

        /* Calendar popup styling (limited control) */
        input[type="date"]::-webkit-calendar-picker-indicator:focus {
          outline: none;
        }
      `}</style>
    </Dialog>
  )
}
