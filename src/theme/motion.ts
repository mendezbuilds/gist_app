/**
 * Adire Design System — Motion tokens
 * Spring-first animation language. All durations respect reduce-motion.
 */

import { useReducedMotion } from 'react-native-reanimated';

// Spring configs (react-native-reanimated withSpring)
export const springs = {
  // Message send: bouncy, energetic
  messageSend: {
    damping: 14,
    stiffness: 180,
    mass: 0.8,
  },
  // UI elements: snappy but controlled
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  // Modals, sheets: smooth entry
  modal: {
    damping: 28,
    stiffness: 260,
    mass: 1,
  },
  // Gentle: hover states, subtle transitions
  gentle: {
    damping: 30,
    stiffness: 200,
    mass: 1,
  },
  // Tick morph: read receipt animation
  tickMorph: {
    damping: 16,
    stiffness: 220,
    mass: 0.7,
  },
} as const;

// Timing-based durations (ms) for non-spring animations
export const duration = {
  instant: 80,
  fast: 150,
  normal: 250,
  slow: 380,
  verySlow: 600,
} as const;

// Easing curves (for withTiming)
export const easing = {
  easeOut: [0.0, 0.0, 0.2, 1.0],
  easeIn: [0.4, 0.0, 1.0, 1.0],
  easeInOut: [0.4, 0.0, 0.2, 1.0],
  decelerate: [0.0, 0.0, 0.2, 1.0],
  standard: [0.2, 0.0, 0.0, 1.0],
} as const;

// Typing indicator pulse timing (pulsing coral dots)
export const typingIndicator = {
  dotDuration: 400,
  dotDelay: 150,   // stagger between dots
  minScale: 0.6,
  maxScale: 1.0,
} as const;

// Status ring depletion animation
export const statusRing = {
  strokeWidth: 2.5,
  radius: 20,
  totalDuration: 24 * 60 * 60 * 1000, // 24h in ms
} as const;

/**
 * Hook: returns true when the system reduce-motion setting is on.
 * All animated components should check this and use instant/opacity-only
 * fallbacks when true.
 */
export function useMotionPreference(): { reduceMotion: boolean } {
  const reduceMotion = useReducedMotion();
  return { reduceMotion: reduceMotion ?? false };
}

/**
 * Returns spring config: real spring when motion is allowed,
 * zero-duration snap when reduce-motion is on.
 */
export function getSpringConfig(
  config: typeof springs[keyof typeof springs],
  reduceMotion: boolean,
) {
  if (reduceMotion) {
    return { damping: 1000, stiffness: 1000, mass: 1 }; // instant
  }
  return config;
}
