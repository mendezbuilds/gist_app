/**
 * Phone Entry Screen
 * E.164 normalisation, Nigeria-first country code.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { PhoneInput } from '../../src/components/ui/PhoneInput';
import { AdirePattern } from '../../src/components/ui/AdirePattern';
import { sendOTP, normalisePhone } from '../../src/lib/auth';
import { useAuthStore } from '../../src/store/authStore';

export default function PhoneScreen() {
  const { colors, spacing, fontSize, isDark } = useTheme();
  const { setLoading, setError, isLoading } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [dialCode, setDialCode] = useState('+234');
  const [localError, setLocalError] = useState<string | null>(null);

  const fullPhone = `${dialCode}${phoneNumber.replace(/^0/, '')}`;

  const handleSend = async () => {
    setLocalError(null);
    const normalised = normalisePhone(fullPhone);
    if (!normalised) {
      setLocalError('Please enter a valid Nigerian phone number.');
      return;
    }

    setLoading(true);
    const { error } = await sendOTP(fullPhone);
    setLoading(false);

    if (error) {
      setLocalError(error);
      return;
    }

    // Pass the normalised phone to OTP screen via params
    router.push({ pathname: '/(auth)/otp', params: { phone: normalised } });
  };

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
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            style={{ marginBottom: spacing[8] }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: colors.accent, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base }}>
              ← Back
            </Text>
          </Pressable>

          {/* Heading */}
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 26, // Reduced from 30 (2xl) to 26 for better mobile container fitting
              lineHeight: 34, // Explicit line height to avoid Android layout truncation
              color: colors.textPrimary,
              marginBottom: spacing[2],
              letterSpacing: 0, // Avoid negative tracking which clips custom fonts on Android
              paddingRight: 24, // Generous padding to prevent right-edge glyph cutoff
            }}
          >
            What's your number?
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              marginBottom: spacing[6],
              lineHeight: fontSize.base * 1.5,
              paddingRight: 16,
            }}
          >
            We'll send you a one-time code to verify your number. Standard SMS rates may apply.
          </Text>

          {/* Input */}
          <PhoneInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            onChangeCountry={setDialCode}
            errorText={localError ?? undefined}
          />

          <View style={{ marginTop: spacing[8] }}>
            <Button
              label="Send Code"
              onPress={handleSend}
              isLoading={isLoading}
              disabled={phoneNumber.length < 7}
              fullWidth
              size="lg"
            />
          </View>

          {/* [TEMPORARY DEV-ONLY TEST BYPASS PANEL - REMOVE BEFORE PRODUCTION LAUNCH] */}
          {__DEV__ && (
            <View
              style={{
                marginTop: spacing[8],
                padding: spacing[4],
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Nunito_700Bold',
                  fontSize: fontSize.sm,
                  color: colors.accent,
                  marginBottom: spacing[2],
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                ⚠️ Developer Bypass Accounts
              </Text>
              <Text
                style={{
                  fontFamily: 'Nunito_400Regular',
                  fontSize: fontSize.xs,
                  color: colors.textSecondary,
                  marginBottom: spacing[4],
                  lineHeight: fontSize.xs * 1.4,
                }}
              >
                Select a test account to auto-fill and log in using Supabase Test Phone Numbers. No SMS is sent.
              </Text>
              
              <View style={{ gap: spacing[2] }}>
                <Button
                  label="Test User 1 (+234 800 000 0000)"
                  onPress={async () => {
                    setDialCode('+234');
                    setPhoneNumber('8000000000');
                    const testPhone = '+2348000000000';
                    setLoading(true);
                    const { error } = await sendOTP(testPhone);
                    setLoading(false);
                    if (error) {
                      setLocalError(error);
                      return;
                    }
                    router.push({ pathname: '/(auth)/otp', params: { phone: testPhone } });
                  }}
                  variant="secondary"
                  size="sm"
                  isLoading={isLoading}
                />
                
                <Button
                  label="Test User 2 (+234 800 000 0001)"
                  onPress={async () => {
                    setDialCode('+234');
                    setPhoneNumber('8000000001');
                    const testPhone = '+2348000000001';
                    setLoading(true);
                    const { error } = await sendOTP(testPhone);
                    setLoading(false);
                    if (error) {
                      setLocalError(error);
                      return;
                    }
                    router.push({ pathname: '/(auth)/otp', params: { phone: testPhone } });
                  }}
                  variant="secondary"
                  size="sm"
                  isLoading={isLoading}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
