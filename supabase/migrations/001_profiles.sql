-- Migration: 001_profiles
-- Phase 1: User identity table with E2E public key foundation

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  phone_hash text unique not null,      -- SHA-256(E.164 phone), used for contact matching
  username text unique not null,        -- public handle, lowercase
  display_name text not null,
  avatar_url text,
  e2e_public_key text not null,         -- Curve25519 public key (base64); required for Phase 2 X3DH
  onboarding_complete boolean not null default false,
  notifications_enabled boolean not null default false,
  last_active_visible boolean not null default true,  -- mutual-hide toggle (Phase 3)
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index profiles_username_idx on profiles (username);
create index profiles_phone_hash_idx on profiles (phone_hash);

-- Username must be 3-20 lowercase alphanumeric + underscore
alter table profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,20}$');

-- Row Level Security
alter table profiles enable row level security;

-- Any authenticated user can read public profile info
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

-- Users can only insert their own profile
create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can delete their own profile (account deletion, Phase 9)
create policy "profiles_delete_own"
  on profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Storage bucket for avatars (run in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
