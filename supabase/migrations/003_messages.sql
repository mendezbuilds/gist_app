-- Migration: 003_messages
-- Phase 2: Chats, Chat Members, and E2E Encrypted Messages

create table chats (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text,              -- group name, null for direct chats
  avatar_url text,        -- group avatar, null for direct chats
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  last_message_at timestamptz default now()  -- for sorting chat list
);

create table chat_members (
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade,
  sender_id uuid references profiles(id),
  encrypted_content bytea not null,   -- ciphertext, never plaintext
  nonce text not null,                -- XSalsa20-Poly1305 nonce, base64
  created_at timestamptz default now()
);

create index idx_messages_chat_id_created_at on messages(chat_id, created_at);
create index idx_chat_members_user_id on chat_members(user_id);

-- Enable RLS
alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;

-- Drop existing policies if any
drop policy if exists "chats_select" on chats;
drop policy if exists "chats_insert" on chats;
drop policy if exists "chats_update" on chats;

drop policy if exists "chat_members_select" on chat_members;
drop policy if exists "chat_members_insert" on chat_members;
drop policy if exists "chat_members_delete" on chat_members;

drop policy if exists "messages_select" on messages;
drop policy if exists "messages_insert" on messages;

-- chats policies: readable/writable only by members
create policy "chats_select" on chats for select to authenticated
  using (exists (select 1 from chat_members where chat_id = id and user_id = auth.uid()));

create policy "chats_insert" on chats for insert to authenticated
  with check (auth.uid() = created_by);

create policy "chats_update" on chats for update to authenticated
  using (exists (select 1 from chat_members where chat_id = id and user_id = auth.uid()));

-- chat_members policies: readable by members of the same chat
create policy "chat_members_select" on chat_members for select to authenticated
  using (exists (select 1 from chat_members where chat_id = chat_id and user_id = auth.uid()));

create policy "chat_members_insert" on chat_members for insert to authenticated
  with check (true); -- Allow members to be added

create policy "chat_members_delete" on chat_members for delete to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from chat_members where chat_id = chat_id and user_id = auth.uid() and role = 'admin'
  ));

-- messages policies: readable/writable only by members
create policy "messages_select" on messages for select to authenticated
  using (exists (select 1 from chat_members where chat_id = chat_id and user_id = auth.uid()));

create policy "messages_insert" on messages for insert to authenticated
  with check (
    sender_id = auth.uid() 
    and exists (select 1 from chat_members where chat_id = chat_id and user_id = auth.uid())
  );

-- Enable Supabase Realtime for these tables
alter publication supabase_realtime add table chats;
alter publication supabase_realtime add table chat_members;
alter publication supabase_realtime add table messages;
