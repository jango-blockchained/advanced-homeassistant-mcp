import { Zap } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b bg-card/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Aurora
              </h1>
              <p className="text-xs text-muted-foreground">
                Sound to Light Engine
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-sm font-medium text-tech-success">Online</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
