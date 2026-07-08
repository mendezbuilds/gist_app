-- Migration: 006_phase4_additions
-- Phase 4: Deliveries and Unread counts

-- 1. message_deliveries
CREATE TABLE message_deliveries (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  delivered_at timestamptz default now(),
  primary key (message_id, user_id)
);

ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_deliveries_select" ON message_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM messages m
    JOIN chat_members cm ON cm.chat_id = m.chat_id
    WHERE m.id = message_deliveries.message_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "message_deliveries_insert" ON message_deliveries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE message_deliveries;

-- 2. get_unread_counts RPC
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id uuid) 
RETURNS TABLE(chat_id uuid, unread_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT m.chat_id, count(m.id) as unread_count
  FROM messages m
  JOIN chat_members cm ON cm.chat_id = m.chat_id
  WHERE cm.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = m.id AND mr.user_id = p_user_id
    )
  GROUP BY m.chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
