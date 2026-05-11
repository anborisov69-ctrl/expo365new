-- Migration: Add subscription_tier to exhibitors table
-- Description: Adds subscription tier field to differentiate between base and premium exhibitors
-- Date: 2026-05-09

-- Create subscription tier enum type
CREATE TYPE subscription_tier AS ENUM ('base', 'premium');

-- Add subscription_tier column to exhibitors table
ALTER TABLE exhibitors 
ADD COLUMN subscription_tier subscription_tier NOT NULL DEFAULT 'base';

-- Add index for performance on tier-based queries
CREATE INDEX idx_exhibitors_subscription_tier ON exhibitors (subscription_tier);

-- Add comment for documentation
COMMENT ON COLUMN exhibitors.subscription_tier IS 'Subscription tier for exhibitor access control - base: standard access, premium: early tender access';

-- Update RLS policies for subscription-based access
-- Base users can see their own data and premium data 48h after tender creation
-- Premium users can see all tenders immediately

CREATE OR REPLACE FUNCTION get_exhibitor_tier(exhibitor_id UUID)
RETURNS subscription_tier
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT subscription_tier FROM exhibitors WHERE id = exhibitor_id;
$$;