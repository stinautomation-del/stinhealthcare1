-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  "updatedAt" timestamptz DEFAULT now()
);

-- Seed defaults
INSERT INTO system_config (key, value, description)
VALUES 
  ('escalation_timeout', '10', 'Minutes before missed dose escalates'),
  ('notification_retries', '3', 'Retry attempts for failed SMS'),
  ('sms_fallback_enabled', 'true', 'Enable SMS if WhatsApp fails'),
  ('max_reminders_per_patient', '10', 'Limit of active reminders')
ON CONFLICT (key) DO NOTHING;

-- Policies
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read system_config" ON system_config FOR SELECT USING (true);
CREATE POLICY "Allow admin update system_config" ON system_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
