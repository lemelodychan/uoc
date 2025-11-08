"use client"

interface RichTextDisplayProps {
  content: string
  className?: string
  fontSize?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl'
}

export function RichTextDisplay({ content, className = "", fontSize }: RichTextDisplayProps) {
  if (!content) return null

  // Map fontSize to Tailwind text size classes
  const getFontSizeClasses = () => {
    if (fontSize) {
      const textSizeMap: Record<string, string> = {
        'xs': 'text-xs',
        'sm': 'text-sm',
        'base': 'text-base',
        'md': 'text-base', // md maps to base
        'lg': 'text-lg',
        'xl': 'text-xl',
        '2xl': 'text-2xl'
      }
      return textSizeMap[fontSize] || 'text-sm'
    }
    return 'text-sm' // default
  }
  
  // Get prose modifier class if available (for Tailwind Typography plugin)
  const getProseModifier = () => {
    if (fontSize) {
      const proseMap: Record<string, string> = {
        'xs': 'prose-xs',
        'sm': 'prose-sm',
        'base': 'prose-base',
        'md': 'prose-base',
        'lg': 'prose-lg',
        'xl': 'prose-xl',
        '2xl': 'prose-2xl'
      }
      return proseMap[fontSize] || 'prose-sm'
    }
    return 'prose-sm'
  }

  // Extract font size from className if fontSize prop not provided
  const extractFontSizeFromClassName = (className: string): string | null => {
    const sizeMatch = className.match(/\btext-(xs|sm|base|md|lg|xl|2xl)\b/)
    return sizeMatch ? sizeMatch[1] : null
  }

  // Determine final font size
  const finalFontSize = fontSize || extractFontSizeFromClassName(className) || 'sm'
  const fontSizeClasses = getFontSizeClasses()
  const proseModifier = getProseModifier()
  
  // Remove text size classes from className to avoid conflicts
  const cleanedClassName = className.replace(/\btext-(xs|sm|base|md|lg|xl|2xl)\b/g, '').trim()

  // If content appears to be HTML (from TipTap), render as-is inside prose container
  const looksLikeHtml = /<\w+[^>]*>/.test(content)
  if (looksLikeHtml) {
    // Use prose modifier if fontSize is specified, otherwise use default prose
    const proseClass = fontSize ? `prose ${proseModifier}` : 'prose'
    return (
      <div 
        className={`${proseClass} ${fontSizeClasses} ${cleanedClassName}`}
        style={fontSize ? { fontSize: 'inherit' } : undefined}
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    )
  }

  // Fallback: convert simple markdown-like formatting to HTML
  const formatText = (text: string) => {
    return text
      .split("\n")
      .map((line) => {
        let formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        if (formattedLine.trim().startsWith("- ")) {
          formattedLine = "<li>" + formattedLine.substring(2) + "</li>"
        }
        return formattedLine
      })
      .join("\n")
  }

  const formattedContent = formatText(content)
  const lines = formattedContent.split("\n")

  // For plain text, use the fontSize directly
  const textSizeClass = fontSize ? `text-${fontSize}` : (extractFontSizeFromClassName(className) ? `text-${extractFontSizeFromClassName(className)}` : 'text-sm')

  return (
    <div className={`${textSizeClass} whitespace-pre-wrap ${cleanedClassName}`}>
      {lines.map((line, index) => {
        if (line.startsWith("<li>")) {
          const listItems = [] as string[]
          let currentIndex = index
          while (currentIndex < lines.length && lines[currentIndex].startsWith("<li>")) {
            listItems.push(lines[currentIndex])
            currentIndex++
          }
          if (index === 0 || !lines[index - 1].startsWith("<li>")) {
            return (
              <ul key={index} className="list-disc list-inside space-y-1 my-2 pl-1">
                {listItems.map((item, itemIndex) => (
                  <li key={itemIndex} dangerouslySetInnerHTML={{ __html: item.replace(/^<li>|<\/li>$/g, '') }} />
                ))}
              </ul>
            )
          }
          return null
        }
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: line || "<br>" }}
            className={line.trim() === "" ? "h-4" : ""}
          />
        )
      })}
    </div>
  )
}
