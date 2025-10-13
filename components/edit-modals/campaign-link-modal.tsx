"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CampaignLink } from "@/lib/database"
import { Label } from "@/components/ui/label"

interface CampaignLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (link: Omit<CampaignLink, 'id' | 'created_at' | 'updated_at'>) => void
  campaignId: string
}

export function CampaignLinkModal({ isOpen, onClose, onSave, campaignId }: CampaignLinkModalProps) {
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTitle("")
      setUrl("")
    }
  }, [isOpen])

  const handleSave = async () => {
    const trimmedTitle = title.trim()
    const trimmedUrl = url.trim()
    if (!trimmedTitle || !trimmedUrl) return
    setIsLoading(true)
    try {
      await onSave({ campaign_id: campaignId, title: trimmedTitle, url: trimmedUrl })
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setTitle("")
    setUrl("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 p-4 bg-background">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim() || !url.trim()}>Add Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CampaignLinkModal


