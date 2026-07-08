/**
 * Username Screen
 * Real-time availability check (debounced 500ms), rules inline.
 * Username: 3-20 chars, alphanumeric + underscores, lowercase only.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { AdirePattern } from '../../src/components/ui/AdirePattern';
import { isUsernameAvailable } from '../../src/lib/auth';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function UsernameScreen() {
  const { colors, spacing, fontSize, isDark } = useTheme();
  const { phone, userId } = useLocalSearchParams<{ phone: string; userId: string }>();

  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFormatValid = USERNAME_REGEX.test(username);

  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      setValidationError(null);
      return;
    }

    // Format check first
    if (username.length < 3) {
      setValidationError('At least 3 characters required.');
      setIsAvailable(null);
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setValidationError('Only lowercase letters, numbers, and underscores.');
      setIsAvailable(null);
      return;
    }

    setValidationError(null);

    // Debounced availability check
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsChecking(true);
      const available = await isUsernameAvailable(username);
      setIsAvailable(available);
      setIsChecking(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const handleChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    setIsAvailable(null);
  };

  const canContinue = isFormatValid && isAvailable === true && !isChecking;

  const errorText = validationError ?? (isAvailable === false ? 'This username is taken.' : undefined);

  const statusColor = isAvailable === true
    ? colors.success
    : isAvailable === false
    ? colors.error
    : colors.textSecondary;

  const statusText = isChecking
    ? ''
    : isAvailable === true
    ? '✓ Available'
    : isAvailable === false
    ? '✗ Taken'
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Subtle Adire background texture */}
      <AdirePattern opacity={isDark ? 0.03 : 0.04} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing[6],
            paddingTop: spacing[12],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading */}
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: fontSize['2xl'],
              color: colors.textPrimary,
              marginBottom: spacing[2],
              letterSpacing: -0.5,
              paddingRight: 10, // Prevent custom font glyph right-edge clipping
            }}
          >
            Pick your username
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              marginBottom: spacing[8],
              lineHeight: fontSize.base * 1.55,
            }}
          >
            This is your public identity on Gist. Your phone number is never shown to others.
          </Text>

          {/* Input + status */}
          <View style={{ position: 'relative' }}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={handleChange}
              placeholder="e.g. chiamaka_writes"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              errorText={errorText ?? undefined}
              helperText="3–20 characters. Letters, numbers, underscores."
              returnKeyType="done"
            />
            {/* Availability indicator */}
            {username.length >= 3 && !validationError && (
              <View style={{ position: 'absolute', right: 12, top: 38 }}>
                {isChecking ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text
                    style={{
                      color: statusColor,
                      fontFamily: 'Nunito_600SemiBold',
                      fontSize: fontSize.sm,
                    }}
                  >
                    {statusText}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Username preview */}
          {username.length >= 3 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: spacing[4],
                marginTop: spacing[4],
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm }}>
                Your profile link
              </Text>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: 'Nunito_600SemiBold',
                  fontSize: fontSize.base,
                  marginTop: 4,
                }}
              >
                gist.app/@{username}
              </Text>
            </View>
          )}

          <View style={{ marginTop: spacing[10] }}>
            <Button
              label="Continue"
              onPress={() =>
                router.push({
                  pathname: '/(auth)/display-name',
                  params: { phone, userId, username },
                })
              }
              disabled={!canContinue}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
