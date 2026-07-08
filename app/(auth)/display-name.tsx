/**
 * Display Name + Avatar Screen
 * Optional avatar upload (Expo ImagePicker), required display name.
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
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { TextInput } from '../../src/components/ui/TextInput';
import { Avatar } from '../../src/components/ui/Avatar';
import { AdirePattern } from '../../src/components/ui/AdirePattern';
import { createProfile } from '../../src/lib/auth';
import { hashPhone } from '../../src/lib/crypto';
import { useProfileStore } from '../../src/store/profileStore';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { decodeBase64 } from 'tweetnacl-util';

export default function DisplayNameScreen() {
  const { colors, spacing, fontSize, avatarSize, isDark } = useTheme();
  const { phone, userId, username } = useLocalSearchParams<{
    phone: string;
    userId: string;
    username: string;
  }>();

  const { user } = useAuthStore();
  const { setProfile } = useProfileStore();

  const resolvedUserId = userId || user?.id || '';
  const resolvedPhone = phone || user?.phone || '';
  const resolvedUsername = username || '';

  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Compress to max 400x400, 80% quality
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setAvatarUri(compressed.uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    const ext = 'jpg';
    const path = `${resolvedUserId}.${ext}`;

    const session = useAuthStore.getState().session;
    const token = session?.access_token;
    if (!token) throw new Error('No active session token found');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: uri,
      name: `avatar.${ext}`,
      type: 'image/jpeg',
    });

    const url = `${supabaseUrl}/storage/v1/object/avatars/${path}`;
    console.log('[uploadAvatar] Direct XHR upload to URL:', url);

    return new Promise<string | null>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', supabaseAnonKey);
      xhr.setRequestHeader('x-upsert', 'true');

      xhr.onload = () => {
        console.log('[uploadAvatar] XHR status:', xhr.status, 'body:', xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            resolve(data.publicUrl);
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
        }
      };

      xhr.onerror = (e) => {
        console.error('[uploadAvatar] XHR error:', e);
        reject(new Error('Network request failed'));
      };

      xhr.send(formData as any);
    });
  };

  const handleContinue = async () => {
    if (!displayName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (!resolvedUserId) {
        setError('Authentication error: User ID is missing.');
        return;
      }
      if (!resolvedPhone) {
        setError('Authentication error: Phone number is missing.');
        return;
      }

      let avatarUrl: string | undefined;
      if (avatarUri) {
        const url = await uploadAvatar(avatarUri);
        if (url) avatarUrl = url;
      }

      const phoneHash = await hashPhone(resolvedPhone);

      const { error: createError } = await createProfile({
        userId: resolvedUserId,
        phone: resolvedPhone,
        phoneHash,
        username: resolvedUsername.toLowerCase(),
        displayName: displayName.trim(),
        avatarUrl,
      });

      if (createError) {
        setError(createError);
        return;
      }

      router.push('/(auth)/permissions');
    } catch (e: any) {
      console.error('[display-name.tsx] handleContinue caught exception:', e);
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setIsSubmitting(false);
    }
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
            Your profile
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              marginBottom: spacing[8],
            }}
          >
            Add a name so people know who you are.
          </Text>

          {/* Avatar picker */}
          <Pressable
            onPress={handlePickAvatar}
            style={{ alignSelf: 'center', marginBottom: spacing[8] }}
            accessibilityLabel="Tap to set profile photo"
          >
            <Avatar
              uri={avatarUri}
              name={displayName || username}
              size={avatarSize.xl}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: colors.accent,
                borderRadius: 14,
                width: 28,
                height: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14 }}>+</Text>
            </View>
          </Pressable>

          <TextInput
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Chiamaka Obi"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            errorText={error ?? undefined}
          />

          {/* Preview badge */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: spacing[4],
              marginTop: spacing[4],
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            <Avatar uri={avatarUri} name={displayName || username} size={40} />
            <View>
              <Text style={{ color: colors.textPrimary, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base }}>
                {displayName || 'Your name'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: fontSize.sm }}>
                @{username}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: spacing[10] }}>
            <Button
              label="Continue"
              onPress={handleContinue}
              isLoading={isSubmitting}
              disabled={!displayName.trim()}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
