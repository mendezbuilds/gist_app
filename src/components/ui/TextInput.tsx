/**
 * TextInput — Adire design system
 * Animated focus ring, error state, label, helper text.
 */

import React, { useState, forwardRef } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

type Props = TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: ViewStyle;
};

export const TextInput = forwardRef<RNTextInput, Props>(
  ({ label, helperText, errorText, containerStyle, style, onFocus, onBlur, ...rest }, ref) => {
    const { colors, spacing, borderRadius, fontSize } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const borderAnim = useSharedValue(0);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      borderAnim.value = withTiming(1, { duration: 180 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      borderAnim.value = withTiming(0, { duration: 180 });
      onBlur?.(e);
    };

    const animatedBorder = useAnimatedStyle(() => ({
      borderColor: errorText
        ? colors.error
        : borderAnim.value === 1
        ? colors.borderFocus
        : colors.border,
    }));

    const hasError = Boolean(errorText);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              styles.label,
              {
                color: hasError ? colors.error : isFocused ? colors.accent : colors.textSecondary,
                fontFamily: 'Nunito_600SemiBold',
                fontSize: fontSize.sm,
                letterSpacing: 0.3,
                marginBottom: spacing[1.5],
              },
            ]}
          >
            {label}
          </Text>
        )}

        <Animated.View
          style={[
            styles.inputWrapper,
            animatedBorder,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.md,
              borderWidth: 1.5,
            },
          ]}
        >
          <RNTextInput
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.base,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3.5],
              },
              style,
            ]}
            placeholderTextColor={colors.textTertiary}
            {...rest}
          />
        </Animated.View>

        {(helperText || errorText) && (
          <Text
            style={[
              styles.helper,
              {
                color: hasError ? colors.error : colors.textSecondary,
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.xs,
                marginTop: spacing[1],
              },
            ]}
          >
            {errorText ?? helperText}
          </Text>
        )}
      </View>
    );
  },
);

TextInput.displayName = 'TextInput';

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {},
  inputWrapper: { overflow: 'hidden' },
  input: { width: '100%' },
  helper: {},
});
