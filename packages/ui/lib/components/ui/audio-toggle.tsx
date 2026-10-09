import { cn } from '../../utils'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import * as React from 'react'

import { Button } from './button'

interface AudioToggleProps {
  isAudioEnabled: boolean
  onAudioToggle: (enabled: boolean) => void
  isMicActive?: boolean
  onMicToggle?: () => void
  isSpeaking?: boolean
  className?: string
}

const AudioToggle: React.FC<AudioToggleProps> = ({
  isAudioEnabled,
  onAudioToggle,
  isMicActive = false,
  onMicToggle,
  isSpeaking = false,
  className,
}) => {
  const [hasAudioSupport, setHasAudioSupport] = React.useState(false)

  React.useEffect(() => {
    const checkAudioSupport = async () => {
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          setHasAudioSupport(true)
        } else {
          setHasAudioSupport(false)
        }
      } catch (error) {
        console.warn('Audio not supported:', error)
        setHasAudioSupport(false)
      }
    }

    checkAudioSupport()
  }, [])

  if (!hasAudioSupport) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        onClick={() => onAudioToggle(!isAudioEnabled)}
        variant={isAudioEnabled ? 'primary' : 'outline'}
        size="sm"
        className={cn(
          'flex items-center gap-2 transition-all',
          isAudioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
        )}>
        {isAudioEnabled ? (
          <>
            <Volume2 className="size-4" />
            <span className="hidden sm:inline">Audio On</span>
          </>
        ) : (
          <>
            <VolumeX className="size-4" />
            <span className="hidden sm:inline">Audio Off</span>
          </>
        )}
      </Button>

      {isAudioEnabled && onMicToggle && (
        <Button
          onClick={onMicToggle}
          variant={isMicActive ? 'destructive' : 'outline'}
          size="sm"
          className={cn(
            'flex items-center gap-2 transition-all',
            isMicActive && 'animate-pulse',
            isSpeaking && 'ring-2 ring-blue-500'
          )}>
          {isMicActive ? (
            <>
              <Mic className="size-4" />
              <span className="hidden sm:inline">Recording</span>
            </>
          ) : (
            <>
              <MicOff className="size-4" />
              <span className="hidden sm:inline">Mic Off</span>
            </>
          )}
        </Button>
      )}

      {isAudioEnabled && isSpeaking && (
        <div className="flex items-center gap-1 text-blue-500">
          <div className="size-2 animate-pulse rounded-full bg-blue-500" />
          <span className="text-sm font-medium">AI Speaking</span>
        </div>
      )}
    </div>
  )
}

export { AudioToggle }
export default AudioToggle
