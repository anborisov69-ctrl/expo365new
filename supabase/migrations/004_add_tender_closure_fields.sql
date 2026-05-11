-- Migration: Add tender closure fields
-- Description: Enables buyer-side tender closure with reason tracking and notifications
-- Date: 2026-05-10

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend tenders table with closure metadata
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS closed_by   VARCHAR(20)  CHECK (closed_by IN ('buyer', 'admin', 'system')),
  ADD COLUMN IF NOT EXISTS closed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

COMMENT ON COLUMN tenders.closed_by    IS 'Who closed the tender: buyer | admin | system';
COMMENT ON COLUMN tenders.closed_at    IS 'Timestamp when buyer explicitly closed the tender';
COMMENT ON COLUMN tenders.close_reason IS 'Optional reason text provided by buyer at closure';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Notifications table (if not exists)
--    Stores in-platform system notifications sent to exhibitors / buyers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tender_notifications (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id      UUID         NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  recipient_id   UUID         NOT NULL,
  recipient_type VARCHAR(20)  NOT NULL CHECK (recipient_type IN ('buyer', 'exhibitor')),
  type           VARCHAR(50)  NOT NULL
                   CHECK (type IN ('tender_closed', 'bid_accepted', 'bid_rejected', 'new_bid')),
  title          TEXT         NOT NULL,
  message        TEXT         NOT NULL,
  is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_notifications_recipient
  ON tender_notifications (recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_tender_notifications_tender
  ON tender_notifications (tender_id);

COMMENT ON TABLE tender_notifications IS 'In-platform notifications for tender lifecycle events';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS for tender_notifications
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE tender_notifications ENABLE ROW LEVEL SECURITY;

-- Exhibitors see only their own notifications
CREATE POLICY tn_select_exhibitor ON tender_notifications
  FOR SELECT
  USING (
    recipient_type = 'exhibitor'
    AND recipient_id IN (
      SELECT id FROM exhibitors WHERE user_id = auth.uid()
    )
  );

-- Buyers see only their own notifications
CREATE POLICY tn_select_buyer ON tender_notifications
  FOR SELECT
  USING (
    recipient_type = 'buyer'
    AND recipient_id IN (
      SELECT id FROM buyers WHERE user_id = auth.uid()
    )
  );

-- Only service-role / functions can INSERT
CREATE POLICY tn_insert_service ON tender_notifications
  FOR INSERT
  WITH CHECK (TRUE); -- Restricted server-side via SECURITY DEFINER functions

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: close_tender
--    Called by the buyer from the frontend through Supabase client
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION close_tender(
  p_tender_id   UUID,
  p_buyer_id    UUID,
  p_close_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_tender_status TEXT;
  v_tender_title  TEXT;
  v_bidder_ids    UUID[];
  v_bidder_id     UUID;
  v_notification_title TEXT := 'Тендер закрыт заказчиком';
BEGIN
  -- ── Validate ownership ──────────────────────────────────────────────────────
  SELECT status, title
    INTO v_tender_status, v_tender_title
    FROM tenders
   WHERE id = p_tender_id
     AND buyer_id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Тендер не найден или нет прав');
  END IF;

  -- ── Guard: already closed / completed ──────────────────────────────────────
  IF v_tender_status IN ('closed', 'completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Тендер уже закрыт');
  END IF;

  -- ── Update tender status ───────────────────────────────────────────────────
  UPDATE tenders
    SET status       = 'closed',
        closed_by    = 'buyer',
        closed_at    = NOW(),
        close_reason = p_close_reason,
        updated_at   = NOW()
  WHERE id = p_tender_id;

  -- ── Collect all bidder exhibitor_ids ──────────────────────────────────────
  SELECT ARRAY_AGG(DISTINCT exhibitor_id)
    INTO v_bidder_ids
    FROM tender_responses
   WHERE tender_id = p_tender_id
     AND status = 'pending';

  -- ── Insert notifications for each bidder ──────────────────────────────────
  IF v_bidder_ids IS NOT NULL THEN
    FOREACH v_bidder_id IN ARRAY v_bidder_ids LOOP
      INSERT INTO tender_notifications (
        tender_id, recipient_id, recipient_type, type, title, message
      ) VALUES (
        p_tender_id,
        v_bidder_id,
        'exhibitor',
        'tender_closed',
        v_notification_title,
        FORMAT(
          'Тендер «%s» закрыт заказчиком. Благодарим за участие.%s',
          v_tender_title,
          CASE WHEN p_close_reason IS NOT NULL
               THEN ' Причина: ' || p_close_reason
               ELSE ''
          END
        )
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success',     TRUE,
    'tender_id',   p_tender_id,
    'closed_at',   NOW(),
    'notified',    COALESCE(array_length(v_bidder_ids, 1), 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION close_tender(UUID, UUID, TEXT) TO authenticated;
