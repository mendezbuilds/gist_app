/**
 * Adire Design System — Color Tokens
 * Inspired by Yoruba indigo resist-dye textile patterns.
 * All tokens are referenced by semantic name, never raw hex.
 */

export const palette = {
  // Indigo family
  indigo950: '#0E1224',
  indigo900: '#131828',
  indigo800: '#1B1F38',
  indigo700: '#212848',
  indigo600: '#293260',
  indigo500: '#1B2A6B',
  indigo400: '#3548A3',
  indigo300: '#6B7FC4',
  indigo200: '#A5B0DB',
  indigo100: '#D8DCF0',

  // Ivory / warm whites
  ivory: '#F7F1E3',
  white: '#FFFFFF',
  warmWhite: '#F0EEE6',

  // Coral accent — constant across modes
  coral700: '#B83E1E',
  coral600: '#C94822',
  coral500: '#E8552F',
  coral400: '#EE7454',
  coral300: '#F4A08A',
  coral100: '#FDE8E2',

  // Neutrals
  black: '#0A0A0A',
  gray900: '#1A1A1A',
  gray700: '#3A3A3A',
  gray600: '#6B6B6B',
  gray500: '#9492A8',
  gray400: '#C4C2D0',
  gray300: '#E0DFF0',
  gray200: '#F0EFF8',
  gray100: '#F8F7FC',
} as const;

export type ColorScheme = 'light' | 'dark';

export const colors = {
  light: {
    // Backgrounds
    background: palette.ivory,
    surface: palette.white,
    surfaceElevated: palette.white,
    surfaceOverlay: 'rgba(255, 255, 255, 0.85)', // glassmorphism
    inputBar: 'rgba(255, 255, 255, 0.92)',

    // Message bubbles
    bubbleMine: palette.indigo500,       // #1B2A6B
    bubbleTheirs: palette.white,
    bubbleMineText: palette.white,
    bubbleTheirsText: palette.gray900,

    // Text
    textPrimary: palette.gray900,        // #1A1A1A
    textSecondary: palette.gray600,      // #6B6B6B
    textTertiary: palette.gray400,
    textInverse: palette.white,
    textOnBubble: palette.white,

    // Borders & dividers
    border: palette.gray300,
    divider: palette.gray200,
    borderFocus: palette.indigo500,

    // Accent
    accent: palette.indigo500,            // #1B2A6B — Indigo brand color
    accentDim: palette.indigo300,
    accentSurface: palette.indigo100,

    // Brand highlight (Coral)
    brandHighlight: palette.coral500,     // #E8552F
    brandHighlightDim: palette.coral300,
    brandHighlightSurface: palette.coral100,

    // Status / semantic
    success: '#2E7D5E',
    warning: '#C49A00',
    error: '#C0392B',
    successSurface: '#E8F5EF',
    errorSurface: '#FDECEA',

    // Tab bar
    tabActive: palette.indigo500,
    tabInactive: palette.gray500,
    tabBackground: palette.white,

    // Overlays
    overlay: 'rgba(14, 18, 36, 0.55)',
    scrim: 'rgba(14, 18, 36, 0.3)',

    // Typing indicator dots (coral)
    typingDot: palette.coral500,
  },

  dark: {
    // Backgrounds
    background: palette.indigo950,       // #0E1224
    surface: palette.indigo800,          // #1B1F38
    surfaceElevated: palette.indigo700,
    surfaceOverlay: 'rgba(27, 31, 56, 0.88)',
    inputBar: 'rgba(27, 31, 56, 0.94)',

    // Message bubbles
    bubbleMine: palette.indigo400,       // #3548A3
    bubbleTheirs: palette.indigo800,
    bubbleMineText: palette.white,
    bubbleTheirsText: palette.warmWhite,

    // Text
    textPrimary: palette.warmWhite,      // #F0EEE6
    textSecondary: palette.gray500,      // #9492A8
    textTertiary: palette.indigo300,
    textInverse: palette.gray900,
    textOnBubble: palette.white,

    // Borders & dividers
    border: palette.indigo700,
    divider: palette.indigo800,
    borderFocus: palette.indigo400,

    // Accent
    accent: palette.indigo400,            // #3548A3 — Indigo brand color
    accentDim: palette.indigo600,
    accentSurface: 'rgba(53, 72, 163, 0.15)',

    // Brand highlight (Coral)
    brandHighlight: palette.coral500,     // #E8552F
    brandHighlightDim: palette.coral700,
    brandHighlightSurface: 'rgba(232, 85, 47, 0.15)',

    // Status / semantic
    success: '#4CAF81',
    warning: '#F5C842',
    error: '#EF5350',
    successSurface: 'rgba(76, 175, 129, 0.15)',
    errorSurface: 'rgba(239, 83, 80, 0.15)',

    // Tab bar
    tabActive: palette.indigo400,
    tabInactive: palette.gray500,
    tabBackground: palette.indigo900,

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.72)',
    scrim: 'rgba(0, 0, 0, 0.45)',

    // Typing indicator dots
    typingDot: palette.coral500,
  },
} as const;

export type ThemeColors = typeof colors.light | typeof colors.dark;
