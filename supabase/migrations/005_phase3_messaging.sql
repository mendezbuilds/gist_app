-- Migration: 005_phase3_messaging
-- Phase 3: Receipts, Reactions, Deletions, Organization, Safety

-- 1. Modify existing tables
ALTER TABLE messages ALTER COLUMN encrypted_content DROP NOT NULL;
ALTER TABLE messages ALTER COLUMN nonce DROP NOT NULL;
ALTER TABLE messages ADD COLUMN edited_at timestamptz;

ALTER TABLE chat_members ADD COLUMN pinned_at timestamptz;
ALTER TABLE chat_members ADD COLUMN muted_until timestamptz;
ALTER TABLE chat_members ADD COLUMN archived_at timestamptz;

-- 2. message_reads
CREATE TABLE message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- 3. message_reactions
CREATE TABLE message_reactions (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- 4. message_deletions (Delete for me)
CREATE TABLE message_deletions (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (message_id, user_id)
);

-- 5. blocks
CREATE TABLE blocks (
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- 6. reports
CREATE TABLE reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  reason text not null,
  details text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Message Reads Policies (Can view reads in your chats, can insert your own read)
CREATE POLICY "message_reads_select" ON message_reads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_members cm ON cm.chat_id = m.chat_id
    WHERE m.id = message_reads.message_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "message_reads_insert" ON message_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Message Reactions Policies (Can view reactions in your chats, can insert/update/delete your own)
CREATE POLICY "message_reactions_select" ON message_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_members cm ON cm.chat_id = m.chat_id
    WHERE m.id = message_reactions.message_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "message_reactions_insert" ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_reactions_update" ON message_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "message_reactions_delete" ON message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Message Deletions Policies (Can only see/insert/delete your own deletions)
CREATE POLICY "message_deletions_select" ON message_deletions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "message_deletions_insert" ON message_deletions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Blocks Policies (Can only see/insert/delete your own blocks)
CREATE POLICY "blocks_select" ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert" ON blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete" ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- Reports Policies (Can only see/insert your own reports)
CREATE POLICY "reports_select" ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert" ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Also allow messages to be updated for edits and delete-for-everyone
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
