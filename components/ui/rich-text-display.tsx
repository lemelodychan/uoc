"use client"

import { useEffect, useRef, useState } from "react"

interface RichTextDisplayProps {
  content: string
  className?: string
  fontSize?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl'
  maxLines?: number
}

export function RichTextDisplay({ content, className = "", fontSize, maxLines }: RichTextDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const looksLikeHtml = content ? /<\w+[^>]*>/.test(content) : false

  // Spoiler click handler (HTML only)
  useEffect(() => {
    if (!containerRef.current || !looksLikeHtml) return
    const handleSpoilerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'SPOILER' || target.closest('spoiler')) {
        const spoiler = target.tagName === 'SPOILER' ? target : target.closest('spoiler')
        if (spoiler && !spoiler.classList.contains('revealed')) {
          spoiler.classList.add('revealed')
        }
      }
    }
    const container = containerRef.current
    container.addEventListener('click', handleSpoilerClick)
    return () => { container.removeEventListener('click', handleSpoilerClick) }
  }, [content, looksLikeHtml])

  // Detect whether content actually overflows when clamped
  useEffect(() => {
    if (!maxLines || !containerRef.current || isExpanded) return
    setIsTruncated(containerRef.current.scrollHeight > containerRef.current.clientHeight + 2)
  }, [content, maxLines, isExpanded])

  if (!content) return null

  // Map fontSize to Tailwind text size classes
  const getFontSizeClasses = () => {
    if (fontSize) {
      const textSizeMap: Record<string, string> = {
        'xs': 'text-xs',
        'sm': 'text-sm',
        'base': 'text-base',
        'md': 'text-base',
        'lg': 'text-lg',
        'xl': 'text-xl',
        '2xl': 'text-2xl'
      }
      return textSizeMap[fontSize] || 'text-sm'
    }
    return 'text-sm'
  }

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

  const extractFontSizeFromClassName = (className: string): string | null => {
    const sizeMatch = className.match(/\btext-(xs|sm|base|md|lg|xl|2xl)\b/)
    return sizeMatch ? sizeMatch[1] : null
  }

  const finalFontSize = fontSize || extractFontSizeFromClassName(className) || 'sm'
  const fontSizeClasses = getFontSizeClasses()
  const proseModifier = getProseModifier()
  const cleanedClassName = className.replace(/\btext-(xs|sm|base|md|lg|xl|2xl)\b/g, '').trim()

  const clampStyle: React.CSSProperties = maxLines && !isExpanded ? {
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical',
  } : {}

  const toggleButton = maxLines && isTruncated ? (
    <button
      onClick={() => setIsExpanded(e => !e)}
      className="text-xs text-muted-foreground hover:text-foreground mt-1 block w-fit"
    >
      {isExpanded ? 'Show less' : 'Read more'}
    </button>
  ) : null

  if (looksLikeHtml) {
    const proseClass = fontSize ? `prose ${proseModifier}` : 'prose'
    const processedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

    return (
      <>
        <div
          ref={containerRef}
          className={`${proseClass} ${fontSizeClasses} ${cleanedClassName}`}
          style={{ ...clampStyle, ...(fontSize ? { fontSize: 'inherit' } : {}) }}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
        {toggleButton}
      </>
    )
  }

  // Fallback: plain text with markdown-like formatting
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
  const textSizeClass = fontSize ? `text-${fontSize}` : (extractFontSizeFromClassName(className) ? `text-${extractFontSizeFromClassName(className)}` : 'text-sm')

  return (
    <>
      <div ref={containerRef} className={`${textSizeClass} whitespace-pre-wrap ${cleanedClassName}`} style={clampStyle}>
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
      {toggleButton}
    </>
  )
}
