-- Migration: Add created_at to tenders table
-- Description: Adds created_at timestamp for tender access control logic
-- Date: 2026-05-09

-- Add created_at column to tenders table if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenders' AND column_name = 'created_at') THEN
        ALTER TABLE tenders 
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Add index for performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_tenders_created_at ON tenders (created_at);

-- Add comment for documentation
COMMENT ON COLUMN tenders.created_at IS 'Tender creation timestamp for subscription-based access control';

-- Create function to check if tender is accessible based on tier and timing
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
    
    -- Base users have access after 48 hours
    hours_since_created := EXTRACT(EPOCH FROM (NOW() - tender_created_at)) / 3600;
    
    RETURN hours_since_created >= 48;
END;
$$;

-- Create RLS policy for tender access based on subscription tier
CREATE POLICY tender_tier_access_policy ON tenders
FOR SELECT
USING (
    -- Allow access if user is the owner (buyer) or if tender is accessible based on tier
    auth.uid() IN (SELECT user_id FROM buyers WHERE id = buyer_id)
    OR 
    is_tender_accessible(id, auth.uid()::UUID)
);