-- Add retry, backoff, and idempotency tracking to nurse_reminders.
-- Run this once in Supabase for existing databases.

ALTER TABLE nurse_reminders
ADD COLUMN IF NOT EXISTS "retryCount" integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "nextAttemptAt" timestamptz,
ADD COLUMN IF NOT EXISTS "lastAttemptAt" timestamptz,
ADD COLUMN IF NOT EXISTS "lastError" text,
ADD COLUMN IF NOT EXISTS "providerMessageSid" text,
ADD COLUMN IF NOT EXISTS "sendAttemptKey" text;

ALTER TABLE nurse_reminders
DROP CONSTRAINT IF EXISTS nurse_reminders_deliveryStatus_check;

ALTER TABLE nurse_reminders
ADD CONSTRAINT nurse_reminders_deliveryStatus_check
CHECK ("deliveryStatus" IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_nurse_reminders_retry_due
ON nurse_reminders("deliveryStatus", "scheduledAt", "nextAttemptAt");
