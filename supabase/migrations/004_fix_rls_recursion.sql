-- Migration: 004_fix_rls_recursion
-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions.

-- 1. Create helper functions
create or replace function public.is_chat_member(p_chat_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = p_user_id
  );
end;
$$;

create or replace function public.is_chat_admin(p_chat_id uuid, p_user_id uuid)
returns boolean
security definer
set search_path = public
language plpgsql
as $$
begin
  return exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = p_user_id and role = 'admin'
  );
end;
$$;

-- 2. Drop existing recursive policies
drop policy if exists "chats_select" on chats;
drop policy if exists "chats_update" on chats;
drop policy if exists "chat_members_select" on chat_members;
drop policy if exists "chat_members_delete" on chat_members;
drop policy if exists "messages_select" on messages;
drop policy if exists "messages_insert" on messages;

-- 3. Re-create policies using the new functions
-- chats select & update
create policy "chats_select" on chats for select to authenticated
  using (auth.uid() = created_by or public.is_chat_member(id, auth.uid()));

create policy "chats_update" on chats for update to authenticated
  using (public.is_chat_member(id, auth.uid()));

-- chat_members select & delete
create policy "chat_members_select" on chat_members for select to authenticated
  using (public.is_chat_member(chat_id, auth.uid()));

create policy "chat_members_delete" on chat_members for delete to authenticated
  using (user_id = auth.uid() or public.is_chat_admin(chat_id, auth.uid()));

-- messages select & insert
create policy "messages_select" on messages for select to authenticated
  using (public.is_chat_member(chat_id, auth.uid()));

create policy "messages_insert" on messages for insert to authenticated
  with check (
    sender_id = auth.uid() 
    and public.is_chat_member(chat_id, auth.uid())
  );
