import React, { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useProfileStore } from '../src/store/profileStore';
import { View, ActivityIndicator } from 'react-native';
import { useColors } from '../src/theme';
import { getProfile } from '../src/lib/auth';

export default function Index() {
  const { session, isInitialized } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const colors = useColors();

  useEffect(() => {
    if (isInitialized) {
      if (session?.user?.id) {
        setIsCheckingProfile(true);
        getProfile(session.user.id)
          .then((p) => {
            setProfile(p);
          })
          .catch((err) => {
            console.error('Error fetching profile on startup:', err);
          })
          .finally(() => {
            setIsCheckingProfile(false);
          });
      } else {
        setIsCheckingProfile(false);
      }
    }
  }, [isInitialized, session]);

  if (!isInitialized || isCheckingProfile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (session) {
    if (profile?.onboarding_complete) {
      return <Redirect href="/(app)/chats" />;
    } else if (profile) {
      return <Redirect href="/(auth)/permissions" />;
    } else {
      return <Redirect href="/(auth)/username" />;
    }
  }

  return <Redirect href="/(auth)/welcome" />;
}
