import { useEffect } from 'react'
import { useAuroraStore } from './lib/store'
import { api } from './lib/api'
import Header from './components/Header'
import AudioInput from './components/AudioInput'
import DeviceGrid from './components/DeviceGrid'
import SettingsPanel from './components/SettingsPanel'
import PlaybackControls from './components/PlaybackControls'
import TimelineLibrary from './components/TimelineLibrary'
import StatusBar from './components/StatusBar'

function App() {
  const { setDevices, setTimelines, setPlaybackStatus, setError } = useAuroraStore()

  useEffect(() => {
    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const [devices, timelines, status] = await Promise.all([
          api.getDevices(),
          api.getTimelines(),
          api.getStatus(),
        ])
        setDevices(devices)
        setTimelines(timelines)
        setPlaybackStatus(status)
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      }
    }

    fetchInitialData()

    // Poll playback status every second
    const statusInterval = setInterval(async () => {
      try {
        const status = await api.getStatus()
        setPlaybackStatus(status)
      } catch (error) {
        console.error('Failed to fetch status:', error)
      }
    }, 1000)

    return () => clearInterval(statusInterval)
  }, [setDevices, setTimelines, setPlaybackStatus, setError])

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <Header />
        
        <main className="container mx-auto px-6 py-8 space-y-6 max-w-7xl">
          {/* Audio Input Section */}
          <section className="animate-fade-in">
            <AudioInput />
          </section>

          {/* Device Selection */}
          <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <DeviceGrid />
          </section>

          {/* Settings */}
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <SettingsPanel />
          </section>

          {/* Playback Controls */}
          <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <PlaybackControls />
          </section>

          {/* Timeline Library */}
          <section className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <TimelineLibrary />
          </section>
        </main>

        <StatusBar />
      </div>
    </div>
  )
}

export default App
