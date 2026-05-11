-- Migration: Add tender_unlocks table for pay-per-tender access
-- Description: Enables exhibitors to purchase individual tender access
-- Date: 2026-05-09

-- Create tender_unlocks table
CREATE TABLE IF NOT EXISTS tender_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exhibitor_id UUID NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate purchases
ALTER TABLE tender_unlocks 
ADD CONSTRAINT unique_exhibitor_tender_unlock 
UNIQUE (exhibitor_id, tender_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tender_unlocks_exhibitor_id ON tender_unlocks (exhibitor_id);
CREATE INDEX IF NOT EXISTS idx_tender_unlocks_tender_id ON tender_unlocks (tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_unlocks_purchased_at ON tender_unlocks (purchased_at);

-- Add comments for documentation
COMMENT ON TABLE tender_unlocks IS 'Tracks individual tender access purchases by exhibitors';
COMMENT ON COLUMN tender_unlocks.exhibitor_id IS 'ID of the exhibitor who purchased access';
COMMENT ON COLUMN tender_unlocks.tender_id IS 'ID of the tender being unlocked';
COMMENT ON COLUMN tender_unlocks.purchased_at IS 'Timestamp when access was purchased';
COMMENT ON COLUMN tender_unlocks.payment_amount IS 'Amount paid for tender access';
COMMENT ON COLUMN tender_unlocks.payment_currency IS 'Currency used for payment';

-- Update tender access function to include tender_unlocks logic
CREATE OR REPLACE FUNCTION is_tender_accessible(
    tender_id UUID,
    exhibitor_id UUID
) RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    tender_created_at TIMESTAMPTZ;
    exhibitor_tier subscription_tier;
    hours_since_created NUMERIC;
    has_unlock BOOLEAN := FALSE;
BEGIN
    -- Get tender creation time
    SELECT created_at INTO tender_created_at
    FROM tenders 
    WHERE id = tender_id;
    
    -- Get exhibitor tier
    SELECT subscription_tier INTO exhibitor_tier
    FROM exhibitors 
    WHERE id = exhibitor_id;
    
    -- If no data found, deny access
    IF tender_created_at IS NULL OR exhibitor_tier IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Premium users always have access
    IF exhibitor_tier = 'premium' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if exhibitor has purchased access to this specific tender
    SELECT EXISTS(
        SELECT 1 FROM tender_unlocks 
        WHERE tender_unlocks.exhibitor_id = is_tender_accessible.exhibitor_id 
        AND tender_unlocks.tender_id = is_tender_accessible.tender_id
    ) INTO has_unlock;
    
    IF has_unlock = TRUE THEN
        RETURN TRUE;
    END IF;
    
    -- Base users have access after 48 hours
    hours_since_created := EXTRACT(EPOCH FROM (NOW() - tender_created_at)) / 3600;
    
    RETURN hours_since_created >= 48;
END;
$$;

-- Enable RLS on tender_unlocks
ALTER TABLE tender_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS policy for tender_unlocks: users can only see their own unlocks
CREATE POLICY tender_unlocks_select_policy ON tender_unlocks
FOR SELECT
USING (
    exhibitor_id IN (
        SELECT id FROM exhibitors WHERE user_id = auth.uid()
    )
);

-- RLS policy for tender_unlocks: users can only insert their own unlocks
CREATE POLICY tender_unlocks_insert_policy ON tender_unlocks
FOR INSERT
WITH CHECK (
    exhibitor_id IN (
        SELECT id FROM exhibitors WHERE user_id = auth.uid()
    )
);

-- Function to purchase tender access
CREATE OR REPLACE FUNCTION purchase_tender_access(
    p_exhibitor_id UUID,
    p_tender_id UUID,
    p_payment_amount DECIMAL(10,2),
    p_payment_currency VARCHAR(3) DEFAULT 'RUB'
) RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    unlock_id UUID;
    tender_exists BOOLEAN;
    exhibitor_exists BOOLEAN;
BEGIN
    -- Validate exhibitor exists and belongs to current user
    SELECT EXISTS(
        SELECT 1 FROM exhibitors 
        WHERE id = p_exhibitor_id AND user_id = auth.uid()
    ) INTO exhibitor_exists;
    
    IF NOT exhibitor_exists THEN
        RAISE EXCEPTION 'Invalid exhibitor or access denied';
    END IF;
    
    -- Validate tender exists
    SELECT EXISTS(
        SELECT 1 FROM tenders WHERE id = p_tender_id
    ) INTO tender_exists;
    
    IF NOT tender_exists THEN
        RAISE EXCEPTION 'Tender not found';
    END IF;
    
    -- Check if already purchased
    IF EXISTS(
        SELECT 1 FROM tender_unlocks 
        WHERE exhibitor_id = p_exhibitor_id AND tender_id = p_tender_id
    ) THEN
        RAISE EXCEPTION 'Access already purchased for this tender';
    END IF;
    
    -- Insert tender unlock record
    INSERT INTO tender_unlocks (
        exhibitor_id, 
        tender_id, 
        payment_amount, 
        payment_currency
    ) VALUES (
        p_exhibitor_id, 
        p_tender_id, 
        p_payment_amount, 
        p_payment_currency
    ) RETURNING id INTO unlock_id;
    
    RETURN unlock_id;
END;
$$;

-- Function to get tender unlock price (can be customized later)
CREATE OR REPLACE FUNCTION get_tender_unlock_price(
    p_tender_id UUID
) RETURNS DECIMAL(10,2)
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    -- For now, return fixed price of 500 RUB
    -- This can be made dynamic based on tender value, category, etc.
    RETURN 500.00;
END;
$$;