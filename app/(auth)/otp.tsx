/**
 * OTP Verification Screen
 * 6-box input, 60s resend timer, auto-submit on fill.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { OTPInput } from '../../src/components/ui/OTPInput';
import { AdirePattern } from '../../src/components/ui/AdirePattern';
import { verifyOTP, sendOTP, getProfile, DEV_TEST_PHONES, DEV_TEST_OTP } from '../../src/lib/auth';
import { useAuthStore } from '../../src/store/authStore';
import { useProfileStore } from '../../src/store/profileStore';

const RESEND_SECONDS = 60;

export default function OTPScreen() {
  const { colors, spacing, fontSize, duration, isDark } = useTheme();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { setLoading, isLoading } = useAuthStore();
  const { setProfile } = useProfileStore();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);

  // [TEMPORARY DEV-ONLY TEST BYPASS - REMOVE BEFORE PRODUCTION LAUNCH]
  useEffect(() => {
    if (__DEV__ && DEV_TEST_PHONES.includes(phone)) {
      console.log(`[DEV ONLY] Pre-filling test OTP code ${DEV_TEST_OTP} for phone: ${phone}`);
      setCode(DEV_TEST_OTP);
    }
  }, [phone]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleVerify = useCallback(async (otp: string) => {
    if (otp.length < 6) return;
    setError(null);
    setLoading(true);

    const { userId, error: verifyError } = await verifyOTP(phone, otp);
    setLoading(false);

    if (verifyError || !userId) {
      setError(verifyError ?? 'Incorrect code. Please try again.');
      setCode('');
      return;
    }

    // Check if profile already exists (returning user)
    const profile = await getProfile(userId);
    if (profile?.onboarding_complete) {
      // Returning user — go straight to app
      router.replace('/(app)/chats');
    } else if (profile) {
      // Profile exists but onboarding not complete — resume
      router.replace('/(auth)/permissions');
    } else {
      // New user — go to username setup
      router.push({ pathname: '/(auth)/username', params: { phone, userId } });
    }
  }, [phone]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerify(code);
    }
  }, [code]);

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    await sendOTP(phone);
    setIsResending(false);
    setResendCountdown(RESEND_SECONDS);
    setCode('');
    setError(null);
  };

  const maskedPhone = phone.replace(/(\+\d{3})\d{4}(\d{4})/, '$1****$2');

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
          <Pressable
            onPress={() => router.back()}
            style={{ marginBottom: spacing[8] }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: colors.accent, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base }}>
              ← Back
            </Text>
          </Pressable>

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
            Enter your code
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
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_600SemiBold' }}>
              {maskedPhone}
            </Text>
          </Text>

          {/* [TEMPORARY DEV-ONLY BANNER - REMOVE BEFORE PRODUCTION LAUNCH] */}
          {__DEV__ && DEV_TEST_PHONES.includes(phone) && (
            <View
              style={{
                marginBottom: spacing[6],
                padding: spacing[3.5],
                backgroundColor: isDark ? 'rgba(255, 221, 0, 0.08)' : 'rgba(255, 221, 0, 0.1)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 221, 0, 0.2)' : 'rgba(255, 221, 0, 0.4)',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Nunito_600SemiBold',
                  fontSize: fontSize.xs,
                  color: isDark ? '#ffd700' : '#8b8000',
                  lineHeight: fontSize.xs * 1.4,
                }}
              >
                🛠️ <Text style={{ fontFamily: 'Nunito_700Bold' }}>Dev Bypass Active:</Text> Pre-filled test OTP <Text style={{ fontFamily: 'Nunito_700Bold' }}>{DEV_TEST_OTP}</Text> for test phone number.
              </Text>
            </View>
          )}

          <OTPInput value={code} onChange={setCode} disabled={isLoading} />

          {error && (
            <Text
              style={{
                color: colors.error,
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.sm,
                textAlign: 'center',
                marginTop: spacing[4],
              }}
            >
              {error}
            </Text>
          )}

          <View style={{ marginTop: spacing[8] }}>
            <Button
              label="Verify"
              onPress={() => handleVerify(code)}
              isLoading={isLoading}
              disabled={code.length < 6}
              fullWidth
              size="lg"
            />
          </View>

          {/* Resend */}
          <View style={{ alignItems: 'center', marginTop: spacing[6] }}>
            {resendCountdown > 0 ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: 'Nunito_400Regular',
                  fontSize: fontSize.sm,
                }}
              >
                Resend code in{' '}
                <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_600SemiBold' }}>
                  {resendCountdown}s
                </Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text
                  style={{
                    color: colors.accent,
                    fontFamily: 'Nunito_600SemiBold',
                    fontSize: fontSize.sm,
                  }}
                >
                  {isResending ? 'Sending…' : 'Resend code'}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
