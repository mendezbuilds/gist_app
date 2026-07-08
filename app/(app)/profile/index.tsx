/**
 * Profile Screen — functional in Phase 1.
 * Shows username, display name, avatar, edit placeholder, and sign out.
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { signOut, getProfile } from '../../../src/lib/auth';
import { useAuthStore } from '../../../src/store/authStore';
import { useProfileStore } from '../../../src/store/profileStore';

export default function ProfileScreen() {
  const { colors, spacing, fontSize, borderRadius, shadows } = useTheme();
  const { user, reset: resetAuth } = useAuthStore();
  const { profile, setProfile, reset: resetProfile } = useProfileStore();

  useEffect(() => {
    if (user?.id && !profile) {
      getProfile(user.id).then((p) => {
        if (p) setProfile(p);
      });
    }
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          resetAuth();
          resetProfile();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[8] }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: spacing[5],
            paddingTop: spacing[4],
            paddingBottom: spacing[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.lg,
              color: colors.textPrimary,
            }}
          >
            Profile
          </Text>
        </View>

        {/* Avatar + name */}
        <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
          <Avatar
            uri={profile?.avatar_url}
            name={profile?.display_name ?? ''}
            size={88}
          />
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.xl,
              color: colors.textPrimary,
              marginTop: spacing[4],
            }}
          >
            {profile?.display_name ?? '—'}
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            @{profile?.username ?? '—'}
          </Text>
        </View>

        {/* Info cards */}
        <View style={{ paddingHorizontal: spacing[5], gap: spacing[3] }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm }}>
              Phone number
            </Text>
            <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, marginTop: 2 }}>
              Hidden — never shown to others
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm }}>
              E2E encryption
            </Text>
            <Text style={{ color: colors.success, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, marginTop: 2 }}>
              ✓ Keys generated on this device
            </Text>
          </View>

          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_500Medium', fontSize: fontSize.base }}>
              Edit Profile
            </Text>
            <Text style={{ color: colors.textSecondary }}>›</Text>
          </Pressable>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[8] }}>
          <Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
