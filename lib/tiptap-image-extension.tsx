import Image from '@tiptap/extension-image'
import { Plugin } from '@tiptap/pm/state'
import { getCurrentUser } from '@/lib/database'

// Helper function to upload image
async function uploadImage(file: File): Promise<string> {
  const { user } = await getCurrentUser()
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

  return result.url
}

export const CustomImage = Image.extend({
  name: 'image',
  
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute('width') || element.style?.width
          if (!width) return null
          // Convert to pixels if it's a number
          if (/^\d+$/.test(width)) {
            return `${width}px`
          }
          return width
        },
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          // Ensure px suffix if it's just a number
          const width = attributes.width.includes('px') || attributes.width.includes('%') 
            ? attributes.width 
            : `${attributes.width}px`
          return {
            width,
            style: `width: ${width};`,
          }
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute('height') || element.style?.height
          if (!height) return null
          // Convert to pixels if it's a number
          if (/^\d+$/.test(height)) {
            return `${height}px`
          }
          return height
        },
        renderHTML: attributes => {
          if (!attributes.height) {
            return {}
          }
          // Ensure px suffix if it's just a number
          const height = attributes.height.includes('px') || attributes.height.includes('%')
            ? attributes.height
            : `${attributes.height}px`
          return {
            height,
            style: `height: ${height};`,
          }
        },
      },
      align: {
        default: 'left',
        parseHTML: element => {
          const align = element.getAttribute('data-align') || 
                       element.style.float || 
                       element.style.textAlign ||
                       'left'
          return align === 'right' ? 'right' : align === 'center' ? 'center' : 'left'
        },
        renderHTML: attributes => {
          if (!attributes.align || attributes.align === 'left') {
            return {}
          }
          return {
            'data-align': attributes.align,
            style: `display: block; margin: 0 auto; ${attributes.align === 'right' ? 'float: right;' : ''}`,
          }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImage: (options: { src: string; alt?: string; title?: string; width?: string; height?: string; align?: 'left' | 'center' | 'right' }) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        }
      },
      setImageAlign: (align: 'left' | 'center' | 'right') => {
        return ({ tr, state, dispatch }) => {
          const { selection } = state
          const { $from, $to } = selection
          
          let imagePos = null
          let imageNode = null
          
          // Find image node in selection
          state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
            if (node.type.name === 'image') {
              imageNode = node
              imagePos = pos
            }
          })
          
          // Check if cursor is right after an image
          if (!imageNode && $from.pos > 0) {
            const prevNode = state.doc.nodeAt($from.pos - 1)
            if (prevNode && prevNode.type.name === 'image') {
              imageNode = prevNode
              imagePos = $from.pos - 1
            }
          }
          
          if (imageNode && imagePos !== null) {
            if (dispatch) {
              tr.setNodeMarkup(imagePos, undefined, {
                ...imageNode.attrs,
                align,
              })
              dispatch(tr)
            }
            return true
          }
          return false
        }
      },
      setImageSize: (width: string, height?: string) => {
        return ({ tr, state, dispatch }) => {
          const { selection } = state
          const { $from, $to } = selection
          
          let imagePos = null
          let imageNode = null
          
          // Find image node in selection
          state.doc.nodesBetween($from.pos, $to.pos, (node: any, pos: number) => {
            if (node.type.name === 'image') {
              imageNode = node
              imagePos = pos
            }
          })
          
          // Check if cursor is right after an image
          if (!imageNode && $from.pos > 0) {
            const prevNode = state.doc.nodeAt($from.pos - 1)
            if (prevNode && prevNode.type.name === 'image') {
              imageNode = prevNode
              imagePos = $from.pos - 1
            }
          }
          
          if (imageNode && imagePos !== null) {
            if (dispatch) {
              const newAttrs: any = {
                ...imageNode.attrs,
              }
              
              // Set width - use null if empty string
              if (width === '' || width === 'auto') {
                newAttrs.width = null
              } else if (width) {
                newAttrs.width = width.includes('px') ? width : `${width}px`
              }
              
              // Set height - use null if empty string or undefined, otherwise keep existing or set new
              if (height === '' || height === 'auto' || height === undefined) {
                // Only clear height if explicitly empty, otherwise keep existing
                if (height === '' || height === 'auto') {
                  newAttrs.height = null
                }
              } else if (height) {
                newAttrs.height = height.includes('px') ? height : `${height}px`
              }
              
              tr.setNodeMarkup(imagePos, undefined, newAttrs)
              dispatch(tr)
            }
            return true
          }
          return false
        }
      },
    }
  },

  addPasteRules() {
    return [
      {
        find: /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/gi,
        handler: ({ state, range, match }) => {
          const [url] = match
          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ src: url }))
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() || []),
      // Handle paste events for images
      new Plugin({
        key: 'imagePasteHandler',
        props: {
          handlePaste: (view, event, slice) => {
            const items = Array.from(event.clipboardData?.items || [])
            const imageItem = items.find(item => item.type.indexOf('image') !== -1)
            
            if (imageItem) {
              event.preventDefault()
              const file = imageItem.getAsFile()
              if (file) {
                uploadImage(file)
                  .then(url => {
                    const { state, dispatch } = view
                    const { schema } = state
                    const imageNode = schema.nodes.image.create({ src: url })
                    const transaction = state.tr.replaceSelectionWith(imageNode)
                    dispatch(transaction)
                  })
                  .catch(error => {
                    console.error('Failed to upload image:', error)
                    alert(`Failed to upload image: ${error.message}`)
                  })
                return true
              }
            }
            
            return false
          },
          handleDrop: (view, event, slice, moved) => {
            if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length) {
              const file = event.dataTransfer.files[0]
              if (file.type.indexOf('image') !== -1) {
                event.preventDefault()
                uploadImage(file)
                  .then(url => {
                    const { state, dispatch } = view
                    const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                    if (coordinates) {
                      const { schema } = state
                      const imageNode = schema.nodes.image.create({ src: url })
                      const transaction = state.tr.insert(coordinates.pos, imageNode)
                      dispatch(transaction)
                    }
                  })
                  .catch(error => {
                    console.error('Failed to upload image:', error)
                    alert(`Failed to upload image: ${error.message}`)
                  })
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})

