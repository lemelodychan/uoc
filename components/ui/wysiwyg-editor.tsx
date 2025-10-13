"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { useEffect } from "react"

interface WysiwygEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function WysiwygEditor({ value, onChange, placeholder, className }: WysiwygEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  })

  // Add tab functionality for list nesting
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const { state, view } = editor
        const { selection } = state
        const { $from } = selection
        
        // Check if we're in a list item
        const listItem = $from.node($from.depth - 1)
        if (listItem && (listItem.type.name === 'listItem')) {
          event.preventDefault()
          
          if (event.shiftKey) {
            // Shift+Tab: Outdent (lift list item)
            editor.commands.liftListItem('listItem')
          } else {
            // Tab: Indent (sink list item)
            editor.commands.sinkListItem('listItem')
          }
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('keydown', handleKeyDown)

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor])

  if (!editor) {
    return (
      <div className={className}>
        <div className="flex gap-1 mb-2 p-2 border rounded-t-md bg-muted/50">
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          <div className="h-8 w-8 bg-muted animate-pulse rounded" />
        </div>
        <div className="min-h-[200px] p-3 border border-t-0 rounded-b-md bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading editor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex gap-1 p-2 border rounded-t-md bg-card">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-accent' : ''}`}
          title="Bold"
        >
          <Icon icon="lucide:bold" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-accent' : ''}`}
          title="Italic"
        >
          <Icon icon="lucide:italic" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-accent' : ''}`}
          title="Strikethrough"
        >
          <Icon icon="lucide:strikethrough" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
          title="Bullet List"
        >
          <Icon icon="lucide:list" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
          title="Numbered List"
        >
          <Icon icon="lucide:list-ordered" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}`}
          title="Heading 1"
        >
          <Icon icon="lucide:heading-1" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}
          title="Heading 2"
        >
          <Icon icon="lucide:heading-2" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('paragraph') ? 'bg-accent' : ''}`}
          title="Paragraph"
        >
          <Icon icon="lucide:type" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="h-8 w-8 p-0"
          title="Clear Formatting"
        >
          <Icon icon="lucide:remove-formatting" className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="border border-t-0 rounded-b-md bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        /* Tiptap Editor Styles */
        .ProseMirror {
          outline: none;
          min-height: 200px;
          height: 50vh;
          max-height: 50vh;
          overflow-y: auto;
          padding: 12px;
          line-height: 1.6;
        }

        .ProseMirror p {
          margin: 0.5rem 0;
        }

        .ProseMirror p:first-child {
          margin-top: 0;
        }

        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem 0;
          line-height: 1.2;
        }

        .ProseMirror h1:first-child {
          margin-top: 0;
        }

        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.3;
        }

        .ProseMirror h2:first-child {
          margin-top: 0;
        }

        .ProseMirror > ul, .ProseMirror > ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        /* Nested list styling for editor */
        .ProseMirror ul ul {
          list-style-type: circle;
          padding-left: 1.5rem;
        }

        .ProseMirror ul ul ul {
          list-style-type: square;
          padding-left: 1.5rem;
        }

        .ProseMirror ol ol {
          list-style-type: lower-alpha;
          padding-left: 1.5rem;
        }

        .ProseMirror ol ol ol {
          list-style-type: lower-roman;
          padding-left: 1.5rem;
        }

        .ProseMirror li {
          margin: 0.5rem 0;
          display: list-item;
        }

        .ProseMirror li p {
          margin: 0;
        }

        .ProseMirror li ul,
        .ProseMirror li ol {
          margin: 0.5rem 0;
        }

        .ProseMirror > ul > li {
          list-style-type: disc;
        }

        .ProseMirror > ol > li {
          list-style-type: decimal;
        }

        .ProseMirror strong,
        .ProseMirror b {
          font-weight: 800;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror s {
          text-decoration: line-through;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        /* Focus styles */
        .ProseMirror:focus {
          outline: none;
        }

        /* Selection styles */
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.4);
          pointer-events: none;
        }

        /* Dark mode support */
        .dark .ProseMirror p.is-editor-empty:first-child::before {
          color: #6b7280;
        }

        /* Scrollbar styling */
        .ProseMirror::-webkit-scrollbar {
          width: 6px;
        }

        .ProseMirror::-webkit-scrollbar-track {
          background: transparent;
        }

        .ProseMirror::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .dark .ProseMirror::-webkit-scrollbar-thumb {
          background: #4b5563;
        }

        .ProseMirror::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        .dark .ProseMirror::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        /* View Mode Styles (for campaign notes display) */
        .prose h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem 0;
          line-height: 1.2;
        }

        .prose h1:first-child {
          margin-top: 0;
        }

        .prose h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.3;
        }

        .prose h2:first-child {
          margin-top: 0;
        }

        .prose p {
          margin: 0.75rem 0;
          line-height: 1.6;
        }

        .prose p:first-child,
        .prose ul:first-child,
        .prose ol:first-child {
          margin-top: 0;
        }

/*         .prose p:last-child,
        .prose ul:last-child,
        .prose ol:last-child {
          margin-bottom: 0;
        } */

        .prose ul, .prose ol {
          margin: 0.75rem 0;
          padding-left: 1rem;
        }

        .prose ul {
          list-style-type: disc;
        }

        .prose ol {
          list-style-type: decimal;
        }

        /* Nested list styling for view mode */
        .prose ul ul {
          list-style-type: circle;
        }

        .prose ul ul ul {
          list-style-type: square;
        }

        .prose ol ol {
          list-style-type: lower-alpha;
        }

        .prose ol ol ol {
          list-style-type: lower-roman;
        }

        .prose li {
          margin: 0.5rem 0;
          display: list-item;
        }

        .prose li p {
          margin: 0;
        }

        .prose li ul,
        .prose li ol {
          margin: 0.5rem 0;
        }

        .prose > ul > li {
          list-style-type: disc;
        }

        .prose > ol > li {
          list-style-type: decimal;
        }

        .prose strong,
        .prose b {
          font-weight: 800;
        }

        .prose em {
          font-style: italic;
        }

        .prose s {
          text-decoration: line-through;
        }

        /* Dark mode support for prose */
        .dark .prose h1,
        .dark .prose h2 {
          color: inherit;
        }
      `}</style>
    </div>
  )
}