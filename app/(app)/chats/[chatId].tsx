import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Modal, TouchableWithoutFeedback, Pressable, Animated as RNAnimated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { supabase as typedSupabase } from '../../../src/lib/supabase';
const supabase = typedSupabase as any;
import {
  fetchMessages,
  decryptMessage,
  sendMessage,
  fetchMessageReads,
  markMessageAsRead,
  subscribeToTyping,
  updateTypingStatus,
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
  addReaction,
  fetchChats,
  ChatWithMembers,
  MessageWithSender,
  MessageReadWithUser,
  MessageReaction
} from '../../../src/lib/messaging';
import { ArrowLeft, Send, Lock, Info, Smile, Camera, Paperclip, Mic, Trash2, Edit2, X, CornerUpLeft, Forward, Check, MessageSquare } from 'lucide-react-native';
import { Avatar } from '../../../src/components/ui/Avatar';
import { AdirePattern } from '../../../src/components/ui/AdirePattern';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, SlideInRight, SlideInLeft, ZoomIn, FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

const SingleTick = ({ color, size = 16 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DoubleTick = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 5L8 14l-4-4"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 5l-9 9"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
// Removed BlurView to prevent Android crash

const TypingIndicatorDot = ({ delay }: { delay: number }) => {
  const { colors, spacing } = useTheme();
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.8, { duration: 400 })
        ),
        -1,
        true
      );
    }, delay);
  }, [delay, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={[animatedStyle, {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.typingDot || colors.brandHighlight,
      marginRight: spacing[1],
    }]} />
  );
};

const activeDecryptionCache: Record<string, string> = {};


const MessageBubble = React.memo(({
  item,
  isMe,
  showTimeSeparator,
  isContinuation,
  repliedMessage,
  senderDisplayName,
  senderAvatarUrl,
  isGroup,
  isReadByOther,
  isDeliveredToOther,
  readByNames,
  theme,
  onLongPress,
  onPressBubble,
  onReply,
  onScrollToIndex
}: any) => {
  const { colors, spacing, fontSize, borderRadius } = theme;
  const msgDate = new Date(item.created_at);
  const timeString = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const showSenderName = isGroup && !isMe && senderDisplayName && !isContinuation;

  const bRadius = isMe ? borderRadius.bubbleMine : borderRadius.bubbleTheirs;
  const dynamicBorderRadius = {
    borderTopLeftRadius: !isMe && isContinuation ? 4 : bRadius.topLeft,
    borderTopRightRadius: isMe && isContinuation ? 4 : bRadius.topRight,
    borderBottomLeftRadius: bRadius.bottomLeft,
    borderBottomRightRadius: bRadius.bottomRight,
  };

  const swipeRef = useRef<any>(null);

  return (
    <Animated.View 
      entering={item._isNew ? (isMe ? FadeIn.duration(150) : FadeInDown.springify().damping(15)) : undefined}
      layout={Layout.springify()}
      style={{ width: '100%', paddingVertical: isContinuation ? 2 : spacing[1] }}
    >
      {showTimeSeparator && (
        <View style={{ alignItems: 'center', marginVertical: spacing[4] }}>
          <Text
            style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: fontSize.xs,
              color: colors.textSecondary,
              backgroundColor: colors.surfaceElevated,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {timeString}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          paddingHorizontal: spacing[4],
        }}
      >
        {!isMe && isGroup && (
          <View style={{ width: 30, marginRight: spacing[2], justifyContent: 'flex-end' }}>
            {!isContinuation && (
              <Avatar
                uri={senderAvatarUrl || undefined}
                name={senderDisplayName || '?'}
                size={30}
              />
            )}
          </View>
        )}

        <View style={{ maxWidth: '78%' }}>
          <Swipeable
            ref={swipeRef}
            onSwipeableWillOpen={() => {
              onReply(item);
              setTimeout(() => swipeRef.current?.close(), 500);
            }}
            renderLeftActions={(progress, dragX) => {
              const scale = dragX.interpolate({
                inputRange: [0, 40],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              });
              return (
                <View style={{ justifyContent: 'center', paddingLeft: spacing[2], paddingRight: spacing[4] }}>
                  <RNAnimated.View style={{ transform: [{ scale }] }}>
                    <CornerUpLeft size={24} color={colors.textTertiary} />
                  </RNAnimated.View>
                </View>
              );
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => onLongPress(item)}
              onPress={() => onPressBubble(item, readByNames)}
              style={[
                {
                  backgroundColor: isMe ? colors.bubbleMine : colors.bubbleTheirs,
                  paddingTop: spacing[3],
                  paddingBottom: spacing[2],
                  paddingHorizontal: spacing[4],
                  borderColor: isMe ? 'transparent' : colors.border,
                  borderWidth: isMe ? 0 : 1,
                  overflow: 'hidden',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                },
                dynamicBorderRadius
              ]}
            >
            {isMe && <AdirePattern opacity={0.2} strokeColor="#FFFFFF" width="100%" height="100%" style={{ zIndex: 0 }} />}
            
            {item.is_forwarded && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Forward size={12} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, fontStyle: 'italic' }}>Forwarded</Text>
              </View>
            )}

            {repliedMessage && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onScrollToIndex(repliedMessage.id)}
                style={{
                  backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : colors.surfaceOverlay,
                  borderLeftWidth: 3,
                  borderLeftColor: isMe ? '#FFF' : colors.brandHighlight,
                  padding: spacing[2],
                  borderRadius: 6,
                  marginBottom: spacing[2],
                }}
              >
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 11, color: isMe ? '#FFF' : colors.brandHighlight, marginBottom: 2 }}>
                  {repliedMessage.sender_id === item.sender_id ? 'You' : (repliedMessage.senderDisplayName || 'Someone')}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: 'Nunito_400Regular', fontSize: 12, color: isMe ? 'rgba(255,255,255,0.9)' : colors.textSecondary }}>
                  {repliedMessage.decrypted_text || 'Message...'}
                </Text>
              </TouchableOpacity>
            )}

            {showSenderName && (
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.xs, color: colors.accent, marginBottom: 2 }}>
                {senderDisplayName}
              </Text>
            )}
            
            <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.base, color: isMe ? colors.bubbleMineText : colors.bubbleTheirsText, lineHeight: 22 }}>
              {item.decrypted_text || 'Decrypting...'}
              {item.edited_at && <Text style={{ fontSize: 10, opacity: 0.7 }}> (edited)</Text>}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 }}>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Nunito_600SemiBold', color: isMe ? 'rgba(255,255,255,0.7)' : colors.textTertiary, marginRight: isMe && !isGroup ? 4 : 0 }}>
                  {timeString}
                </Text>
                {isMe && !isGroup && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isReadByOther ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <DoubleTick size={16} color={colors.brandHighlight} />
                      </Animated.View>
                    ) : isDeliveredToOther ? (
                      <DoubleTick size={16} color={colors.bubbleMineText} />
                    ) : (
                      <SingleTick size={15} color={colors.bubbleMineText} />
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
          </Swipeable>

          {item.message_reactions && item.message_reactions.length > 0 && (
            <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', backgroundColor: colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignSelf: isMe ? 'flex-end' : 'flex-start', borderWidth: 1, borderColor: colors.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
              {Array.from(new Set(item.message_reactions.map((r: any) => r.emoji))).map((emoji: any, i) => (
                <Text key={i} style={{ fontSize: 12, marginRight: 2 }}>{emoji}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}, (prev, next) => {
  return (
    prev.item.decrypted_text === next.item.decrypted_text &&
    prev.item.edited_at === next.item.edited_at &&
    prev.item.message_reactions?.length === next.item.message_reactions?.length &&
    prev.showTimeSeparator === next.showTimeSeparator &&
    prev.isContinuation === next.isContinuation &&
    prev.isReadByOther === next.isReadByOther &&
    prev.isDeliveredToOther === next.isDeliveredToOther &&
    prev.readByNames.length === next.readByNames.length &&
    prev.item.is_forwarded === next.item.is_forwarded &&
    prev.item.encrypted_content === next.item.encrypted_content
  );
});

export default function ChatRoomScreen() {
  const { colors, spacing, fontSize, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const [chat, setChat] = useState<ChatWithMembers | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [messageReads, setMessageReads] = useState<MessageReadWithUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithSender | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageWithSender | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<MessageWithSender | null>(null);
  
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [allChats, setAllChats] = useState<ChatWithMembers[]>([]);
  const [selectedForwardChats, setSelectedForwardChats] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);

  const sendButtonScale = useSharedValue(1);
  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }]
  }));
  
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadChatAndMessages = async () => {
    if (!chatId) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        setMyUserId(user.id);
      }

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError || !chatData) {
        console.error('[ChatRoom] Fetch chat error:', chatError);
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          user_id,
          role,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url,
            e2e_public_key
          )
        `)
        .eq('chat_id', chatId);

      if (membersError || !membersData) {
        console.error('[ChatRoom] Fetch members error:', membersError);
        return;
      }

      const assembledChat = {
        ...chatData,
        members: membersData.map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          profile: m.profile,
        })),
      } as ChatWithMembers;

      setChat(assembledChat);

      const msgs = await fetchMessages(chatId);
      
      const decryptedMsgs = await Promise.all(
        msgs.map(async (msg) => {
          const cached = activeDecryptionCache[msg.id];
          if (cached) {
            return { ...msg, decrypted_text: cached };
          }
          const text = await decryptMessage(msg, assembledChat.type, assembledChat.members, user?.id || '');
          activeDecryptionCache[msg.id] = text;
          return { ...msg, decrypted_text: text };
        })
      );

      setMessages(decryptedMsgs);

      const reads = await fetchMessageReads(chatId);
      setMessageReads(reads);

    } catch (e) {
      console.error('[ChatRoom] loadChatAndMessages exception:', e);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  useEffect(() => {
    loadChatAndMessages();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat-room-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as MessageWithSender;

          if (!chat) return;

          const cached = activeDecryptionCache[newMsg.id];
          let decryptedText = '';
          if (cached) {
            decryptedText = cached;
          } else {
            decryptedText = await decryptMessage(newMsg, chat.type, chat.members, myUserId || '');
            activeDecryptionCache[newMsg.id] = decryptedText;
          }

          newMsg.decrypted_text = decryptedText;
          (newMsg as any)._isNew = true;

          setMessages((current) => {
            if (current.some(m => m.id === newMsg.id)) return current;
            
            // Trigger haptics if message is from someone else
            if (newMsg.sender_id !== myUserId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            let removedTemp = false;
            const withoutTemp = current.filter(m => {
              if (m.sender_id === newMsg.sender_id && !removedTemp && m.id.startsWith('temp-') && m.decrypted_text === newMsg.decrypted_text) {
                removedTemp = true;
                return false;
              }
              return true;
            });

            const updated = [...withoutTemp, newMsg];
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
            return updated;
          });
        }
      )
      .subscribe();

    const readsChannel = supabase
      .channel(`chat-reads-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload: any) => {
          const newRead = payload.new as MessageReadWithUser;
          setMessageReads(prev => [...prev, newRead]);
          // Force FlatList to re-render this specific message item
          setMessages(current => current.map(m => m.id === newRead.message_id ? { ...m } : m));
        }
      )
      .subscribe();

    const deliveriesChannel = supabase
      .channel(`chat-deliveries-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_deliveries' },
        (payload: any) => {
          const { message_id, user_id } = payload.new;
          setMessages(current => current.map(m => m.id === message_id ? { ...m, message_deliveries: [...(m.message_deliveries || []), { user_id }] } : m));
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`chat-reactions-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (payload: any) => {
          const { message_id, user_id, emoji } = payload.new;
          setMessages(current => current.map(m => m.id === message_id ? { ...m, message_reactions: [...(m.message_reactions || []), { user_id, emoji }] } : m));
        }
      )
      .subscribe();

    const messagesUpdateChannel = supabase
      .channel(`chat-messages-update-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        async (payload: any) => {
          const updatedMsg = payload.new as MessageWithSender;
          setMessages(current => current.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
          if (chat) {
            const text = await decryptMessage(updatedMsg, chat.type, chat.members, myUserId || '');
            activeDecryptionCache[updatedMsg.id] = text;
            setMessages(current => current.map(m => m.id === updatedMsg.id ? { ...m, decrypted_text: text } : m));
          }
        }
      )
      .subscribe();

    if (myUserId) {
      typingChannelRef.current = subscribeToTyping(chatId, myUserId, setTypingUsers);
    }

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(readsChannel);
      supabase.removeChannel(deliveriesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(messagesUpdateChannel);
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, chat, myUserId]);

  useEffect(() => {
    if (!myUserId || !chat || !isFocused) return;
    const unreadMessages = messages.filter(m => m.sender_id !== myUserId && !messageReads.some(r => r.message_id === m.id && r.user_id === myUserId));
    
    unreadMessages.forEach(m => {
      markMessageAsRead(m.id);
      setMessageReads(prev => {
        if (prev.some(r => r.message_id === m.id && r.user_id === myUserId)) return prev;
        return [...prev, { message_id: m.id, user_id: myUserId, read_at: new Date().toISOString() }];
      });
    });
  }, [messages, messageReads, myUserId, chat]);

  const handleDeleteForMe = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setContextMenuVisible(false);
    setSelectedMessage(null);
    
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    // Background execution
    await deleteMessageForMe(msgId);
  };

  const handleDeleteForEveryone = async () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setContextMenuVisible(false);
    setSelectedMessage(null);
    
    // Optimistic update - set encrypted_content to null
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, encrypted_content: null, nonce: null } : m));
    
    // Background execution
    await deleteMessageForEveryone(msgId);
  };

  const handleReaction = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setContextMenuVisible(false);
    setSelectedMessage(null);
    await addReaction(msgId, emoji);
  };

  const handleStartEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setInputText(selectedMessage.decrypted_text || '');
    setContextMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleStartReply = () => {
    if (!selectedMessage) return;
    setReplyingMessage(selectedMessage);
    setContextMenuVisible(false);
    setSelectedMessage(null);
  };

  const handleStartForward = async () => {
    if (!selectedMessage) return;
    setContextMenuVisible(false);
    setForwardModalVisible(true);
    setSelectedForwardChats([]);
    const fetchedChats = await fetchChats();
    setAllChats(fetchedChats);
  };

  const executeForward = async () => {
    if (!selectedMessage || selectedForwardChats.length === 0) return;
    setForwarding(true);
    const textToForward = selectedMessage.decrypted_text || '';
    
    for (const targetChatId of selectedForwardChats) {
      const targetChat = allChats.find(c => c.id === targetChatId);
      if (targetChat) {
        await sendMessage(targetChat.id, textToForward, targetChat.type, targetChat.members, { isForwarded: true });
      }
    }
    
    setForwarding(false);
    setForwardModalVisible(false);
    setSelectedMessage(null);
    setSelectedForwardChats([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (typingChannelRef.current) {
      updateTypingStatus(typingChannelRef.current, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (typingChannelRef.current) updateTypingStatus(typingChannelRef.current, false);
      }, 3000);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chat || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    if (typingChannelRef.current) updateTypingStatus(typingChannelRef.current, false);

    if (!editingMessage) {
      const optimisticMsg: MessageWithSender = {
        id: 'temp-' + Date.now(),
        chat_id: chat.id,
        sender_id: myUserId || '',
        encrypted_content: '',
        nonce: '',
        created_at: new Date().toISOString(),
        decrypted_text: textToSend,
        reply_to_message_id: replyingMessage?.id,
      };
      (optimisticMsg as any)._isNew = true;
      setMessages(current => [...current, optimisticMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Yield to let React Native render the optimistic update before heavy encryption
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    let error = null;
    if (editingMessage) {
      const res = await editMessage(editingMessage, textToSend, chat.type, chat.members);
      error = res.error;
      setEditingMessage(null);
    } else {
      const res = await sendMessage(chat.id, textToSend, chat.type, chat.members, { replyToMessageId: replyingMessage?.id });
      error = res.error;
      setReplyingMessage(null);
    }
    
    setSending(false);

    if (error) {
      alert(`Failed to send message: ${error}`);
      setInputText(textToSend);
    } else {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const navigateToInfo = () => {
    if (chat?.type === 'group') {
      router.push({ pathname: '/(app)/chats/group-info', params: { chatId } });
    }
  };

  let chatTitle = 'Chat';
  let avatarUrl = null;
  let fallbackText = '?';
  let isGroup = false;

  if (chat && myUserId) {
    isGroup = chat.type === 'group';
    if (isGroup) {
      chatTitle = chat.name || 'Group Chat';
      avatarUrl = chat.avatar_url;
      fallbackText = chat.name || 'Group';
    } else {
      const other = chat.members.find(m => m.user_id !== myUserId) || chat.members[0];
      if (other?.profile) {
        chatTitle = other.profile.display_name;
        avatarUrl = other.profile.avatar_url;
        fallbackText = other.profile.display_name;
      }
    }
  }

  
  const handleScrollToMessage = useCallback((msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx !== -1) flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  }, [messages]);

  const handlePressBubble = useCallback((item: MessageWithSender, readByNames: string[]) => {
    if (isGroup && item.sender_id === myUserId) {
      if (readByNames.length > 0) {
        alert(`Read by:\n${readByNames.join('\n')}`);
      } else {
        alert('Not read by anyone yet');
      }
    }
  }, [isGroup, myUserId]);

  const handleLongPressBubble = useCallback((item: MessageWithSender) => {
    setSelectedMessage(item);
    setContextMenuVisible(true);
    import('expo-haptics').then(Haptics => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }, []);

  const handleReplyBubble = useCallback((item: MessageWithSender) => {
    setSelectedMessage(item);
    handleStartReply();
  }, [handleStartReply]);

  const renderMessageItem = useCallback(({ item, index }: { item: MessageWithSender; index: number }) => {
    if (item.encrypted_content === null) return null;

    const isMe = item.sender_id === myUserId;
    
    let showTimeSeparator = false;
    let isContinuation = false;

    if (index === 0) {
      showTimeSeparator = true;
    } else {
      const prevMsg = messages[index - 1];
      const prevDate = new Date(prevMsg.created_at);
      const currDate = new Date(item.created_at);
      const diffMs = currDate.getTime() - prevDate.getTime();
      if (diffMs / 60000 > 10) showTimeSeparator = true;
      else if (prevMsg.sender_id === item.sender_id) isContinuation = true;
    }

    const sender = chat?.members.find(m => m.user_id === item.sender_id);
    const repliedMessage = item.reply_to_message_id ? messages.find(m => m.id === item.reply_to_message_id) : undefined;
    
    let repliedMessageWithSender;
    if (repliedMessage) {
      const repliedSender = chat?.members.find(m => m.user_id === repliedMessage.sender_id);
      repliedMessageWithSender = { ...repliedMessage, senderDisplayName: repliedSender?.profile?.display_name };
    }

    const isReadByOther = messageReads.some(r => r.message_id === item.id && r.user_id !== myUserId);
    const isDeliveredToOther = item.message_deliveries?.some(d => d.user_id !== myUserId) ?? false;
    const readByNames = (isGroup && isMe) 
      ? messageReads.filter(r => r.message_id === item.id && r.user_id !== myUserId).map(r => chat?.members.find(m => m.user_id === r.user_id)?.profile?.display_name || 'Unknown')
      : [];

    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        showTimeSeparator={showTimeSeparator}
        isContinuation={isContinuation}
        repliedMessage={repliedMessageWithSender}
        senderDisplayName={sender?.profile?.display_name}
        senderAvatarUrl={sender?.profile?.avatar_url}
        isGroup={isGroup}
        isReadByOther={isReadByOther}
        isDeliveredToOther={isDeliveredToOther}
        readByNames={readByNames}
        theme={{ colors, spacing, fontSize, borderRadius }}
        onLongPress={handleLongPressBubble}
        onPressBubble={handlePressBubble}
        onReply={handleReplyBubble}
        onScrollToIndex={handleScrollToMessage}
      />
    );
  }, [messages, messageReads, myUserId, chat, isGroup, colors, spacing, fontSize, borderRadius, handleScrollToMessage, handlePressBubble, handleLongPressBubble, handleReplyBubble]);

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    let text = 'Someone is typing...';
    if (typingUsers.length === 1 && chat) {
      const user = chat.members.find(m => m.user_id === typingUsers[0]);
      if (user?.profile) text = `${user.profile.display_name.split(' ')[0]} is typing...`;
    } else if (typingUsers.length > 1) {
      text = 'Several people are typing...';
    }

    return (
      <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[2] }}>
        <TypingIndicatorDot delay={0} />
        <TypingIndicatorDot delay={150} />
        <TypingIndicatorDot delay={300} />
        <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.xs, color: colors.textTertiary, marginLeft: spacing[2] }}>
          {text}
        </Text>
      </Animated.View>
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
          backgroundColor: colors.surfaceOverlay,
          zIndex: 10,
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: spacing[2], padding: 4 }}
            >
              <ArrowLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToInfo}
              disabled={!isGroup}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            >
              <Avatar
                uri={avatarUrl || undefined}
                name={fallbackText}
                size={42}
              />
              <View style={{ marginLeft: spacing[3], flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'Nunito_700Bold',
                    fontSize: fontSize.lg,
                    color: colors.textPrimary,
                  }}
                >
                  {chatTitle}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                  <Lock size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                  <Text
                    style={{
                      fontFamily: 'Nunito_400Regular',
                      fontSize: fontSize.xs,
                      color: colors.textTertiary,
                    }}
                  >
                    {isGroup ? 'Group E2E Encrypted' : 'Direct E2E Encrypted'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {isGroup && (
            <TouchableOpacity onPress={navigateToInfo} style={{ padding: spacing[2], backgroundColor: colors.surfaceElevated, borderRadius: 20 }}>
              <Info size={22} color={colors.tabActive} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.tabActive} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messageReads}
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={{ paddingVertical: spacing[4] }}
          />
        )}

        {renderTypingIndicator()}

        {/* Glassmorphism Input Bar */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surfaceOverlay,
            paddingBottom: Math.max(insets.bottom, spacing[2]),
          }}
        >
          {editingMessage && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Edit2 size={16} color={colors.brandHighlight} style={{ marginRight: spacing[2] }} />
                <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.sm, color: colors.brandHighlight }}>
                  Editing Message
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {replyingMessage && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: colors.brandHighlight, paddingLeft: spacing[2] }}>
                <CornerUpLeft size={16} color={colors.textTertiary} style={{ marginRight: spacing[2] }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.brandHighlight }}>
                    Replying to {replyingMessage.sender_id === myUserId ? 'You' : chat?.members.find(m => m.user_id === replyingMessage.sender_id)?.profile?.display_name || 'Someone'}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.textSecondary }}>
                    {replyingMessage.decrypted_text || 'Message...'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyingMessage(null)} style={{ padding: spacing[1] }}>
                <X size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              backgroundColor: colors.surfaceElevated,
              borderRadius: 24,
              paddingHorizontal: spacing[2],
              paddingVertical: Platform.OS === 'ios' ? spacing[2] : spacing[1],
              borderWidth: 1,
              borderColor: colors.border,
              marginHorizontal: spacing[4],
              marginVertical: spacing[2],
            }}
          >
            <TouchableOpacity style={{ padding: spacing[2], marginBottom: 2 }}>
              <Smile size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={{ padding: spacing[2], marginBottom: 2 }}>
              <Paperclip size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            <TextInput
              value={inputText}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                fontFamily: 'Nunito_400Regular',
                fontSize: fontSize.base,
                color: colors.textPrimary,
                maxHeight: 120,
                paddingTop: Platform.OS === 'ios' ? 10 : 8,
                paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                paddingHorizontal: spacing[1],
              }}
            />

            <TouchableOpacity style={{ padding: spacing[2], marginBottom: 2 }}>
              <Camera size={24} color={colors.textTertiary} />
            </TouchableOpacity>

            <Pressable
              onPressIn={() => { sendButtonScale.value = withSpring(0.85, { damping: 15, stiffness: 400 }); }}
              onPressOut={() => { sendButtonScale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
              onPress={inputText.trim() ? handleSend : undefined}
              disabled={sending}
            >
              <Animated.View
                style={[
                  sendButtonStyle,
                  {
                    marginLeft: spacing[1],
                    backgroundColor: inputText.trim() ? colors.brandHighlight : colors.surfaceElevated,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: inputText.trim() ? 0 : 1,
                    borderColor: colors.border,
                  }
                ]}
              >
                {inputText.trim() ? (
                  <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
                ) : (
                  <Mic size={20} color={colors.textTertiary} />
                )}
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={contextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setContextMenuVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ 
                width: 250, 
                backgroundColor: colors.surfaceElevated, 
                borderRadius: 16, 
                padding: spacing[2],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  {['👍','❤️','😂','😮','😢','🙏'].map(emoji => (
                    <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)}>
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {selectedMessage?.sender_id === myUserId && (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}
                    onPress={handleStartEdit}
                  >
                    <Edit2 size={20} color={colors.textPrimary} style={{ marginRight: spacing[3] }} />
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textPrimary }}>Edit</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={handleStartReply}
                >
                  <CornerUpLeft size={20} color={colors.textPrimary} style={{ marginRight: spacing[3] }} />
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textPrimary }}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={handleStartForward}
                >
                  <Forward size={20} color={colors.textPrimary} style={{ marginRight: spacing[3] }} />
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textPrimary }}>Forward</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderBottomWidth: selectedMessage?.sender_id === myUserId ? 1 : 0, borderBottomColor: colors.border }}
                  onPress={handleDeleteForMe}
                >
                  <Trash2 size={20} color={colors.textPrimary} style={{ marginRight: spacing[3] }} />
                  <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textPrimary }}>Delete for me</Text>
                </TouchableOpacity>

                {selectedMessage?.sender_id === myUserId && (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', padding: spacing[3] }}
                    onPress={handleDeleteForEveryone}
                  >
                    <Trash2 size={20} color={colors.error || '#FF4C4C'} style={{ marginRight: spacing[3] }} />
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.error || '#FF4C4C' }}>Delete for everyone</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Forward Modal */}
      <Modal
        visible={forwardModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setForwardModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, marginTop: insets.top + 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.lg, color: colors.textPrimary }}>Forward to...</Text>
            <TouchableOpacity onPress={executeForward} disabled={selectedForwardChats.length === 0 || forwarding}>
              {forwarding ? <ActivityIndicator size="small" color={colors.brandHighlight} /> : (
                <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.base, color: selectedForwardChats.length > 0 ? colors.brandHighlight : colors.textTertiary }}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={allChats}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedForwardChats.includes(item.id);
              let title = item.name || 'Group Chat';
              if (item.type !== 'group' && myUserId) {
                const other = item.members.find(m => m.user_id !== myUserId) || item.members[0];
                if (other?.profile) title = other.profile.display_name;
              }
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedForwardChats(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', marginRight: spacing[3] }}>
                      {item.type === 'group' ? <MessageSquare size={20} color={colors.textSecondary} /> : <Avatar uri={item.type !== 'group' ? item.members.find(m => m.user_id !== myUserId)?.profile?.avatar_url : item.avatar_url} name={title} size={40} />}
                    </View>
                    <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base, color: colors.textPrimary }}>{title}</Text>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: isSelected ? 0 : 2, borderColor: colors.border, backgroundColor: isSelected ? colors.brandHighlight : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    {isSelected && <Check size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'relative',
  },
});

