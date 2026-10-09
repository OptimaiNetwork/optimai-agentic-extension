'use client'

import { animate } from 'framer-motion'
import { useEffect, useState } from 'react'

const delimiter = ' ' // or " " to split by word

interface UseAnimatedTextOptions {
  onComplete?: () => void
  delay?: number
  paused?: boolean
}

export function useAnimatedText(
  text: string,
  { onComplete, delay, paused }: UseAnimatedTextOptions
) {
  const [cursor, setCursor] = useState(0)
  const [startingCursor, setStartingCursor] = useState(0)
  const [prevText, setPrevText] = useState(text)

  if (prevText !== text) {
    setPrevText(text)
    setStartingCursor(text.startsWith(prevText) ? cursor : 0)
  }

  useEffect(() => {
    if (!text) {
      return
    }
    const targetLength = text.split(delimiter).length
    const wordsToAnimate = targetLength - startingCursor
    // Base duration calculation: ~20ms per character, with min 0.5s and max 8s
    const duration = Math.max(0.1, Math.min(3.2, wordsToAnimate * 0.05))

    if (paused) {
      return
    }

    const controls = animate(startingCursor, targetLength, {
      duration,
      ease: 'easeOut',
      onUpdate(latest) {
        setCursor(Math.floor(latest))
      },
      onComplete() {
        onComplete?.()
      },
      delay,
    })

    return () => controls.stop()
  }, [startingCursor, text, delay, paused])

  return text.split(delimiter).slice(0, cursor).join(delimiter)
}
