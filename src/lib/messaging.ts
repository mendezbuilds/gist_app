import { supabase as typedSupabase } from './supabase';
const supabase = typedSupabase as any;
import * as SecureStore from 'expo-secure-store';
import {
  deriveSharedKey,
  encryptMessageDirect,
  decryptMessageDirect,
  encryptMessageGroup,
  decryptMessageGroup,
  bytesToHex,
  hexToBytes,
  getPrivateKeyB64
} from './crypto';
import { RealtimeChannel } from '@supabase/supabase-js';

export async function deleteMessageForMe(messageId: string): Promise<void> {
  try {
    const sessionUser = (await supabase.auth.getUser()).data.user;
    if (!sessionUser) return;
    await supabase.from('message_deletions').insert({ message_id: messageId, user_id: sessionUser.id });
  } catch (e) {
    console.error('[deleteMessageForMe] Exception:', e);
  }
}

export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  try {
    const sessionUser = (await supabase.auth.getUser()).data.user;
    if (!sessionUser) return;
    
    // We only allow deleting if the user is the sender.
    // The RLS policies should enforce this, but we update encrypted_content and nonce to null.
    await supabase
      .from('messages')
      .update({ encrypted_content: null, nonce: null })
      .eq('id', messageId)
      .eq('sender_id', sessionUser.id);
  } catch (e) {
    console.error('[deleteMessageForEveryone] Exception:', e);
  }
}


export interface ChatWithMembers {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
  members: {
    user_id: string;
    role: string;
    profile: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      e2e_public_key: string;
    };
  }[];
}

export interface MessageReaction {
  user_id: string;
  emoji: string;
  created_at?: string;
}

export interface MessageWithSender {
  id: string;
  chat_id: string;
  sender_id: string;
  encrypted_content: string; // PG hex string (\x...)
  nonce: string;
  created_at: string;
  edited_at?: string;
  decrypted_text?: string; // Client-side decrypted plaintext
  message_deletions?: any[];
  message_reactions?: MessageReaction[];
  message_deliveries?: { user_id: string }[];
  reply_to_message_id?: string;
  is_forwarded?: boolean;
}

export interface MessageReadWithUser {
  message_id: string;
  user_id: string;
  read_at: string;
}

// In-memory cache for derived shared keys to make message rendering fast
const sharedKeyCache: Record<string, Uint8Array> = {};

/**
 * Fetch all chats current user is a member of, along with all member profiles.
 */
export async function fetchChats(): Promise<ChatWithMembers[]> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return [];

    const { data: memberRows, error: memberError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', myId)
      .is('deleted_at', null);

    if (memberError || !memberRows || memberRows.length === 0) return [];
    const chatIds = memberRows.map((r: any) => r.chat_id);

    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('last_message_at', { ascending: false });

    if (chatsError || !chats) return [];

    const { data: allMembers, error: allMembersError } = await supabase
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
      .in('chat_id', chatIds);

    if (allMembersError || !allMembers) return [];

    return chats.map((c: any) => {
      const members = allMembers
        .filter((m: any) => m.chat_id === c.id)
        .map((m: any) => ({
          user_id: m.user_id,
          role: m.role,
          profile: m.profile as any,
        }));
      return {
        ...c,
        members,
      } as ChatWithMembers;
    });
  } catch (e) {
    console.error('[fetchChats] Exception:', e);
    return [];
  }
}

/**
 * Fetch messages for a specific chat.
 */
export async function fetchMessages(chatId: string): Promise<MessageWithSender[]> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from('messages')
      .select('*, message_deletions(user_id), message_reactions(user_id, emoji, created_at), message_deliveries(user_id)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return (data as MessageWithSender[]).filter(m => !m.message_deletions?.some(d => d.user_id === myId));
  } catch (e) {
    console.error('[fetchMessages] Exception:', e);
    return [];
  }
}

/**
 * Decrypt a single message.
 */
export async function decryptMessage(
  message: MessageWithSender,
  chatType: 'direct' | 'group',
  members: ChatWithMembers['members'],
  myUserId: string
): Promise<string> {
  try {
    const myPrivateKeyB64 = await getPrivateKeyB64();
    if (!myPrivateKeyB64) {
      return '[Error: Local private key missing]';
    }

    const rawBytes = hexToBytes(message.encrypted_content);

    if (chatType === 'direct') {
      // Find the other member's profile
      const otherMember = members.find(m => m.user_id !== myUserId) || members.find(m => m.user_id === myUserId);
      if (!otherMember?.profile?.e2e_public_key) {
        return '[Error: Recipient public key missing]';
      }

      const cacheKey = otherMember.user_id;
      let sharedKey = sharedKeyCache[cacheKey];
      if (!sharedKey) {
        sharedKey = deriveSharedKey(otherMember.profile.e2e_public_key, myPrivateKeyB64);
        sharedKeyCache[cacheKey] = sharedKey;
      }

      if (__DEV__) {
        console.log('[DEV ONLY] E2E Decryption Details:', {
          chatId: message.chat_id,
          messageId: message.id,
          recipientPubKeyB64: otherMember.profile.e2e_public_key,
        });
      }

      const plaintext = decryptMessageDirect(rawBytes, message.nonce, sharedKey);
      if (__DEV__ && !plaintext) {
        console.warn(`[DEV ONLY] Decryption failed for message ${message.id}. Nonce: ${message.nonce}`);
      }
      return plaintext || '[Decryption failed]';
    } else {
      // Group chat
      const senderMember = members.find(m => m.user_id === message.sender_id);
      if (!senderMember?.profile?.e2e_public_key) {
        return '[Error: Sender public key missing]';
      }

      const decrypted = decryptMessageGroup(
        rawBytes,
        myUserId,
        message.sender_id,
        myPrivateKeyB64,
        senderMember.profile.e2e_public_key
      );
      return decrypted || '[Decryption failed]';
    }
  } catch (e) {
    console.error('[decryptMessage] Decryption exception:', e);
    return '[Error: Decryption exception]';
  }
}

/**
 * Encrypt and send a message.
 */
export async function sendMessage(
  chatId: string,
  plaintext: string,
  chatType: 'direct' | 'group',
  members: ChatWithMembers['members'],
  options?: { replyToMessageId?: string; isForwarded?: boolean }
): Promise<{ error: string | null }> {
  try {
    const myPrivateKeyB64 = await getPrivateKeyB64();
    if (!myPrivateKeyB64) {
      return { error: 'E2E private key is missing on this device.' };
    }

    const sessionUser = (await supabase.auth.getUser()).data.user;
    if (!sessionUser) return { error: 'No active session found.' };
    const myUserId = sessionUser.id;

    let pgHexContent = '';
    let messageNonce = '';

    if (chatType === 'direct') {
      const otherMember = members.find(m => m.user_id !== myUserId) || members.find(m => m.user_id === myUserId);
      if (!otherMember?.profile?.e2e_public_key) {
        return { error: 'Recipient E2E public key is not available.' };
      }

      const cacheKey = otherMember.user_id;
      let sharedKey = sharedKeyCache[cacheKey];
      if (!sharedKey) {
        sharedKey = deriveSharedKey(otherMember.profile.e2e_public_key, myPrivateKeyB64);
        sharedKeyCache[cacheKey] = sharedKey;
      }

      const { ciphertextBytes, nonceB64 } = encryptMessageDirect(plaintext, sharedKey);
      pgHexContent = bytesToHex(ciphertextBytes);
      messageNonce = nonceB64;
    } else {
      // Group chat
      const memberKeys: Record<string, string> = {};
      for (const m of members) {
        if (m.profile?.e2e_public_key) {
          memberKeys[m.user_id] = m.profile.e2e_public_key;
        }
      }

      const { payloadBytes, senderNonceB64 } = encryptMessageGroup(
        plaintext,
        memberKeys,
        myPrivateKeyB64,
        myUserId
      );

      pgHexContent = bytesToHex(payloadBytes);
      messageNonce = senderNonceB64;
    }

    // Insert message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: myUserId,
        encrypted_content: pgHexContent as any,
        nonce: messageNonce,
        reply_to_message_id: options?.replyToMessageId || null,
        is_forwarded: options?.isForwarded || false,
      });

    if (insertError) {
      return { error: insertError.message };
    }

    // Update chat last_message_at
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    return { error: null };
  } catch (e: any) {
    console.error('[sendMessage] Exception:', e);
    return { error: e.message || 'An unexpected error occurred.' };
  }
}

/**
 * Start a direct 1-on-1 chat.
 * Check for an existing direct chat first to avoid duplication.
 */
export async function createDirectChat(recipientId: string): Promise<string | null> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return null;

    // Step 1: Get all chat IDs for myId
    const { data: myMemberships } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', myId);

    if (myMemberships && myMemberships.length > 0) {
      const myChatIds = myMemberships.map((m: any) => m.chat_id);
      
      // Step 2: See if recipient is in any of these chats
      const { data: theirMemberships } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', recipientId)
        .in('chat_id', myChatIds);

      if (theirMemberships && theirMemberships.length > 0) {
        const sharedChatIds = theirMemberships.map((m: any) => m.chat_id);

        // Step 3: Check which of these shared chats is actually a 'direct' chat
        const { data: directChats } = await supabase
          .from('chats')
          .select('id')
          .in('id', sharedChatIds)
          .eq('type', 'direct')
          .limit(1);

        if (directChats && directChats.length > 0) {
          return directChats[0].id;
        }
      }
    }

    // Step 4: Create new direct chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type: 'direct',
        created_by: myId,
      })
      .select('id')
      .single();

    if (chatError || !newChat) {
      console.error('[createDirectChat] Error creating chat:', chatError);
      return null;
    }

    // Step 5: Add members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: newChat.id, user_id: myId, role: 'admin' },
        { chat_id: newChat.id, user_id: recipientId, role: 'member' },
      ]);

    if (membersError) {
      console.error('[createDirectChat] Error adding members:', membersError);
      // Rollback: delete the created chat to prevent orphan chats
      await supabase.from('chats').delete().eq('id', newChat.id);
      return null;
    }

    return newChat.id;
  } catch (e) {
    console.error('[createDirectChat] Exception:', e);
    return null;
  }
}

/**
 * Start a group chat.
 */
export async function createGroupChat(
  name: string,
  memberIds: string[],
  avatarUrl?: string | null
): Promise<string | null> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return null;

    // Create chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type: 'group',
        name,
        avatar_url: avatarUrl || null,
        created_by: myId,
      })
      .select('id')
      .single();

    if (chatError || !newChat) {
      console.error('[createGroupChat] Error creating chat:', chatError);
      return null;
    }

    // Build member rows
    const memberRows = [
      { chat_id: newChat.id, user_id: myId, role: 'admin' },
      ...memberIds.map(userId => ({
        chat_id: newChat.id,
        user_id: userId,
        role: 'member',
      })),
    ];

    const { error: membersError } = await supabase
      .from('chat_members')
      .insert(memberRows);

    if (membersError) {
      console.error('[createGroupChat] Error adding members:', membersError);
      return null;
    }

    return newChat.id;
  } catch (e) {
    console.error('[createGroupChat] Exception:', e);
    return null;
  }
}

/**
 * Fetch read receipts for a specific chat.
 */
export async function fetchMessageReads(chatId: string): Promise<MessageReadWithUser[]> {
  try {
    const { data, error } = await supabase
      .from('message_reads')
      .select('message_id, user_id, read_at, messages!inner(chat_id)')
      .eq('messages.chat_id', chatId);

    if (error || !data) return [];
    return data.map((r: any) => ({
      message_id: r.message_id,
      user_id: r.user_id,
      read_at: r.read_at,
    }));
  } catch (e) {
    console.error('[fetchMessageReads] Exception:', e);
    return [];
  }
}

/**
 * Mark a message as read by the current user.
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;

    await supabase
      .from('message_reads')
      .upsert({ message_id: messageId, user_id: myId }, { onConflict: 'message_id,user_id' });
  } catch (e) {
    console.error('[markMessageAsRead] Exception:', e);
  }
}

/**
 * Subscribe to typing presence for a chat.
 */
export function subscribeToTyping(
  chatId: string,
  myUserId: string,
  onTypingUpdate: (typingUserIds: string[]) => void
): RealtimeChannel {
  const channel = supabase.channel(`typing:${chatId}`, {
    config: {
      presence: {
        key: myUserId,
      },
    },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const typingIds: string[] = [];
    for (const [key, presences] of Object.entries(state)) {
      if (key !== myUserId) {
        const isTyping = presences.some((p: any) => p.isTyping);
        if (isTyping) {
          typingIds.push(key);
        }
      }
    }
    onTypingUpdate(typingIds);
  });

  channel.subscribe();
  return channel;
}

/**
 * Update typing status on a presence channel.
 */
export async function updateTypingStatus(channel: RealtimeChannel, isTyping: boolean): Promise<void> {
  if (channel.state === 'SUBSCRIBED' || channel.state === 'JOINED') {
    await channel.track({ isTyping });
  }
}

export async function markMessageAsDelivered(messageId: string): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;

    await supabase
      .from('message_deliveries')
      .upsert({ message_id: messageId, user_id: myId }, { onConflict: 'message_id,user_id' });
  } catch (e) {
    console.error('[markMessageAsDelivered] Exception:', e);
  }
}

export async function addReaction(messageId: string, emoji: string): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;

    await supabase
      .from('message_reactions')
      .upsert({ message_id: messageId, user_id: myId, emoji }, { onConflict: 'message_id,user_id' });
  } catch (e) {
    console.error('[addReaction] Exception:', e);
  }
}

export async function editMessage(
  message: MessageWithSender,
  newPlaintext: string,
  chatType: 'direct' | 'group',
  members: ChatWithMembers['members']
): Promise<{ error: string | null }> {
  try {
    const myPrivateKeyB64 = await getPrivateKeyB64();
    if (!myPrivateKeyB64) return { error: 'E2E private key is missing on this device.' };

    const myUserId = message.sender_id;
    let pgHexContent = '';
    let messageNonce = '';

    if (chatType === 'direct') {
      const otherMember = members.find(m => m.user_id !== myUserId) || members.find(m => m.user_id === myUserId);
      if (!otherMember?.profile?.e2e_public_key) return { error: 'Recipient E2E public key is not available.' };

      const cacheKey = otherMember.user_id;
      let sharedKey = sharedKeyCache[cacheKey];
      if (!sharedKey) {
        sharedKey = deriveSharedKey(otherMember.profile.e2e_public_key, myPrivateKeyB64);
        sharedKeyCache[cacheKey] = sharedKey;
      }

      const { ciphertextBytes, nonceB64 } = encryptMessageDirect(newPlaintext, sharedKey);
      pgHexContent = bytesToHex(ciphertextBytes);
      messageNonce = nonceB64;
    } else {
      const memberKeys: Record<string, string> = {};
      for (const m of members) {
        if (m.profile?.e2e_public_key) {
          memberKeys[m.user_id] = m.profile.e2e_public_key;
        }
      }

      const { payloadBytes, senderNonceB64 } = encryptMessageGroup(
        newPlaintext,
        memberKeys,
        myPrivateKeyB64,
        myUserId
      );

      pgHexContent = bytesToHex(payloadBytes);
      messageNonce = senderNonceB64;
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({
        encrypted_content: pgHexContent,
        nonce: messageNonce,
        edited_at: new Date().toISOString()
      })
      .eq('id', message.id);

    if (updateError) return { error: updateError.message };
    return { error: null };
  } catch (e: any) {
    console.error('[editMessage] Exception:', e);
    return { error: e.message || 'An unexpected error occurred.' };
  }
}

/**
 * Chat Preferences: Pin, Mute, Archive
 */
export async function pinChat(chatId: string, pin: boolean): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;
    await supabase.from('chat_members').update({ pinned_at: pin ? new Date().toISOString() : null }).eq('chat_id', chatId).eq('user_id', myId);
  } catch (e) {
    console.error('[pinChat] Exception:', e);
  }
}

export async function muteChat(chatId: string, durationMs?: number): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;
    const mutedUntil = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
    await supabase.from('chat_members').update({ muted_until: mutedUntil }).eq('chat_id', chatId).eq('user_id', myId);
  } catch (e) {
    console.error('[muteChat] Exception:', e);
  }
}

export async function archiveChat(chatId: string, archive: boolean): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;
    await supabase.from('chat_members').update({ archived_at: archive ? new Date().toISOString() : null }).eq('chat_id', chatId).eq('user_id', myId);
  } catch (e) {
    console.error('[archiveChat] Exception:', e);
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    const myId = (await supabase.auth.getUser()).data.user?.id;
    if (!myId) return;
    await supabase.from('chat_members').update({ deleted_at: new Date().toISOString() }).eq('chat_id', chatId).eq('user_id', myId);
  } catch (e) {
    console.error('[deleteChat] Exception:', e);
  }
}
