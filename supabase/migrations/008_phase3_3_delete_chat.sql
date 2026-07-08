-- Add deleted_at to chat_members
ALTER TABLE chat_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
