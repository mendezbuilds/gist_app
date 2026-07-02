/**
 * Adire Design System — Theme hook + context
 * Provides color-scheme-aware tokens to all components.
 */

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ThemeColors, type ColorScheme } from './colors';
import { fontFamilies, fontSize, textStyles, lineHeight, letterSpacing } from './typography';
import { spacing, borderRadius, iconSize, avatarSize, hitSlop } from './spacing';
import { springs, duration, easing, typingIndicator, statusRing } from './motion';
import { shadows } from './shadows';

export type Theme = {
  colors: ThemeColors;
  fonts: typeof fontFamilies;
  fontSize: typeof fontSize;
  textStyles: typeof textStyles;
  lineHeight: typeof lineHeight;
  letterSpacing: typeof letterSpacing;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  iconSize: typeof iconSize;
  avatarSize: typeof avatarSize;
  hitSlop: typeof hitSlop;
  springs: typeof springs;
  duration: typeof duration;
  easing: typeof easing;
  typingIndicator: typeof typingIndicator;
  statusRing: typeof statusRing;
  shadows: typeof shadows;
  scheme: ColorScheme;
  isDark: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = (useColorScheme() ?? 'light') as ColorScheme;
  const isDark = scheme === 'dark';

  const theme: Theme = {
    colors: colors[scheme],
    fonts: fontFamilies,
    fontSize,
    textStyles,
    lineHeight,
    letterSpacing,
    spacing,
    borderRadius,
    iconSize,
    avatarSize,
    hitSlop,
    springs,
    duration,
    easing,
    typingIndicator,
    statusRing,
    shadows,
    scheme,
    isDark,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

// Convenience: just the colors
export function useColors(): ThemeColors {
  return useTheme().colors;
}
