"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import { CustomImage } from '@/lib/tiptap-image-extension'
import { Spoiler } from '@/lib/tiptap-spoiler-extension'
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { useEffect, useState, useRef } from "react"
import { Input } from "@/components/ui/input"

interface WysiwygEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function WysiwygEditor({ value, onChange, placeholder, className }: WysiwygEditorProps) {
  const [selectedImageAttrs, setSelectedImageAttrs] = useState<{ src?: string; align?: string; width?: string; height?: string } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const TableConfigured = Table.configure({
    resizable: true,
    HTMLAttributes: { class: 'tiptap-table' },
  })

  const TableCellExtended = TableCell.extend({
    addAttributes() {
      return {
        // @ts-ignore parent provided by TipTap
        ...this.parent?.(),
        backgroundColor: {
          default: null,
          parseHTML: (element: any) => {
            const bg = element.getAttribute('data-bg') || element.style?.backgroundColor || null
            // Filter out rgba(255, 255, 255, 0.2) and similar default backgrounds
            if (bg && (bg.includes('rgba(255, 255, 255') || bg.includes('rgba(255,255,255'))) {
              return null
            }
            return bg
          },
          renderHTML: (attributes: any) => {
            const { backgroundColor } = attributes
            // Don't render backgroundColor if it's a default transparent white
            if (!backgroundColor || backgroundColor.includes('rgba(255, 255, 255') || backgroundColor.includes('rgba(255,255,255')) {
              return {}
            }
            return {
              style: `background-color: ${backgroundColor};`,
              'data-bg': backgroundColor,
            }
          }
        },
      }
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableConfigured,
      TableRow,
      TableHeader,
      TableCellExtended,
      CustomImage,
      Spoiler,
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }: { editor: any }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  })

  // Track image selection and highlight selected images
  useEffect(() => {
    if (!editor) return

    const updateImageSelection = () => {
      const { state, view } = editor
      const { selection } = state
      const { $from, $to } = selection
      
      // Remove highlight from all images first
      const allImages = view.dom.querySelectorAll('img')
      allImages.forEach((img: Element) => {
        img.classList.remove('image-selected')
      })
      
      // Check if selection contains an image node
      let imageNode = null
      let imagePos = null
      state.doc.nodesBetween($from.pos, $to.pos, (node: any, pos: number) => {
        if (node.type.name === 'image') {
          imageNode = { node, pos }
          imagePos = pos
        }
      })
      
      // Also check if cursor is right after an image
      if (!imageNode && $from.pos > 0) {
        const prevNode = state.doc.nodeAt($from.pos - 1)
        if (prevNode && prevNode.type.name === 'image') {
          imageNode = { node: prevNode, pos: $from.pos - 1 }
          imagePos = $from.pos - 1
        }
      }
      
      // Also check if cursor is right before an image
      if (!imageNode && $from.pos < state.doc.content.size) {
        const nextNode = state.doc.nodeAt($from.pos)
        if (nextNode && nextNode.type.name === 'image') {
          imageNode = { node: nextNode, pos: $from.pos }
          imagePos = $from.pos
        }
      }
      
      if (imageNode && imagePos !== null) {
        // Highlight the selected image
        const nodeView = view.nodeDOM(imagePos)
        if (nodeView && nodeView instanceof HTMLElement) {
          nodeView.classList.add('image-selected')
        }
        
        // Extract numeric values from width/height (remove "px" for display)
        const widthValue = imageNode.node.attrs.width 
          ? imageNode.node.attrs.width.replace('px', '').replace('%', '')
          : ''
        const heightValue = imageNode.node.attrs.height 
          ? imageNode.node.attrs.height.replace('px', '').replace('%', '')
          : ''
        
        setSelectedImageAttrs({
          src: imageNode.node.attrs.src,
          align: imageNode.node.attrs.align || 'left',
          width: widthValue,
          height: heightValue,
        })
      } else {
        setSelectedImageAttrs(null)
      }
    }

    // Handle image clicks to ensure proper selection
    const handleImageClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'IMG') {
        const { view } = editor
        const pos = view.posAtDOM(target, 0)
        if (pos !== null && pos !== undefined) {
          const $pos = view.state.doc.resolve(pos)
          const node = $pos.nodeAfter || $pos.nodeBefore
          if (node && node.type.name === 'image') {
            const imagePos = node === $pos.nodeAfter ? $pos.pos : $pos.pos - 1
            // Select the image node - TipTap will handle highlighting via selectionUpdate
            editor.commands.setNodeSelection(imagePos)
          }
        }
      }
    }

    editor.on('selectionUpdate', updateImageSelection)
    editor.on('update', updateImageSelection)
    
    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleImageClick)

    return () => {
      editor.off('selectionUpdate', updateImageSelection)
      editor.off('update', updateImageSelection)
      editorElement.removeEventListener('click', handleImageClick)
    }
  }, [editor])

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

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const { user } = await import('@/lib/database').then(m => m.getCurrentUser())
      if (!user) {
        throw new Error('User not authenticated')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'session-notes-images')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to upload image')
      }

      editor?.chain().focus().setImage({ src: result.url }).run()
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

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
      <div className="flex flex-wrap gap-1 p-2 border rounded-t-md bg-card">
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
        {/* Table controls */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="h-8 w-8 p-0"
          title="Insert Table"
        >
          <Icon icon="lucide:table" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="h-8 w-8 p-0"
          title="Add Column"
        >
          <Icon icon="lucide:columns-3" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          className="h-8 w-8 p-0"
          title="Add Column Before"
        >
          <Icon icon="lucide:panel-left" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="h-8 w-8 p-0"
          title="Add Row"
        >
          <Icon icon="lucide:rows-3" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          className="h-8 w-8 p-0"
          title="Add Row Before"
        >
          <Icon icon="lucide:panel-top" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('tableHeader') ? 'bg-accent' : ''}`}
          title="Toggle Header Row"
        >
          <Icon icon="lucide:layout-panel-top" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          className="h-8 w-8 p-0"
          title="Toggle Header Column"
        >
          <Icon icon="lucide:layout-panel-left" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const color = prompt('Enter a background color (e.g. #f1f5f9 or rgb(241,245,249))')
            if (color) editor.chain().focus().setCellAttribute('backgroundColor', color).run()
          }}
          className="h-8 w-8 p-0"
          title="Set Cell Background"
        >
          <Icon icon="lucide:paintbrush" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}
          className="h-8 w-8 p-0"
          title="Clear Cell Background"
        >
          <Icon icon="lucide:eraser" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        {/* Delete row/column/table */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="h-8 w-8 p-0"
          title="Delete Column"
        >
          <Icon icon="lucide:trash-2" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="h-8 w-8 p-0"
          title="Delete Row"
        >
          <Icon icon="lucide:trash" className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().deleteTable().run()}
          className="h-8 w-8 p-0"
          title="Delete Table"
        >
          <Icon icon="lucide:table-properties" className="w-4 h-4" />
        </Button>
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
        <div className="w-px h-6 bg-border mx-1" />
        {/* Spoiler button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleSpoiler().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('spoiler') ? 'bg-accent' : ''}`}
          title="Toggle Spoiler"
        >
          <Icon icon="lucide:eye-off" className="w-4 h-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        {/* Image controls */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
          id="wysiwygImageInput"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className="h-8 w-8 p-0"
          title="Insert Image"
        >
          {uploadingImage ? (
            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
          ) : (
            <Icon icon="lucide:image" className="w-4 h-4" />
          )}
        </Button>
        {/* Image alignment controls (shown when image is selected) */}
        {selectedImageAttrs && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setImageAlign('left').run()}
              className={`h-8 w-8 p-0 ${selectedImageAttrs.align === 'left' ? 'bg-accent' : ''}`}
              title="Align Left"
            >
              <Icon icon="lucide:align-left" className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setImageAlign('center').run()}
              className={`h-8 w-8 p-0 ${selectedImageAttrs.align === 'center' ? 'bg-accent' : ''}`}
              title="Align Center"
            >
              <Icon icon="lucide:align-center" className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().setImageAlign('right').run()}
              className={`h-8 w-8 p-0 ${selectedImageAttrs.align === 'right' ? 'bg-accent' : ''}`}
              title="Align Right"
            >
              <Icon icon="lucide:align-right" className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <label className="text-xs text-muted-foreground">W:</label>
              <Input
                type="text"
                placeholder="auto"
                value={selectedImageAttrs.width || ''}
                onChange={(e) => {
                  const width = e.target.value
                  // Allow empty string or any number (with or without px)
                  // Allow typing any value, validate and apply on blur
                  setSelectedImageAttrs(prev => prev ? { ...prev, width } : null)
                }}
                onBlur={(e) => {
                  const width = e.target.value.trim()
                  // Extract numeric value (remove px, %, etc. and keep only digits)
                  const numericValue = width.replace(/[^\d]/g, '')
                  // Update the image node with the numeric value
                  if (numericValue) {
                    editor?.chain().focus().setImageSize(numericValue, selectedImageAttrs.height || undefined).run()
                    // Update state to show just the number
                    setSelectedImageAttrs(prev => prev ? { ...prev, width: numericValue } : null)
                  } else {
                    // Clear width if empty
                    editor?.chain().focus().setImageSize('', selectedImageAttrs.height || undefined).run()
                    setSelectedImageAttrs(prev => prev ? { ...prev, width: '' } : null)
                  }
                }}
                onKeyDown={(e) => {
                  // Allow Enter to apply changes
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="h-6 w-20 text-xs"
              />
              <span className="text-xs text-muted-foreground">px</span>
              <label className="text-xs text-muted-foreground ml-1">H:</label>
              <Input
                type="text"
                placeholder="auto"
                value={selectedImageAttrs.height || ''}
                onChange={(e) => {
                  const height = e.target.value
                  // Allow empty string or any number (with or without px)
                  // Allow typing any value, validate and apply on blur
                  setSelectedImageAttrs(prev => prev ? { ...prev, height } : null)
                }}
                onBlur={(e) => {
                  const height = e.target.value.trim()
                  // Extract numeric value (remove px, %, etc. and keep only digits)
                  const numericValue = height.replace(/[^\d]/g, '')
                  // Update the image node with the numeric value
                  if (numericValue) {
                    editor?.chain().focus().setImageSize(selectedImageAttrs.width || '', numericValue).run()
                    // Update state to show just the number
                    setSelectedImageAttrs(prev => prev ? { ...prev, height: numericValue } : null)
                  } else {
                    // Clear height if empty
                    editor?.chain().focus().setImageSize(selectedImageAttrs.width || '', '').run()
                    setSelectedImageAttrs(prev => prev ? { ...prev, height: '' } : null)
                  }
                }}
                onKeyDown={(e) => {
                  // Allow Enter to apply changes
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="h-6 w-20 text-xs"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
          </>
        )}
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

        .ProseMirror table {
          width: 100% !important;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0.75rem 0;
        }

        /* Force tables to use full width even if inline styles set widths */
        .ProseMirror table[style*="width"],
        .ProseMirror .tiptap-table[style*="width"] {
          width: 100% !important;
        }
        /* Allow column widths via colgroup when resizing; only force total table width */

        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid var(--border);
          padding: 6px 8px;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 0.9em;
          background-color: hsl(var(--card)) !important;
        }
        
        /* Override any inline background styles, especially rgba(255, 255, 255, 0.2) */
        .ProseMirror th[style*="background"],
        .ProseMirror td[style*="background"],
        .ProseMirror th[style*="rgba(255"],
        .ProseMirror td[style*="rgba(255"] {
          background-color: hsl(var(--card)) !important;
        }

        .ProseMirror th {
          font-weight: 600;
        }

        .ProseMirror .tableWrapper {
          margin: 0.75rem 0;
          overflow-x: auto;
        }

        /* Column resize handle */
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: rgba(148,163,184,0.6);
          pointer-events: none;
        }
        .ProseMirror th,
        .ProseMirror td {
          position: relative;
        }

        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(200, 200, 255, 0.35);
          pointer-events: none;
        }

        /* Prose output tables */
        .prose table {
          width: calc(100% - 1.5rem) !important;
          max-width: calc(100% - 1.5rem) !important;
          table-layout: fixed;
          margin: 0.75rem 0;
          background-color: var(--card);
          overflow: hidden;
        }

        .prose th,
        .prose td {
          border: 1px solid var(--border);
          padding: 6px 8px;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 0.9em;
          background-color: hsl(var(--card)) !important;
        }

        /* Force full-width for rendered tables but allow col/column widths */
        .prose table[style*="width"],
        .prose .tiptap-table[style*="width"] { width: calc(100% - 1.5rem) !important; }
        
        /* Override any inline background styles, especially rgba(255, 255, 255, 0.2) */
        .prose th[style*="background"],
        .prose td[style*="background"],
        .prose th[style*="rgba(255"],
        .prose td[style*="rgba(255"] {
          background-color: hsl(var(--card)) !important;
        }

        .prose th {
          font-weight: 600;
        }

        .prose th p {
          margin: 0;
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

        /* Image styling */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.75rem 0;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .ProseMirror img[data-align="left"] {
          float: left;
          margin-right: 1rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror img[data-align="right"] {
          float: right;
          margin-left: 1rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror img[data-align="center"] {
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .ProseMirror img.ProseMirror-selectednode,
        .ProseMirror img.image-selected {
          outline: 3px solid hsl(var(--ring));
          outline-offset: 3px;
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }

        /* Image styling in view mode */
        .prose img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0.75rem 0 !important;
          object-fit: contain;
          border-radius: 8px !important;
          border: 1px solid var(--border);
        }

        .prose img[data-align="left"] {
          float: left !important;
          margin-right: 1rem !important;
          margin-bottom: 0.75rem !important;
          display: block !important;
        }

        .prose img[data-align="right"] {
          float: right !important;
          margin-left: 1rem !important;
          margin-bottom: 0.75rem !important;
          display: block !important;
        }

        .prose img[data-align="center"] {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          float: none !important;
        }

        /* Ensure images without data-align attribute are visible */
        .prose img:not([data-align]) {
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
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

        /* Spoiler styling in editor - visible with background color */
        .ProseMirror spoiler {
          background-color: rgba(201 168 112 / 0.15);
          border: 1px solid rgba(201 168 112 / 0.2);
          color: var(--foreground);
          border-radius: 4px;
          display: inline;
          cursor: text;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          pointer-events: auto;
          position: relative;
        }
        
        .ProseMirror spoiler * {
          color: var(--foreground);
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