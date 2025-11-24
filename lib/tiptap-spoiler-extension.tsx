import { Node, mergeAttributes } from '@tiptap/core'

export const Spoiler = Node.create({
  name: 'spoiler',

  group: 'inline',

  inline: true,

  content: 'inline*',

  selectable: false,

  atom: false,

  addAttributes() {
    return {
      class: {
        default: 'spoiler-content',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'spoiler',
      },
      {
        tag: 'span[data-spoiler]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['spoiler', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setSpoiler: () => ({ commands, state, tr, dispatch }) => {
        const { selection } = state
        const { from, to } = selection
        
        if (dispatch) {
          // Get the selected content
          const selectedContent = state.doc.slice(from, to)
          
          // Create a spoiler node with the selected content
          const spoilerNode = this.type.create({}, selectedContent.content)
          
          // Replace the selection with the spoiler node
          tr.replaceSelectionWith(spoilerNode)
          dispatch(tr)
        }
        
        return true
      },
      toggleSpoiler: () => ({ commands, state, tr, dispatch }) => {
        const { selection } = state
        const { $from } = selection
        
        // Check if we're inside a spoiler by checking parent nodes
        let depth = $from.depth
        let spoilerPos = null
        let spoilerNode = null
        
        while (depth > 0) {
          const node = $from.node(depth)
          if (node.type.name === this.name) {
            spoilerNode = node
            spoilerPos = $from.before(depth)
            break
          }
          depth--
        }
        
        if (spoilerNode && spoilerPos !== null && dispatch) {
          // We're inside a spoiler, lift it (unwrap)
          const spoilerStart = spoilerPos + 1
          const spoilerEnd = spoilerPos + spoilerNode.nodeSize - 1
          
          // Extract the content from the spoiler
          const spoilerContent = state.doc.slice(spoilerStart, spoilerEnd)
          
          // Replace the spoiler with its content
          tr.replaceWith(spoilerPos, spoilerPos + spoilerNode.nodeSize, spoilerContent.content)
          dispatch(tr)
          return true
        }
        
        // Not inside a spoiler, wrap the selection
        const { from, to } = selection
        let wrapFrom = from
        let wrapTo = to
        
        if (from === to) {
          // No selection, select current word
          const wordStart = $from.start()
          const wordEnd = $from.end()
          
          if (wordStart < wordEnd) {
            wrapFrom = wordStart
            wrapTo = wordEnd
          }
        }
        
        if (dispatch) {
          // Get the content to wrap
          const contentToWrap = state.doc.slice(wrapFrom, wrapTo)
          
          // Create a spoiler node with the content
          const spoilerNode = this.type.create({}, contentToWrap.content)
          
          // Replace the selection with the spoiler node
          tr.replaceSelectionWith(spoilerNode)
          dispatch(tr)
        }
        
        return true
      },
      unsetSpoiler: () => ({ commands }) => {
        return commands.lift(this.name).run()
      },
    }
  },
})
