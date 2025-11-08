import { useState, useRef, useCallback } from 'react'
import { Upload, Link as LinkIcon, Music, Youtube, } from 'lucide-react'
import { useAuroraStore } from '../lib/store'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '../lib/utils'

export default function AudioInput() {
  const { audioFile, setAudioFile, setError } = useAuroraStore()
  const [isDragging, setIsDragging] = useState(false)
  const [inputMode, setInputMode] = useState<'file' | 'url' | 'youtube' | 'spotify'>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const audioFile = files.find(f => 
      f.type.startsWith('audio/') || 
      /\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name)
    )

    if (audioFile) {
      setAudioFile(audioFile.name, 'file')
      setError(null)
    } else {
      setError('Please drop an audio file')
    }
  }, [setAudioFile, setError])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file.name, 'file')
      setError(null)
    }
  }, [setAudioFile, setError])

  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) {
      setError('Please enter a URL')
      return
    }

    let source: 'url' | 'youtube' | 'spotify' = 'url'
    if (urlInput.includes('youtube.com') || urlInput.includes('youtu.be')) {
      source = 'youtube'
    } else if (urlInput.includes('spotify.com')) {
      source = 'spotify'
    }

    setAudioFile(urlInput, source)
    setError(null)
  }, [urlInput, setAudioFile, setError])

  return (
    <Card className="tech-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          Audio Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Mode Selector */}
        <div className="flex gap-2">
          <Button
            variant={inputMode === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInputMode('file')}
          >
            <Upload className="w-4 h-4" />
            File
          </Button>
          <Button
            variant={inputMode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInputMode('url')}
          >
            <LinkIcon className="w-4 h-4" />
            URL
          </Button>
          <Button
            variant={inputMode === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInputMode('youtube')}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </Button>
          <Button
            variant={inputMode === 'spotify' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setInputMode('spotify')}
          >
            <Music className="w-4 h-4" />
            Spotify
          </Button>
        </div>

        {/* File Upload Area */}
        {inputMode === 'file' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragging ? 'Drop file here' : 'Drop audio file or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground">
              WAV, MP3, FLAC, OGG, M4A
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* URL Input */}
        {(inputMode === 'url' || inputMode === 'youtube' || inputMode === 'spotify') && (
          <div className="space-y-2">
            <Input
              placeholder={
                inputMode === 'youtube' ? 'https://youtube.com/watch?v=...' :
                inputMode === 'spotify' ? 'https://open.spotify.com/track/...' :
                'https://example.com/audio.mp3'
              }
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              className="h-10"
            />
            <Button 
              onClick={handleUrlSubmit}
              className="w-full"
            >
              Load {inputMode}
            </Button>
          </div>
        )}

        {/* Selected File Display */}
        {audioFile && (
          <div className="p-3 bg-accent rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">
                  Selected Audio
                </p>
                <p className="font-mono text-sm text-foreground truncate">
                  {audioFile}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAudioFile(null)}
                className="text-destructive hover:text-destructive ml-2"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
