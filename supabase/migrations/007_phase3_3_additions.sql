-- Migration: 007_phase3_3_additions
-- Phase 3.3: Pin, Mute, Archive, Reply, Forward

-- 1. Modify existing tables
ALTER TABLE messages ADD COLUMN reply_to_message_id uuid references messages(id) on delete set null;
ALTER TABLE messages ADD COLUMN is_forwarded boolean default false;

-- 2. Trigger for auto-unarchiving chats on new message
CREATE OR REPLACE FUNCTION unarchive_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Unarchive the chat for everyone except the sender
  UPDATE chat_members
  SET archived_at = NULL
  WHERE chat_id = NEW.chat_id AND user_id != NEW.sender_id AND archived_at IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unarchive_chat ON messages;

CREATE TRIGGER trigger_unarchive_chat
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION unarchive_chat_on_message();
