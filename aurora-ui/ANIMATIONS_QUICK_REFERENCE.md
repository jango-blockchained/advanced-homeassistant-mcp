# Aurora Light Animations - Quick Reference

## 🎨 Integrated Animations

Light animations have been implemented across 4 core UI components. All animations are pure CSS and GPU-accelerated.

### Component Breakdown

#### 1️⃣ DeviceGrid - Device Selection
```
Selection Indicator    → .light-pulse (breathing 2s)
Selected Device Icon   → .light-glow (glow 1.5s)
Active Device Icon     → .light-beat (beat 500ms)
Selection Summary      → .light-glow + .light-pulse
```

#### 2️⃣ PlaybackControls - Playback Feedback
```
Render Button          → .light-intense (peaks 800ms, while rendering)
Progress Bar           → .light-glow (while rendering)
Playback Timeline      → .light-beat (beat sync while playing)
Play Button            → .light-reactive (instant feedback)
Pause Button           → .light-beat (beat visual)
Resume Button          → .light-smooth (smooth 1s)
```

#### 3️⃣ StatusBar - Activity Indicators
```
Activity Dot           → .light-pulse (breathing 2s)
Status Message         → .light-smooth (smooth 1s)
```

#### 4️⃣ TimelineLibrary - Timeline Interaction
```
Timeline Card          → .light-reactive (responsive)
Timeline Name          → .light-glow (glow 1.5s)
Play Button            → .light-beat (beat 500ms)
```

## 🚀 Available Animation Classes

| Class | Duration | Opacity/Scale | Use Case |
|-------|----------|---------------|----------|
| `.light-pulse` | 2s | 0.4→1.0 | Idle indicators, breathing |
| `.light-glow` | 1.5s | 1→1.2 brightness | Highlights, selected states |
| `.light-beat` | 500ms | 1→1.1 scale | Action feedback, playback |
| `.light-smooth` | 1s | Multi-step brightness | Premium transitions |
| `.light-intense` | 800ms | 0.5→1.5→1 brightness | Impact moments, rendering |
| `.light-reactive` | instant | CSS transition | User interactions |
| `.light-strobe` | 200ms | 1→0.2 opacity | Party/high-energy mode |
| `.light-fade` | 3s | 0.8→1.2 brightness | Gradual mood changes |
| `.light-rainbow` | 4s | Hue rotation | Color cycling |
| `.light-wave` | 2s | Translate + scale | Sequential patterns |

## 📝 Implementation Pattern

### Direct CSS Classes
```jsx
// Single animation
<div className="light-pulse">Content</div>

// Conditional animation
<div className={isSelected ? "light-glow" : ""}>Content</div>

// Multiple animations
<div className="light-glow light-pulse">Content</div>

// With utility classes
<div className={cn("w-4 h-4 rounded-full", isActive ? "light-beat" : "")}>
  Content
</div>
```

## 🎯 Best Practices

✅ **Do:**
- Use animations for state feedback (selected, playing, loading)
- Combine animations for visual interest
- Use quick animations (200-800ms) for interactions
- Use slow animations (1-4s) for ambient effects

❌ **Don't:**
- Animate every element (reserve for important UI)
- Use animations longer than needed
- Combine too many animations on one element
- Use in accessibility-critical contexts without fallback

## 🔧 Customizing Animations

To modify animation timing or effects, edit `aurora-ui/src/index.css`:

```css
@keyframes lightPulse {
  0%, 100% { opacity: 0.4; }      /* Change min opacity */
  50% { opacity: 1; }              /* Change max opacity */
}
```

## 📊 Performance

- **GPU-accelerated**: Using opacity, transform, filter properties
- **No JavaScript**: Pure CSS @keyframes
- **Lightweight**: ~2KB CSS overhead
- **60fps**: Smooth animation on modern browsers

## 🎭 React Hook (Available)

Advanced users can leverage the React hook:

```tsx
import { useLightAnimation, LIGHT_ANIMATIONS } from '../hooks/useLightAnimation'

function Component() {
  const { animation, animationClass, setAnimation } = useLightAnimation('pulse')
  
  return (
    <div className={animationClass}>
      <button onClick={() => setAnimation('beat')}>
        Change to Beat
      </button>
    </div>
  )
}
```

## 📁 Files Modified

- `src/index.css` - 16 animation definitions + 16 keyframe sets
- `src/hooks/useLightAnimation.ts` - React hook for advanced usage
- `src/components/DeviceGrid.tsx` - Selection feedback animations
- `src/components/PlaybackControls.tsx` - Playback state animations
- `src/components/StatusBar.tsx` - Status indicator animations
- `src/components/TimelineLibrary.tsx` - Timeline interaction animations

## 🌐 Browser Support

All animations use standard CSS3 @keyframes:
- Chrome/Edge 43+
- Firefox 16+
- Safari 9+
- Mobile browsers (iOS 9+, Android 5+)

---

For detailed implementation info, see `ANIMATION_IMPLEMENTATION.md`
