/**
 * Adire Design System — Typography
 * Nunito: geometric sans for all UI text
 * Fraunces: optical-size display face for wordmark / hero text
 */

import { Platform } from 'react-native';

export const fontFamilies = {
  // Nunito weights loaded via expo-font
  sans: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
  },
  // Fraunces for wordmark / display headings only
  display: {
    regular: 'Fraunces_400Regular',
    semiBold: 'Fraunces_600SemiBold',
    bold: 'Fraunces_700Bold',
  },
  // System fallback (used before fonts load)
  system: Platform.select({
    ios: 'San Francisco',
    android: 'Roboto',
    default: 'system-ui',
  }),
} as const;

// Type scale — based on a 1.25 modular scale from 14px base
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.3,
  wider: 0.8,
  widest: 1.5,
} as const;

// Pre-composed text style presets used across the app
export const textStyles = {
  wordmark: {
    fontFamily: fontFamilies.display.bold,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  },
  h1: {
    fontFamily: fontFamilies.sans.bold,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  h2: {
    fontFamily: fontFamilies.sans.bold,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  h3: {
    fontFamily: fontFamilies.sans.semiBold,
    fontSize: fontSize.lg,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.lg * lineHeight.snug,
  },
  body: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySemiBold: {
    fontFamily: fontFamilies.sans.semiBold,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  caption: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  captionMedium: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  label: {
    fontFamily: fontFamilies.sans.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wide,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  labelXs: {
    fontFamily: fontFamilies.sans.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
  button: {
    fontFamily: fontFamilies.sans.bold,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.wide,
    lineHeight: fontSize.base * lineHeight.tight,
  },
  buttonSm: {
    fontFamily: fontFamilies.sans.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.wide,
    lineHeight: fontSize.sm * lineHeight.tight,
  },
  message: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.relaxed,
  },
  timestamp: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
} as const;
