import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { useRouter } from 'expo-router';
import { useContactsStore } from '../../../src/store/contactsStore';
import { supabase } from '../../../src/lib/supabase';
import { createDirectChat } from '../../../src/lib/messaging';
import { ArrowLeft, Search, User } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';

export default function NewChatScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const router = useRouter();

  const { contacts } = useContactsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResult(null);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, e2e_public_key')
        .eq('username', q);

      if (searchError) {
        setError(searchError.message);
      } else {
        setSearchResult(data || []);
      }
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = async (userId: string) => {
    if (creating) return;
    setCreating(true);
    setError(null);

    const chatId = await createDirectChat(userId);
    setCreating(false);

    if (chatId) {
      // Redirect to the newly created chat conversation screen
      router.replace({
        pathname: '/(app)/chats/[chatId]',
        params: { chatId },
      });
    } else {
      setError('Failed to create direct chat.');
    }
  };

  // Filter synced contacts if search query is active
  const filteredContacts = searchQuery
    ? contacts.filter(
        c =>
          c.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts;

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleSelectUser(item.id)}
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
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
          New Chat
        </Text>
      </View>

      {/* Search Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by username or name..."
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          style={{
            flex: 1,
            fontFamily: 'Nunito_400Regular',
            fontSize: fontSize.base,
            color: colors.textPrimary,
            backgroundColor: colors.background,
            borderRadius: 20,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
        />
        <TouchableOpacity
          onPress={handleSearch}
          style={{
            marginLeft: spacing[2],
            backgroundColor: colors.tabActive,
            width: 38,
            height: 38,
            borderRadius: 19,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Search size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Error display */}
      {error && (
        <View style={{ padding: spacing[4], backgroundColor: '#FFD2D2', margin: spacing[4], borderRadius: 8 }}>
          <Text style={{ fontFamily: 'Nunito_600SemiBold', color: '#D8000C', fontSize: fontSize.sm }}>{error}</Text>
        </View>
      )}

      {/* Creating chat loading indicator */}
      {creating && (
        <View style={{ padding: spacing[4], alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.tabActive} />
          <Text style={{ marginTop: 8, fontFamily: 'Nunito_400Regular', color: colors.textSecondary }}>
            Opening chat session...
          </Text>
        </View>
      )}

      {/* Content */}
      {searching ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tabActive} />
        </View>
      ) : searchResult !== null ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[3], backgroundColor: colors.background }}>
            <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, color: colors.textTertiary }}>
              SEARCH RESULT
            </Text>
          </View>
          {searchResult.length === 0 ? (
            <View style={{ padding: spacing[5], alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_400Regular', color: colors.textSecondary }}>No user found matching that username.</Text>
            </View>
          ) : (
            <FlatList
              data={searchResult}
              keyExtractor={item => item.id}
              renderItem={renderUserItem}
            />
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[3], backgroundColor: colors.background }}>
            <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, color: colors.textTertiary }}>
              SYNCED CONTACTS
            </Text>
          </View>
          {filteredContacts.length === 0 ? (
            <View style={{ padding: spacing[5], alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Nunito_400Regular', color: colors.textSecondary }}>No matched contacts found.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={item => item.id}
              renderItem={renderUserItem}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
