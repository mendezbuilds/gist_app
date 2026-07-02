/**
 * Adire Design System — Shadows & Elevation
 */

import { Platform } from 'react-native';

const androidShadow = (elevation: number) => ({ elevation });

const iosShadow = (
  color: string,
  opacity: number,
  radius: number,
  offsetY: number,
) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY },
});

// Cross-platform shadow helper
const shadow = (
  elevation: number,
  opacity: number,
  radius: number,
  offsetY: number,
  color = '#000000',
) =>
  Platform.select({
    android: androidShadow(elevation),
    ios: iosShadow(color, opacity, radius, offsetY),
    default: {},
  });

export const shadows = {
  none: {},
  xs: shadow(1, 0.04, 2, 1),
  sm: shadow(2, 0.06, 4, 2),
  md: shadow(4, 0.08, 8, 4),
  lg: shadow(8, 0.10, 16, 6),
  xl: shadow(16, 0.12, 24, 8),

  // Glassmorphism backing — used on modal/sheet surfaces
  glass: Platform.select({
    ios: {
      shadowColor: '#1B2A6B',
      shadowOpacity: 0.15,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 12 },
    default: {},
  }),
} as const;
