import { useAuroraStore } from '../lib/store'

export default function StatusBar() {
  const { 
    devices, 
    selectedDevices, 
    playbackStatus, 
    error,
    isScanning,
    isAnalyzing,
    isRendering,
    renderProgress
  } = useAuroraStore()

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-2.5 max-w-7xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-tech-success" />
              <span className="text-muted-foreground">Devices:</span>
              <span className="text-foreground font-medium">{selectedDevices.size}/{devices.length}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium capitalize ${
                playbackStatus.state === 'playing' ? 'text-tech-success' :
                playbackStatus.state === 'paused' ? 'text-tech-warning' :
                'text-muted-foreground'
              }`}>
                {playbackStatus.state}
              </span>
            </div>

            {(isScanning || isAnalyzing || isRendering) && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-medium">
                  {isScanning && 'Scanning...'}
                  {isAnalyzing && 'Analyzing...'}
                  {isRendering && `Rendering ${Math.round(renderProgress)}%`}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <span>Error:</span>
              <span>{error}</span>
            </div>
          )}

          <div className="text-muted-foreground text-xs">
            Aurora v1.0.0
          </div>
        </div>
      </div>
    </footer>
  )
}
