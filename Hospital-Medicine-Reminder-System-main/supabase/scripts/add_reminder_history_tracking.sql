-- Add audit tracking for reminder clearing/history
-- This allows nurses to archive completed reminders while preserving history
-- Run this migration once in your Supabase project

-- Add fields to track when reminders are cleared from the active view
ALTER TABLE nurse_reminders
ADD COLUMN IF NOT EXISTS "clearedAt" timestamptz,
ADD COLUMN IF NOT EXISTS "clearedBy" text,
ADD COLUMN IF NOT EXISTS "clearedByName" text;

-- Create index for efficient queries on cleared reminders
CREATE INDEX IF NOT EXISTS idx_nurse_reminders_cleared_status 
ON nurse_reminders("clearedAt", "deliveryStatus");

-- Create index for reminders by nurse (for user-specific viewing)
CREATE INDEX IF NOT EXISTS idx_nurse_reminders_by_nurse
ON nurse_reminders("nurseId", "createdAt" DESC);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- clearedAt: Timestamp when reminder was cleared from active view by user
-- clearedBy: User ID of the person who cleared it
-- clearedByName: Name of the person who cleared it (for audit display)
--
-- Clearing is NOT deletion:
-- - Cleared reminders are archived in history
-- - Original data (sent, failed, cancelled) is preserved
-- - Allows nurses to manage view without losing audit trail
--
-- Query active reminders: WHERE "clearedAt" IS NULL AND "deliveryStatus" IN ('pending', 'sent')
-- Query cleared history: WHERE "clearedAt" IS NOT NULL
-- ============================================================================
