import { Settings, Sliders } from 'lucide-react'
import { useAuroraStore } from '../lib/store'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'

export default function SettingsPanel() {
  const {
    intensity,
    colorMapping,
    beatSync,
    smoothTransitions,
    setIntensity,
    setColorMapping,
    toggleBeatSync,
    toggleSmoothTransitions,
  } = useAuroraStore()

  return (
    <Card className="tech-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Intensity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Intensity
              </label>
              <span className="text-lg font-semibold text-primary">
                {Math.round(intensity * 100)}%
              </span>
            </div>
            <Slider
              value={[intensity * 100]}
              onValueChange={([value]: number[]) => setIntensity(value / 100)}
              min={0}
              max={100}
              step={1}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Controls overall brightness and color saturation
            </p>
          </div>

          {/* Color Mapping */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Color Mapping
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['frequency', 'mood', 'custom'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setColorMapping(mode)}
                  className={`
                    p-2 rounded-lg border transition-all text-center text-xs font-medium capitalize
                    ${colorMapping === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {colorMapping === 'frequency' && 'Map audio frequencies to color spectrum'}
              {colorMapping === 'mood' && 'Analyze mood and map to themes'}
              {colorMapping === 'custom' && 'Use custom mappings'}
            </p>
          </div>
        </div>

        {/* Toggle Settings */}
        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border">
            <div className="flex-1">
              <label className="font-medium text-foreground text-sm">
                Beat Sync
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Emphasize detected beats
              </p>
            </div>
            <Switch
              checked={beatSync}
              onCheckedChange={toggleBeatSync}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border">
            <div className="flex-1">
              <label className="font-medium text-foreground text-sm">
                Smooth Transitions
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Gradual color changes
              </p>
            </div>
            <Switch
              checked={smoothTransitions}
              onCheckedChange={toggleSmoothTransitions}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
