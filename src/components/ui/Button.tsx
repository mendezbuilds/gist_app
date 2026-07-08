/**
 * Button — Adire design system
 * Variants: primary (coral), secondary (outlined), ghost, danger
 * Sizes: sm, md, lg
 * Includes haptic feedback on press.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, springs, borderRadius, spacing } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.snappy);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || isLoading;

  const containerStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    ...(fullWidth && { width: '100%' }),
    ...(size === 'sm' && { paddingVertical: spacing[2], paddingHorizontal: spacing[4] }),
    ...(size === 'md' && { paddingVertical: spacing[3.5], paddingHorizontal: spacing[6] }),
    ...(size === 'lg' && { paddingVertical: spacing[4], paddingHorizontal: spacing[8] }),
    ...(variant === 'primary' && {
      backgroundColor: isDisabled ? colors.accentDim : colors.accent,
    }),
    ...(variant === 'secondary' && {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: isDisabled ? colors.border : colors.accent,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: 'transparent',
    }),
    ...(variant === 'danger' && {
      backgroundColor: isDisabled ? colors.errorSurface : colors.error,
    }),
    opacity: isDisabled ? 0.55 : 1,
  };

  const labelStyle: TextStyle = {
    fontFamily: 'Nunito_700Bold',
    ...(size === 'sm' && { fontSize: 13, lineHeight: 18 }),
    ...(size === 'md' && { fontSize: 15, lineHeight: 20 }),
    ...(size === 'lg' && { fontSize: 17, lineHeight: 22 }),
    letterSpacing: 0.3,
    includeFontPadding: false,
    textAlignVertical: 'center',
    ...(variant === 'primary' && { color: '#FFFFFF' }),
    ...(variant === 'secondary' && { color: isDisabled ? colors.textSecondary : colors.accent }),
    ...(variant === 'ghost' && { color: colors.textPrimary }),
    ...(variant === 'danger' && { color: '#FFFFFF' }),
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, containerStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? colors.accent : '#FFFFFF'}
        />
      ) : (
        <Text style={[labelStyle, textStyle]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}
