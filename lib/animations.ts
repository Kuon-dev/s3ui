/**
 * Animation utilities and presets using motion.dev
 * Following principles: Natural, Fast, Purposeful, Performant, Interruptible, Accessible, Cohesive
 */

import { spring } from 'motion';

/**
 * Spring presets for consistent, natural animations
 */
export const springPresets = {
  // Gentle spring for subtle movements
  gentle: {
    stiffness: 120,
    damping: 14,
    mass: 1,
  },
  
  // Snappy spring for quick interactions
  snappy: {
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  
  // Smooth spring for larger movements
  smooth: {
    stiffness: 100,
    damping: 20,
    mass: 1.2,
  },
  
  // Bouncy spring for playful feedback
  bouncy: {
    bounce: 0.25,
    visualDuration: 0.3,
  },
  
  // Stiff spring for immediate response
  stiff: {
    stiffness: 400,
    damping: 40,
    mass: 0.5,
  },
} as const;

/**
 * Duration presets for time-based animations
 */
export const durationPresets = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  verySlow: 0.8,
} as const;

/**
 * Easing functions for CSS transitions
 */
export const easings = {
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
} as const;

/**
 * Generate CSS spring transition
 */
export function springTransition(duration: number = 0.5) {
  return spring(duration);
}

/**
 * Stagger delay calculator for list animations
 */
export function stagger(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay;
}

/**
 * Scale animation presets
 */
export const scaleAnimations = {
  hover: {
    scale: 1.02,
    transition: springTransition(0.2),
  },
  
  press: {
    scale: 0.98,
    transition: springTransition(0.1),
  },
  
  appear: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: springTransition(0.3),
  },
} as const;

/**
 * Fade animation presets
 */
export const fadeAnimations = {
  in: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: durationPresets.fast },
  },
  
  out: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    transition: { duration: durationPresets.fast },
  },
} as const;

/**
 * Slide animation presets
 */
export const slideAnimations = {
  fromBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: springTransition(0.4),
  },
  
  fromTop: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: springTransition(0.4),
  },
  
  fromLeft: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: springTransition(0.4),
  },
  
  fromRight: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: springTransition(0.4),
  },
} as const;

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animation wrapper that respects accessibility preferences
 */
export function accessibleAnimation<T extends Record<string, unknown>>(
  animation: T,
  reducedMotionFallback?: T
): T {
  if (prefersReducedMotion()) {
    return reducedMotionFallback || ({} as T);
  }
  return animation;
}