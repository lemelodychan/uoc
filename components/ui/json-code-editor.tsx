"use client"

import { useEffect, useMemo, useRef, useState } from "react"

interface JsonCodeEditorProps<T = any> {
  value: T
  onChange: (value: T) => void
  placeholder?: string
  rows?: number
  className?: string
}

export function JsonCodeEditor<T = any>({ value, onChange, placeholder, rows = 8, className }: JsonCodeEditorProps<T>) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const formatted = JSON.stringify(value ?? (Array.isArray(value) ? [] : {}), null, 2)
      if (formatted !== text) setText(formatted)
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const applyChange = (t: string) => {
    setText(t)
    try {
      const parsed = t.trim() === "" ? (text.trim().startsWith("[") ? [] : {}) : JSON.parse(t)
      setError(null)
      onChange(parsed as T)
    } catch (e: any) {
      setError(e?.message || "Invalid JSON")
    }
  }

  const highlighted = useMemo(() => {
    // Minimal JSON syntax highlighting using spans
    try {
      const json = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("(\\.|[^"])*")(:?)/g, (m, g1, _g2, g3) => `<span class='text-emerald-600'>${g1}</span>${g3 ? "<span class='text-muted-foreground'>:</span>" : ""}`)
        .replace(/\b(true|false|null)\b/g, '<span class="text-purple-600">$1</span>')
        .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="text-blue-600">$1</span>')
      return json
    } catch {
      return text
    }
  }, [text])

  const syncHtml = () => {
    if (!editorRef.current) return
    // Preserve selection by storing plain text offset
    const selection = window.getSelection()
    let offset = 0
    if (selection && selection.anchorNode) {
      const range = selection.getRangeAt(0)
      const preRange = range.cloneRange()
      preRange.selectNodeContents(editorRef.current)
      preRange.setEnd(range.endContainer, range.endOffset)
      offset = preRange.toString().length
    }
    editorRef.current.innerHTML = highlighted || ""
    // Restore caret to approximate position by walking text nodes
    if (selection && editorRef.current) {
      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      let remaining = offset
      while (current) {
        const len = (current.nodeValue || "").length
        if (remaining <= len) break
        remaining -= len
        current = walker.nextNode()
      }
      const r = document.createRange()
      const node = current || editorRef.current
      r.setStart(node, Math.max(0, Math.min(remaining, (node.nodeValue || "").length)))
      r.collapse(true)
      selection.removeAllRanges()
      selection.addRange(r)
    }
  }

  useEffect(() => {
    syncHtml()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlighted])

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newVal = (e.currentTarget.textContent ?? "").replace(/\u00A0/g, " ")
    applyChange(newVal)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      document.execCommand("insertText", false, "  ")
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault()
      // noop: parent can handle save
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
  }

  return (
    <div className={className}>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        contentEditable
        spellCheck={false}
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className="font-mono text-xs p-2 rounded border bg-background overflow-auto whitespace-pre-wrap break-words min-h-[calc(28px_*_8)]"
        data-placeholder={placeholder || ""}
      />
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  )
}


