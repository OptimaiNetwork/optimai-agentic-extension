import React, { useState, useEffect } from 'react'

interface ProgressiveTextProps {
  text: string
  progress: number
  isPlaying: boolean
  className?: string
}

export const ProgressiveText: React.FC<ProgressiveTextProps> = ({
  text,
  progress,
  isPlaying,
  className = '',
}) => {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!isPlaying) {
      // If not playing, show full text immediately
      setDisplayedText(text)
      return
    }

    // Calculate how much text to show based on progress
    const words = text.split(' ')
    const targetWordCount = Math.ceil(words.length * progress)
    const wordsToShow = words.slice(0, targetWordCount)

    // Add a typing cursor effect for the current word being revealed
    let newDisplayedText = wordsToShow.join(' ')

    // If we're in the middle of revealing text and not at the end
    if (progress < 1 && progress > 0 && targetWordCount < words.length) {
      newDisplayedText += ' '
    }

    setDisplayedText(newDisplayedText)
  }, [text, progress, isPlaying])

  return (
    <div className={className}>
      <span>{displayedText}</span>
      {isPlaying && progress < 1 && <span className="animate-pulse text-gray-400">|</span>}
    </div>
  )
}
