"use client"

interface RichTextDisplayProps {
  content: string
  className?: string
}

export function RichTextDisplay({ content, className = "" }: RichTextDisplayProps) {
  if (!content) return null

  // Convert markdown-like formatting to HTML
  const formatText = (text: string) => {
    return text
      .split("\n")
      .map((line, index) => {
        // Handle bold text
        let formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

        // Handle bullet points
        if (formattedLine.trim().startsWith("- ")) {
          formattedLine = "<li>" + formattedLine.substring(2) + "</li>"
        }

        return formattedLine
      })
      .join("\n")
  }

  const formattedContent = formatText(content)
  const lines = formattedContent.split("\n")

  return (
    <div className={`text-sm whitespace-pre-wrap ${className}`}>
      {lines.map((line, index) => {
        if (line.startsWith("<li>")) {
          // Group consecutive list items
          const listItems = []
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
        } else {
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: line || "<br>" }}
              className={line.trim() === "" ? "h-4" : ""}
            />
          )
        }
      })}
    </div>
  )
}
