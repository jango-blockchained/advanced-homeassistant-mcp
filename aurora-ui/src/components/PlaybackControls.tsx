import { Play, Pause, Square, Loader2, Sparkles } from 'lucide-react'
import { useAuroraStore } from '../lib/store'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { formatDuration } from '../lib/utils'

export default function PlaybackControls() {
  const {
    audioFile,
    selectedDevices,
    intensity,
    colorMapping,
    beatSync,
    smoothTransitions,
    playbackStatus,
    isRendering,
    renderProgress,
    setRendering,
    setError,
    setCurrentTimeline,
  } = useAuroraStore()

  const handleRender = async () => {
    if (!audioFile) {
      setError('Please select an audio file')
      return
    }
    if (selectedDevices.size === 0) {
      setError('Please select at least one device')
      return
    }

    setRendering(true, 0)
    
    try {
      const progressInterval = setInterval(() => {
        setRendering(true, Math.min(90, renderProgress + 10))
      }, 500)

      const result = await api.renderTimeline({
        audioFile,
        devices: Array.from(selectedDevices),
        intensity,
        colorMapping,
        beatSync,
        smoothTransitions,
      })

      clearInterval(progressInterval)
      setRendering(true, 100)
      
      const timelines = await api.getTimelines()
      const newTimeline = timelines.find((t: any) => t.id === result.timelineId)
      if (newTimeline) {
        setCurrentTimeline(newTimeline)
      }

      setError(null)
      setTimeout(() => setRendering(false, 0), 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to render timeline')
      setRendering(false, 0)
    }
  }

  const handlePlay = async () => {
    try {
      await api.play('current')
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start playback')
    }
  }

  const handlePause = async () => {
    try {
      await api.pause()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to pause')
    }
  }

  const handleResume = async () => {
    try {
      await api.resume()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resume')
    }
  }

  const handleStop = async () => {
    try {
      await api.stop()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop')
    }
  }

  const canRender = audioFile && selectedDevices.size > 0
  const isPlaying = playbackStatus.state === 'playing'
  const isPaused = playbackStatus.state === 'paused'

  return (
    <Card className="tech-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Playback Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render Button */}
        <div className="space-y-2">
          <Button
            onClick={handleRender}
            disabled={!canRender || isRendering}
            className={`w-full h-12 text-base ${isRendering ? 'light-intense' : ''}`}
          >
            {isRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Rendering... {Math.round(renderProgress)}%
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze & Render Timeline
              </>
            )}
          </Button>

          {isRendering && (
            <Progress value={renderProgress} className="h-1.5 light-glow" />
          )}

          {!canRender && (
            <p className="text-xs text-center text-muted-foreground">
              Select audio file and devices to render
            </p>
          )}
        </div>

        {/* Playback Timeline */}
        {playbackStatus.duration > 0 && (
          <div className={`space-y-2 p-3 bg-accent/50 border rounded-lg ${isPlaying ? 'light-beat' : ''}`}>
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-foreground">
                {formatDuration(playbackStatus.currentTime)}
              </span>
              <span className="text-muted-foreground">
                {formatDuration(playbackStatus.duration)}
              </span>
            </div>
            <Progress 
              value={(playbackStatus.currentTime / playbackStatus.duration) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Transport Controls */}
        <div className="flex gap-2">
          {!isPlaying && !isPaused && (
            <Button
              onClick={handlePlay}
              disabled={playbackStatus.state === 'idle'}
              className="flex-1 light-reactive"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Play
            </Button>
          )}

          {isPlaying && (
            <Button
              onClick={handlePause}
              variant="secondary"
              className="flex-1 light-beat"
            >
              <Pause className="w-5 h-5" />
              Pause
            </Button>
          )}

          {isPaused && (
            <Button
              onClick={handleResume}
              className="flex-1 light-smooth"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Resume
            </Button>
          )}

          {(isPlaying || isPaused) && (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-5 h-5" fill="currentColor" />
              Stop
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
