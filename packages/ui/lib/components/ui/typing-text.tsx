import { useAnimatedText } from '@extension/shared'

interface TypingTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  delay?: number
  onComplete?: () => void
}

function TypingText({ text, delay, onComplete, ...props }: TypingTextProps) {
  const displayedText = useAnimatedText(text, { onComplete, delay })

  return <span {...props}>{displayedText}</span>
}

export { TypingText }
