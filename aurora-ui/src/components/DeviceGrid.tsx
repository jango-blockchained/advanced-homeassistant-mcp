import { useState, useEffect } from 'react'
import { Lightbulb, Loader2, Sparkles } from 'lucide-react'
import { useAuroraStore } from '../lib/store'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export default function DeviceGrid() {
  const { 
    devices, 
    selectedDevices, 
    setDevices, 
    toggleDevice, 
    clearDevices,
    selectArea,
    isScanning,
    setScanning,
    setError 
  } = useAuroraStore()

  const [areas, setAreas] = useState<string[]>([])

  useEffect(() => {
    const uniqueAreas = Array.from(new Set(devices.map(d => d.area).filter(Boolean))) as string[]
    setAreas(uniqueAreas)
  }, [devices])

  const handleScanDevices = async () => {
    setScanning(true)
    try {
      const fetchedDevices = await api.getDevices()
      setDevices(fetchedDevices)
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to scan devices')
    } finally {
      setScanning(false)
    }
  }

  return (
    <Card className="tech-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Device Control
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleScanDevices}
              disabled={isScanning}
              size="sm"
              variant="outline"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Scan Devices
                </>
              )}
            </Button>
            {selectedDevices.size > 0 && (
              <Button
                onClick={clearDevices}
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Area Quick Selection */}
        {areas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Quick Select by Area
            </p>
            <div className="flex flex-wrap gap-2">
              {areas.map(area => (
                <Button
                  key={area}
                  onClick={() => selectArea(area)}
                  size="sm"
                  variant="outline"
                >
                  {area}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Device Grid */}
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              No devices found. Click SCAN DEVICES to discover lights.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {devices.map(device => {
              const isSelected = selectedDevices.has(device.entity_id)
              const isOn = device.state === 'on'
              
              return (
                <button
                  key={device.entity_id}
                  onClick={() => toggleDevice(device.entity_id)}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200 text-left group relative",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  )}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary light-pulse" />
                  )}
                  
                  {/* Device icon */}
                  <Lightbulb 
                    className={cn(
                      "w-6 h-6 mb-2 transition-colors",
                      isSelected ? "text-primary light-glow" : "text-muted-foreground group-hover:text-primary",
                      isOn && "light-beat"
                    )}
                    fill={isOn ? "currentColor" : "none"}
                  />
                  
                  {/* Device info */}
                  <div className="space-y-1">
                    <p className={cn(
                      "font-medium text-sm truncate transition-colors",
                      isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                    )}>
                      {device.name}
                    </p>
                    
                    {device.area && (
                      <p className="text-xs text-muted-foreground truncate">
                        {device.area}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        isOn 
                          ? "bg-tech-success/10 text-tech-success" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isOn ? 'ON' : 'OFF'}
                      </span>
                      {device.brightness && (
                        <span className="text-muted-foreground">
                          {Math.round((device.brightness / 255) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Selection summary */}
        {selectedDevices.size > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg light-glow">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Selected Devices
              </p>
              <p className="text-xl font-semibold text-foreground">
                {selectedDevices.size} {selectedDevices.size !== 1 ? 'devices' : 'device'}
              </p>
            </div>
            <Sparkles className="w-6 h-6 text-primary light-pulse" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
