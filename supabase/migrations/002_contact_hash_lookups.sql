-- Migration: 002_contact_hash_lookups
-- Temporary staging table for contact sync matching.
-- Rows are transient — cleaned up after each match operation.

create table contact_hash_lookups (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  phone_hashes text[] not null,
  created_at timestamptz not null default now()
);

-- Auto-expire: the Edge Function deletes rows after responding.
-- This table is a safety net, not long-term storage.
-- Enable RLS — only the Edge Function (service role) can write.
alter table contact_hash_lookups enable row level security;

-- No client-side access — Edge Function uses service role key
-- (service role bypasses RLS by default)

-- Optional: pg_cron cleanup for any orphaned rows (if pg_cron extension enabled)
-- select cron.schedule('cleanup-contact-lookups', '*/5 * * * *',
--   $$delete from contact_hash_lookups where created_at < now() - interval '5 minutes'$$);
