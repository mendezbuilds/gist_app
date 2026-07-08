/**
 * OTPInput — 6-box OTP entry with auto-advance and paste handling.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

const OTP_LENGTH = 6;

type Props = {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
};

export function OTPInput({ value, onChange, disabled }: Props) {
  const { colors, spacing, borderRadius, fontSize, springs } = useTheme();
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scales = Array.from({ length: OTP_LENGTH }, () => useSharedValue(1));

  const digits = value.split('').slice(0, OTP_LENGTH);

  const focusAt = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (text: string, index: number) => {
    // Handle paste: if more than 1 char is typed, distribute
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      onChange(pasted);
      const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
      focusAt(nextFocus);
      return;
    }

    const digit = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('').slice(0, OTP_LENGTH);
    onChange(newValue);

    // Animate the box
    scales[index].value = withSequence(
      withSpring(1.12, springs.snappy),
      withSpring(1, springs.snappy),
    );

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      focusAt(index + 1);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      onChange(newDigits.join(''));
      focusAt(index - 1);
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const isFilled = Boolean(digits[i]);
        const animStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scales[i].value }],
        }));

        return (
          <Animated.View
            key={i}
            style={[
              animStyle,
              {
                width: 48,
                height: 56,
                borderRadius: borderRadius.md,
                borderWidth: 2,
                borderColor: isFilled ? colors.accent : colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <TextInput
              ref={(r) => { inputRefs.current[i] = r; }}
              value={digits[i] ?? ''}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH} // allows paste
              editable={!disabled}
              selectTextOnFocus
              style={{
                color: colors.textPrimary,
                fontFamily: 'Nunito_700Bold',
                fontSize: fontSize.xl,
                textAlign: 'center',
                width: '100%',
                height: '100%',
              }}
              caretHidden
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
});
