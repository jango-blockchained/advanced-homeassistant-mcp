import { useState, useEffect } from 'react'
import { Library, Trash2, Play, Music } from 'lucide-react'
import { useAuroraStore } from '../lib/store'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { formatDuration } from '../lib/utils'

export default function TimelineLibrary() {
  const { timelines, setTimelines, setCurrentTimeline, setError } = useAuroraStore()
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadTimelines()
  }, [])

  const loadTimelines = async () => {
    try {
      const data = await api.getTimelines()
      setTimelines(data)
    } catch (error) {
      console.error('Failed to load timelines:', error)
    }
  }

  const handlePlay = async (timelineId: string) => {
    try {
      await api.play(timelineId)
      const timeline = timelines.find((t: any) => t.id === timelineId)
      if (timeline) {
        setCurrentTimeline(timeline)
      }
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to play timeline')
    }
  }

  const handleDelete = async (timelineId: string) => {
    if (!confirm('Delete this timeline?')) return
    
    setDeleting(timelineId)
    try {
      await api.deleteTimeline(timelineId)
      await loadTimelines()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete timeline')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card className="tech-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Library className="w-5 h-5 text-primary" />
          Timeline Library
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelines.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No saved timelines. Create your first light show!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timelines.map((timeline: any) => (
              <div
                key={timeline.id}
                className="p-3 bg-card border rounded-lg hover:border-primary/50 transition-all light-reactive"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate light-glow">
                      {timeline.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {timeline.audioFile}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-mono text-foreground">
                      {formatDuration(timeline.duration)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Devices:</span>
                    <span className="font-mono text-foreground">
                      {timeline.deviceCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Intensity:</span>
                    <span className="font-mono text-foreground">
                      {Math.round(timeline.settings.intensity * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePlay(timeline.id)}
                    size="sm"
                    className="flex-1 light-beat"
                  >
                    <Play className="w-3 h-3" />
                    Play
                  </Button>
                  <Button
                    onClick={() => handleDelete(timeline.id)}
                    disabled={deleting === timeline.id}
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
