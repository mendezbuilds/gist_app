/**
 * Database types — manually maintained until supabase gen types is configured.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Profile = {
  id: string;
  phone: string;
  phone_hash: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  e2e_public_key: string;
  onboarding_complete: boolean;
  notifications_enabled: boolean;
  last_active_visible: boolean;
  last_active_at: string | null;
  created_at: string;
};

export type PublicProfile = Pick<
  Profile,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'e2e_public_key' | 'last_active_visible' | 'last_active_at'
>;

export type Chat = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  last_message_at: string;
};

export type ChatMember = {
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  pinned_at: string | null;
  muted_until: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  encrypted_content: string | null; // bytea in Postgres, hex string locally
  nonce: string | null;
  edited_at: string | null;
  created_at: string;
  reply_to_message_id: string | null;
  is_forwarded: boolean;
};

export type MessageRead = {
  message_id: string;
  user_id: string;
  read_at: string;
};

export type MessageReaction = {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

// Database schema type (for typed Supabase client)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      chats: {
        Row: Chat;
        Insert: Omit<Chat, 'id' | 'created_at' | 'last_message_at'> & { id?: string; created_at?: string; last_message_at?: string };
        Update: Partial<Omit<Chat, 'id' | 'created_at'>>;
      };
      chat_members: {
        Row: ChatMember;
        Insert: Omit<ChatMember, 'joined_at' | 'pinned_at' | 'muted_until' | 'archived_at' | 'deleted_at'> & { joined_at?: string; pinned_at?: string | null; muted_until?: string | null; archived_at?: string | null; deleted_at?: string | null };
        Update: Partial<Omit<ChatMember, 'chat_id' | 'user_id' | 'joined_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'edited_at' | 'is_forwarded' | 'reply_to_message_id'> & { id?: string; created_at?: string; edited_at?: string | null; is_forwarded?: boolean; reply_to_message_id?: string | null };
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      message_reads: {
        Row: MessageRead;
        Insert: Omit<MessageRead, 'read_at'> & { read_at?: string };
        Update: Partial<Omit<MessageRead, 'message_id' | 'user_id'>>;
      };
      message_reactions: {
        Row: MessageReaction;
        Insert: Omit<MessageReaction, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<MessageReaction, 'message_id' | 'user_id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
