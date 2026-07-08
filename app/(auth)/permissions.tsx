/**
 * Onboarding Permissions Screen
 * 3 cards: Contacts (NDPR-compliant blurb), Notifications, then Done.
 * Clear explanation of what each permission is used for.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { AdirePattern } from '../../src/components/ui/AdirePattern';
import { requestContactsPermission, syncContacts } from '../../src/lib/contacts';
import { completeOnboarding, updateNotificationsEnabled } from '../../src/lib/auth';
import { useContactsStore } from '../../src/store/contactsStore';
import { useAuthStore } from '../../src/store/authStore';

type Permission = {
  id: 'contacts' | 'notifications';
  icon: string;
  title: string;
  description: string;
  ndpr?: string; // NDPR-specific note, shown for contacts
  grantLabel: string;
  skipLabel: string;
};

const PERMISSIONS: Permission[] = [
  {
    id: 'contacts',
    icon: '👥',
    title: 'Find your people',
    description:
      'Gist will check if any of your contacts are already on the app. Your phone numbers are hashed (scrambled) before leaving your device — we never store or see them.',
    ndpr: 'Under the Nigeria Data Protection Act (NDPR), you have the right to opt out of contact sync at any time in Settings → Privacy.',
    grantLabel: 'Allow Contacts',
    skipLabel: 'Skip',
  },
  {
    id: 'notifications',
    icon: '🔔',
    title: 'Stay in the loop',
    description:
      'Get notified when someone messages you, reacts to your status, or @mentions you in a group.',
    grantLabel: 'Allow Notifications',
    skipLabel: 'Skip for now',
  },
];

export default function PermissionsScreen() {
  const { colors, spacing, fontSize, shadows, borderRadius, isDark } = useTheme();
  const { user } = useAuthStore();
  const { setContacts, setSyncing, setLastSynced } = useContactsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const permission = PERMISSIONS[currentStep];
  const isLast = currentStep === PERMISSIONS.length - 1;

  const handleGrant = async () => {
    setIsLoading(true);

    if (permission.id === 'contacts') {
      const status = await requestContactsPermission();
      if (status === 'granted') {
        setSyncing(true);
        const { matches } = await syncContacts();
        setContacts(matches);
        setLastSynced();
        setSyncing(false);
      }
    } else if (permission.id === 'notifications') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted' && user?.id) {
        await updateNotificationsEnabled(user.id, true);
      }
    }

    setIsLoading(false);
    advance();
  };

  const handleSkip = () => advance();

  const advance = async () => {
    if (isLast) {
      // Mark onboarding complete
      if (user?.id) await completeOnboarding(user.id);
      router.replace('/(app)/chats');
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Subtle Adire background texture */}
      <AdirePattern opacity={isDark ? 0.03 : 0.04} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing[6],
          paddingTop: spacing[12],
          paddingBottom: spacing[8],
        }}
      >
        {/* Step indicator */}
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[10] }}>
          {PERMISSIONS.map((_, i) => (
            <View
              key={i}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                backgroundColor: i <= currentStep ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>

        {/* Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius['2xl'],
            padding: spacing[6],
            ...shadows.lg,
            marginBottom: spacing[8],
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: spacing[4] }}>{permission.icon}</Text>

          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: fontSize.xl,
              color: colors.textPrimary,
              marginBottom: spacing[3],
              letterSpacing: -0.3,
              paddingRight: 10, // Prevent custom font glyph right-edge clipping
            }}
          >
            {permission.title}
          </Text>

          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              lineHeight: fontSize.base * 1.6,
              marginBottom: permission.ndpr ? spacing[4] : 0,
            }}
          >
            {permission.description}
          </Text>

          {permission.ndpr && (
            <View
              style={{
                backgroundColor: colors.accentSurface,
                borderRadius: borderRadius.md,
                padding: spacing[3],
                borderLeftWidth: 3,
                borderLeftColor: colors.accent,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Nunito_400Regular',
                  fontSize: fontSize.xs,
                  color: colors.textSecondary,
                  lineHeight: fontSize.xs * 1.6,
                }}
              >
                {permission.ndpr}
              </Text>
            </View>
          )}
        </View>

        {/* Progress note */}
        <Text
          style={{
            fontFamily: 'Nunito_400Regular',
            fontSize: fontSize.sm,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: spacing[6],
          }}
        >
          {currentStep + 1} of {PERMISSIONS.length}
        </Text>

        <Button
          label={permission.grantLabel}
          onPress={handleGrant}
          isLoading={isLoading}
          fullWidth
          size="lg"
        />
        <Button
          label={permission.skipLabel}
          onPress={handleSkip}
          variant="ghost"
          fullWidth
          size="md"
          style={{ marginTop: spacing[2] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
