import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Pressable, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { useRouter } from 'expo-router';
import { fetchChats, decryptMessage, markMessageAsDelivered, ChatWithMembers, MessageWithSender, pinChat, muteChat, archiveChat, deleteChat } from '../../../src/lib/messaging';
import { useMessagingStore } from '../../../src/store/messagingStore';
import { supabase } from '../../../src/lib/supabase';
import { MessageSquarePlus, Users, Lock, Search, Plus, MessageSquare, BellOff, Archive, Pin } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import { RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInUp } from 'react-native-reanimated';

const lastMessageTextCache: Record<string, string> = {};

const ChatListItem = ({ 
  item, 
  myUserId, 
  preview,
  isMeLastSender,
  unreadCount,
  onPress,
  onLongPress
}: { 
  item: ChatWithMembers, 
  myUserId: string | null, 
  preview: string,
  isMeLastSender: boolean,
  unreadCount: number,
  onPress: () => void,
  onLongPress: () => void
}) => {
  const { colors, spacing, fontSize } = useTheme();
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const isGroup = item.type === 'group';
  
  let title = item.name || 'Group Chat';
  let avatarUrl = item.avatar_url;
  let fallbackText = '?';

  const myMemberInfo = item.members.find(m => m.user_id === myUserId);
  const isPinned = !!myMemberInfo?.pinned_at;
  const isMuted = myMemberInfo?.muted_until ? new Date(myMemberInfo.muted_until) > new Date() : false;

  if (!isGroup && myUserId) {
    const other = item.members.find(m => m.user_id !== myUserId) || item.members[0];
    if (other?.profile) {
      title = other.profile.display_name;
      avatarUrl = other.profile.avatar_url;
      fallbackText = other.profile.display_name;
    }
  } else if (isGroup) {
    fallbackText = item.name || 'Group';
  }

  let timeText = '';
  if (item.last_message_at) {
    const date = new Date(item.last_message_at);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      timeText = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 400 }); }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View style={[animatedStyle, {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <View style={{
          padding: 2,
          borderRadius: 50,
          borderWidth: 2,
          borderColor: 'transparent', // Will be colored when Status is implemented
        }}>
          <Avatar
            uri={avatarUrl || undefined}
            name={fallbackText}
            size={56}
          />
        </View>
        
        <View style={{ flex: 1, marginLeft: spacing[3], marginRight: spacing[2] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Nunito_700Bold',
                  fontSize: fontSize.lg,
                  color: colors.textPrimary,
                  flexShrink: 1,
                }}
              >
                {title}
              </Text>
              {isMuted && <BellOff size={14} color={colors.textTertiary} style={{ marginLeft: spacing[1] }} />}
              {isPinned && <Pin size={14} color={colors.textTertiary} style={{ marginLeft: spacing[1] }} />}
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: spacing[2] }}>
              <Text
                style={{
                  fontFamily: 'Nunito_400Regular',
                  fontSize: fontSize.xs,
                  color: unreadCount > 0 ? colors.brandHighlight : colors.textSecondary,
                  marginBottom: unreadCount > 0 ? 2 : 0,
                }}
              >
                {timeText}
              </Text>
              {unreadCount > 0 && (
                <View style={{
                  backgroundColor: colors.brandHighlight,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 6,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontFamily: 'Nunito_700Bold' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Lock size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text
              numberOfLines={1}
              style={{
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.sm,
                color: colors.textSecondary,
                flex: 1,
              }}
            >
              {isMeLastSender ? `You: ${preview}` : preview}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default function ChatsScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [chats, setChats] = useState<ChatWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lastSenders, setLastSenders] = useState<Record<string, string>>({});

  const { unreadCounts, setUnreadCounts, incrementUnread } = useMessagingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups' | 'Archived'>('All');

  const loadData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        setMyUserId(user.id);
        const { data: unreads } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
        if (unreads) {
          const counts: Record<string, number> = {};
          unreads.forEach((row: any) => counts[row.chat_id] = row.unread_count);
          setUnreadCounts(counts);
        }
      }
      const data = await fetchChats();
      setChats(data);

      for (const chat of data) {
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && msgs && msgs.length > 0) {
          const lastMsg = msgs[0] as MessageWithSender;
          setLastSenders(prev => ({ ...prev, [chat.id]: lastMsg.sender_id }));
          const cached = lastMessageTextCache[lastMsg.id];
          if (cached) {
            setPreviews(prev => ({ ...prev, [chat.id]: cached }));
          } else {
            const text = await decryptMessage(lastMsg, chat.type, chat.members, user?.id || '');
            lastMessageTextCache[lastMsg.id] = text;
            setPreviews(prev => ({ ...prev, [chat.id]: text }));
          }
        } else {
          setPreviews(prev => ({ ...prev, [chat.id]: 'No messages yet' }));
        }
      }
    } catch (e) {
      console.error('[ChatsScreen] loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('public-messages-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as MessageWithSender;
          
          setChats(currentChats => {
            const chatIndex = currentChats.findIndex(c => c.id === newMsg.chat_id);
            if (chatIndex === -1) {
              return currentChats;
            }

            const updatedChats = [...currentChats];
            const [chat] = updatedChats.splice(chatIndex, 1);
            chat.last_message_at = newMsg.created_at;
            updatedChats.unshift(chat);

            (async () => {
              const text = await decryptMessage(newMsg, chat.type, chat.members, myUserId || '');
              lastMessageTextCache[newMsg.id] = text;
              setPreviews(prev => ({ ...prev, [chat.id]: text }));
              setLastSenders(prev => ({ ...prev, [chat.id]: newMsg.sender_id }));
              
              if (newMsg.sender_id !== myUserId) {
                incrementUnread(chat.id);
                markMessageAsDelivered(newMsg.id);
              }
            })();

            return updatedChats;
          });
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel('public-chat-members')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${myUserId}` },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(membersChannel);
    };
  }, [myUserId]);

  // Polling loop removed to rely entirely on realtime events and reduce overhead

  const filteredChats = useMemo(() => {
    let result = chats;

    // Filter by archived state
    if (activeFilter === 'Archived') {
      result = result.filter(c => {
        const me = c.members.find(m => m.user_id === myUserId);
        return me?.archived_at != null;
      });
    } else {
      result = result.filter(c => {
        const me = c.members.find(m => m.user_id === myUserId);
        return me?.archived_at == null;
      });
      
      if (activeFilter === 'Groups') {
        result = result.filter(c => c.type === 'group');
      }
      // Unread filtering can be added here
    }

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => {
        let title = c.name || 'Group Chat';
        if (c.type !== 'group' && myUserId) {
          const other = c.members.find(m => m.user_id !== myUserId) || c.members[0];
          if (other?.profile) {
            title = other.profile.display_name;
          }
        }
        return title.toLowerCase().includes(lowerQuery);
      });
    }

    // Sort by pinned_at then last_message_at
    result.sort((a, b) => {
      const meA = a.members.find(m => m.user_id === myUserId);
      const meB = b.members.find(m => m.user_id === myUserId);
      
      const aPinned = meA?.pinned_at ? new Date(meA.pinned_at).getTime() : 0;
      const bPinned = meB?.pinned_at ? new Date(meB.pinned_at).getTime() : 0;
      
      if (aPinned !== bPinned) {
        return bPinned - aPinned; // Pinned first, then by pin time descending
      }
      
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });

    return result;
  }, [chats, searchQuery, activeFilter, myUserId]);

  const handleLongPressChat = (chat: ChatWithMembers) => {
    const me = chat.members.find(m => m.user_id === myUserId);
    if (!me) return;
    
    const isPinned = !!me.pinned_at;
    const isMuted = me.muted_until ? new Date(me.muted_until) > new Date() : false;
    const isArchived = !!me.archived_at;
    
    // In React Native, standard Alert doesn't have multiple options easily configurable on web, 
    // but on iOS/Android Alert can take up to 3 buttons. 
    // For a context menu with 4 options (Pin, Mute, Archive, Cancel), 
    // we could build a custom ActionSheet, but since Expo web is involved,
    // we'll just use window.confirm on web or simple logic for now.
    
    if (Platform.OS === 'web') {
      const action = window.prompt(`Options for chat:\n1. ${isPinned ? 'Unpin' : 'Pin'}\n2. ${isMuted ? 'Unmute' : 'Mute'}\n3. ${isArchived ? 'Unarchive' : 'Archive'}\n4. Delete Chat\nEnter number:`);
      if (action === '1') handlePin(chat.id, !isPinned);
      if (action === '2') handleMute(chat.id, !isMuted);
      if (action === '3') handleArchive(chat.id, !isArchived);
      if (action === '4') handleDeleteChat(chat.id);
    } else {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Chat Options',
          '',
          [
            { text: isPinned ? 'Unpin' : 'Pin', onPress: () => handlePin(chat.id, !isPinned) },
            { text: isMuted ? 'Unmute' : 'Mute', onPress: () => handleMute(chat.id, !isMuted) },
            { text: isArchived ? 'Unarchive' : 'Archive', onPress: () => handleArchive(chat.id, !isArchived) },
            { text: 'Delete Chat', onPress: () => handleDeleteChat(chat.id), style: 'destructive' },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
  };

  const handlePin = async (chatId: string, pin: boolean) => {
    await pinChat(chatId, pin);
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          members: c.members.map(m => m.user_id === myUserId ? { ...m, pinned_at: pin ? new Date().toISOString() : null } : m)
        };
      }
      return c;
    }));
  };

  const handleMute = async (chatId: string, mute: boolean) => {
    const duration = mute ? 1000 * 60 * 60 * 24 * 365 : undefined; // Mute for 1 year
    await muteChat(chatId, duration);
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          members: c.members.map(m => m.user_id === myUserId ? { ...m, muted_until: mute ? new Date(Date.now() + duration!).toISOString() : null } : m)
        };
      }
      return c;
    }));
  };

  const handleArchive = async (chatId: string, archive: boolean) => {
    await archiveChat(chatId, archive);
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          members: c.members.map(m => m.user_id === myUserId ? { ...m, archived_at: archive ? new Date().toISOString() : null } : m)
        };
      }
      return c;
    }));
  };

  const renderFilterChip = (label: 'All' | 'Unread' | 'Groups' | 'Archived') => {
    const isActive = activeFilter === label;
    return (
      <TouchableOpacity
        onPress={() => setActiveFilter(label)}
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          backgroundColor: isActive ? colors.accent : colors.surfaceElevated,
          borderRadius: 20,
          marginRight: spacing[2],
          borderWidth: 1,
          borderColor: isActive ? 'transparent' : colors.border,
        }}
      >
        <Text style={{
          fontFamily: isActive ? 'Nunito_700Bold' : 'Nunito_600SemiBold',
          fontSize: fontSize.sm,
          color: isActive ? colors.textInverse : colors.textPrimary,
        }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Glassmorphism Header */}
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background, // Match list background
          zIndex: 10,
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[4],
        }}>
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 32,
              color: colors.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Chats
          </Text>
          
          <View style={{ flexDirection: 'row', gap: spacing[4] }}>
            {/* New Group moved here based on user preference */}
            <TouchableOpacity
              onPress={() => router.push('/(app)/chats/new-group')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                backgroundColor: colors.surfaceElevated,
                padding: spacing[2],
                borderRadius: 20,
              }}
            >
              <Users size={20} color={colors.tabActive} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 12,
            paddingHorizontal: spacing[3],
            paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search chats..."
              placeholderTextColor={colors.textTertiary}
              style={{
                flex: 1,
                marginLeft: spacing[2],
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.base,
                color: colors.textPrimary,
                paddingVertical: spacing[1],
              }}
            />
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[4] }}
        >
          {renderFilterChip('All')}
          {renderFilterChip('Unread')}
          {renderFilterChip('Groups')}
          {renderFilterChip('Archived')}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tabActive} />
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <Text style={{ fontSize: 48 }}>💬</Text>
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.lg,
              color: colors.textPrimary,
            }}
          >
            No chats found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Animated.View entering={FadeInUp.duration(300)}>
              <ChatListItem
                item={item}
                myUserId={myUserId}
                preview={previews[item.id] || 'Decrypting...'}
                isMeLastSender={lastSenders[item.id] === myUserId}
                unreadCount={unreadCounts[item.id] || 0}
                onPress={() => router.push({ pathname: '/(app)/chats/[chatId]', params: { chatId: item.id } })}
                onLongPress={() => handleLongPressChat(item)}
              />
            </Animated.View>
          )}
          refreshing={loading}
          onRefresh={loadData}
          contentContainerStyle={{ paddingBottom: 160 }} // Extra padding to clear FAB and floating tab bar
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(app)/chats/new')}
        style={{
          position: 'absolute',
          bottom: 104, // Hover elegantly above the floating tab bar
          right: spacing[5],
          backgroundColor: colors.brandHighlight, // Coral
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 4,
          shadowColor: colors.brandHighlight,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          zIndex: 20,
        }}
      >
        <MessageSquarePlus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
