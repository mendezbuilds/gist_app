/**
 * Adire Design System — Shadows & Elevation
 * Cross-platform: iOS uses shadow props, Android uses elevation.
 */

import { Platform, StyleSheet } from 'react-native';

type ShadowStyle = {
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  shadowOffset?: { width: number; height: number };
  elevation?: number;
};

function shadow(
  elevation: number,
  opacity: number,
  radius: number,
  offsetY: number,
  color = '#000000',
): ShadowStyle {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offsetY },
  };
}

export const shadows = {
  none: {} as ShadowStyle,
  xs: shadow(1, 0.04, 2, 1),
  sm: shadow(2, 0.06, 4, 2),
  md: shadow(4, 0.08, 8, 4),
  lg: shadow(8, 0.10, 16, 6),
  xl: shadow(16, 0.12, 24, 8),
  glass: shadow(12, 0.15, 32, 8, '#1B2A6B'),
} as const;
