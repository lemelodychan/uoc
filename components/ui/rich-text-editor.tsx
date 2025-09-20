"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Bold, List, Type } from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, rows = 6, className }: RichTextEditorProps) {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)

  const insertText = (before: string, after = "") => {
    if (!textareaRef) return

    const start = textareaRef.selectionStart
    const end = textareaRef.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)

    onChange(newText)

    // Set cursor position after the inserted text
    setTimeout(() => {
      textareaRef.focus()
      textareaRef.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const addBold = () => insertText("**", "**")
  const addBulletPoint = () => {
    const lines = value.split("\n")
    const start = textareaRef?.selectionStart || 0
    const lineStart = value.lastIndexOf("\n", start - 1) + 1
    const currentLine = lines.findIndex((_, index) => {
      const lineEnd = lines.slice(0, index + 1).join("\n").length
      return lineEnd >= start
    })

    if (currentLine >= 0) {
      const line = lines[currentLine]
      if (!line.trim().startsWith("- ")) {
        lines[currentLine] = "- " + line
        onChange(lines.join("\n"))
      }
    } else {
      insertText("- ")
    }
  }

  const addLineBreak = () => insertText("\n")

  const minHeight = rows * 28 // approx line-height for mono text (tweakable)

  return (
    <div className={className}>
      <div className="flex gap-2 mb-2">
        <Button type="button" variant="outline" size="sm" onClick={addBold} className="h-8 px-2 bg-transparent">
          <Bold className="w-3 h-3" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addBulletPoint} className="h-8 px-2 bg-transparent">
          <List className="w-3 h-3" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addLineBreak} className="h-8 px-2 bg-transparent">
          <Type className="w-3 h-3" />
        </Button>
      </div>
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
        style={{ minHeight }}
      />
      <div className="text-xs text-muted-foreground mt-1">
        Use **bold** for emphasis, - for bullet points, and line breaks for formatting
      </div>
    </div>
  )
}
