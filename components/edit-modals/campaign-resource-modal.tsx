"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor"
import type { CampaignResource } from "@/lib/database"

interface CampaignResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (resource: Omit<CampaignResource, 'id' | 'created_at' | 'updated_at'>) => void
  editingResource?: CampaignResource | null
  campaignId: string
  currentUserId?: string
}

export function CampaignResourceModal({
  isOpen,
  onClose,
  onSave,
  editingResource,
  campaignId,
  currentUserId
}: CampaignResourceModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (editingResource) {
      setTitle(editingResource.title || "")
      setContent(editingResource.content || "")
    } else {
      setTitle("")
      setContent("")
    }
  }, [editingResource])

  const handleSave = async () => {
    if (!title.trim()) return
    setIsLoading(true)
    try {
      await onSave({
        campaign_id: campaignId,
        author_id: currentUserId || "",
        title: title.trim(),
        content
      })
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setContent("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!w-[90vw] !max-w-[90vw] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{editingResource ? "Edit Document" : "New Campaign Document"}</DialogTitle>
          <DialogDescription>
            Create and manage campaign resource documents.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-4 bg-background">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
          </div>
          <div className="grid gap-2">
            <Label>Content</Label>
            <WysiwygEditor value={content} onChange={setContent} placeholder="Write your document..." />
          </div>
        </div>

        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>{editingResource ? "Update" : "Add to documents"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CampaignResourceModal


