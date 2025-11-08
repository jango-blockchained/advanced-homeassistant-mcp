/**
 * useLightAnimation Hook
 * Simplifies applying predefined Aurora light animations to components
 * 
 * Usage:
 * const { animationClass, setAnimation } = useLightAnimation('pulse');
 * <div className={animationClass}>Light Element</div>
 */

import { useState, useCallback } from 'react';

export type LightAnimationType =
  | 'pulse'
  | 'glow'
  | 'beat'
  | 'strobe'
  | 'fade'
  | 'rainbow'
  | 'sync'
  | 'intensity'
  | 'frequency'
  | 'swirl'
  | 'wave'
  | 'flash'
  | 'smooth'
  | 'reactive'
  | 'intense'
  | 'chill'
  | 'none';

/**
 * Animation configurations with descriptions and use cases
 */
export const LIGHT_ANIMATIONS = {
  pulse: {
    class: 'light-pulse',
    description: 'Steady breathing effect',
    useCase: 'Ambient, relaxing',
  },
  glow: {
    class: 'light-glow',
    description: 'Gentle glow intensification',
    useCase: 'Soft transitions',
  },
  beat: {
    class: 'light-beat',
    description: 'Sync to music beats',
    useCase: 'Beat detection response',
  },
  strobe: {
    class: 'light-strobe',
    description: 'Fast on/off effect',
    useCase: 'High energy, party mode',
  },
  fade: {
    class: 'light-fade',
    description: 'Smooth color transitions',
    useCase: 'Gradual mood changes',
  },
  rainbow: {
    class: 'light-rainbow',
    description: 'Color cycling',
    useCase: 'Celebratory, fun',
  },
  sync: {
    class: 'light-sync',
    description: 'Synchronized multi-light effect',
    useCase: 'Multi-device coordination',
  },
  intensity: {
    class: 'light-intensity',
    description: 'Volume-responsive brightness',
    useCase: 'Audio-reactive',
  },
  frequency: {
    class: 'light-frequency',
    description: 'Frequency-based color mapping',
    useCase: 'Spectrum analysis',
  },
  swirl: {
    class: 'light-swirl',
    description: 'Rotating color gradient',
    useCase: 'Dynamic, mesmerizing',
  },
  wave: {
    class: 'light-wave',
    description: 'Wave-like propagation',
    useCase: 'Sequential patterns',
  },
  flash: {
    class: 'light-flash',
    description: 'Quick brightness spike',
    useCase: 'Impact moments, alerts',
  },
  smooth: {
    class: 'light-smooth',
    description: 'Ultra-smooth transitions',
    useCase: 'Premium, polished feel',
  },
  reactive: {
    class: 'light-reactive',
    description: 'Responsive to input changes',
    useCase: 'User interaction feedback',
  },
  intense: {
    class: 'light-intense',
    description: 'High intensity peak effect',
    useCase: 'Dramatic moments',
  },
  chill: {
    class: 'light-chill',
    description: 'Relaxed, slow breathing',
    useCase: 'Meditation, calm mode',
  },
  none: {
    class: '',
    description: 'No animation',
    useCase: 'Static light',
  },
} as const;

/**
 * Combines multiple animations
 */
export const combineAnimations = (...types: LightAnimationType[]): string => {
  return types
    .map((type) => LIGHT_ANIMATIONS[type]?.class)
    .filter(Boolean)
    .join(' ');
};

/**
 * Hook for managing light animations
 */
export function useLightAnimation(initialAnimation: LightAnimationType = 'pulse') {
  const [animation, setAnimation] = useState<LightAnimationType>(initialAnimation);

  const animationClass = LIGHT_ANIMATIONS[animation]?.class || '';

  const setAnimationType = useCallback((type: LightAnimationType) => {
    setAnimation(type);
  }, []);

  const toggleAnimation = useCallback(
    (type: LightAnimationType) => {
      setAnimation((current) => (current === type ? 'none' : type));
    },
    []
  );

  return {
    animation,
    animationClass,
    setAnimation: setAnimationType,
    toggleAnimation,
    getInfo: () => LIGHT_ANIMATIONS[animation],
  };
}

/**
 * Animation presets for common scenarios
 */
export const ANIMATION_PRESETS = {
  ambient: combineAnimations('pulse', 'smooth'),
  party: combineAnimations('strobe', 'rainbow'),
  chill: combineAnimations('chill', 'fade'),
  energetic: combineAnimations('beat', 'intensity'),
  cinematic: combineAnimations('smooth', 'wave'),
  reactive: 'light-reactive',
  disabled: 'opacity-50',
} as const;

export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

/**
 * Hook for animation presets
 */
export function useAnimationPreset(preset: AnimationPreset = 'ambient') {
  return ANIMATION_PRESETS[preset];
}
