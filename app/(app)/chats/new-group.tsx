import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { useRouter } from 'expo-router';
import { useContactsStore } from '../../../src/store/contactsStore';
import { createGroupChat } from '../../../src/lib/messaging';
import { useAuthStore } from '../../../src/store/authStore';
import { supabase } from '../../../src/lib/supabase';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function NewGroupScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const router = useRouter();

  const { contacts } = useContactsStore();
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleSelect = (userId: string) => {
    setSelectedIds(current => {
      if (current.includes(userId)) {
        return current.filter(id => id !== userId);
      } else {
        return [...current, userId];
      }
    });
  };

  const handlePickImage = async () => {
    setError(null);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setError('Camera roll access is required to pick a group avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Compress and resize
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setAvatarUri(compressed.uri);
    }
  };

  const uploadGroupAvatar = async (uri: string, tempGroupId: string): Promise<string | null> => {
    const ext = 'jpg';
    const path = `group_${tempGroupId}.${ext}`;

    const session = useAuthStore.getState().session;
    const token = session?.access_token;
    if (!token) throw new Error('No active session token found');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: uri,
      name: `group_avatar.${ext}`,
      type: 'image/jpeg',
    });

    const url = `${supabaseUrl}/storage/v1/object/avatars/${path}`;
    console.log('[uploadGroupAvatar] Direct XHR upload to URL:', url);

    return new Promise<string | null>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', supabaseAnonKey);
      xhr.setRequestHeader('x-upsert', 'true');

      xhr.onload = () => {
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
        reject(new Error('Network request failed'));
      };

      xhr.send(formData as any);
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedIds.length === 0 || creating) return;
    setCreating(true);
    setError(null);

    try {
      const tempId = Math.random().toString(36).substring(7);
      let uploadedUrl: string | null = null;

      if (avatarUri) {
        uploadedUrl = await uploadGroupAvatar(avatarUri, tempId);
      }

      const chatId = await createGroupChat(groupName.trim(), selectedIds, uploadedUrl);
      setCreating(false);

      if (chatId) {
        router.replace({
          pathname: '/(app)/chats/[chatId]',
          params: { chatId },
        });
      } else {
        setError('Failed to create group chat.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to upload group avatar or create group.');
      setCreating(false);
    }
  };

  const renderContactItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleToggleSelect(item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[5],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Avatar uri={item.avatar_url} name={item.display_name} size={45} />
        
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.base,
              color: colors.textPrimary,
            }}
          >
            {item.display_name}
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.sm,
              color: colors.textSecondary,
            }}
          >
            @{item.username}
          </Text>
        </View>

        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: isSelected ? colors.tabActive : colors.border,
            backgroundColor: isSelected ? colors.tabActive : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: spacing[2] }}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.lg,
              color: colors.textPrimary,
            }}
          >
            New Group
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={!groupName.trim() || selectedIds.length === 0 || creating}
          style={{
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1] + 2,
            backgroundColor: (groupName.trim() && selectedIds.length > 0) ? colors.tabActive : colors.border,
            borderRadius: 16,
          }}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: fontSize.sm,
                color: '#FFFFFF',
              }}
            >
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Setup Group Info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing[4],
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {/* Group Avatar Picker */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickImage}
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing[4],
              borderColor: colors.border,
              borderWidth: 1,
              overflow: 'hidden',
            }}
          >
            {avatarUri ? (
              <Avatar uri={avatarUri} name={groupName || 'G'} size={70} />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <Camera size={20} color={colors.textTertiary} />
                <Text
                  style={{
                    fontFamily: 'Nunito_400Regular',
                    fontSize: fontSize.xs - 2,
                    color: colors.textTertiary,
                    marginTop: 2,
                  }}
                >
                  ADD PHOTO
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Group Name Input */}
          <View style={{ flex: 1 }}>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name..."
              placeholderTextColor={colors.textTertiary}
              maxLength={50}
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: fontSize.base,
                color: colors.textPrimary,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingVertical: spacing[1],
              }}
            />
            <Text
              style={{
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.xs,
                color: colors.textTertiary,
                marginTop: 4,
              }}
            >
              Please provide a group subject and optional icon.
            </Text>
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View style={{ padding: spacing[4], backgroundColor: '#FFD2D2', margin: spacing[4], borderRadius: 8 }}>
            <Text style={{ fontFamily: 'Nunito_600SemiBold', color: '#D8000C', fontSize: fontSize.sm }}>{error}</Text>
          </View>
        )}

        {/* Selection summary */}
        <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[3], backgroundColor: colors.background }}>
          <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, color: colors.textTertiary }}>
            SELECT MEMBERS ({selectedIds.length} SELECTED)
          </Text>
        </View>

        {/* Contact List */}
        {contacts.length === 0 ? (
          <View style={{ padding: spacing[5], alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Nunito_400Regular', color: colors.textSecondary }}>No matched contacts available.</Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            renderItem={renderContactItem}
            scrollEnabled={false} // Since nested inside ScrollView
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
