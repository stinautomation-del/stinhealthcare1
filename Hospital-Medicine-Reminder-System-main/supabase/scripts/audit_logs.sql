-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  "actorId" uuid REFERENCES profiles(id),
  "actorName" text NOT NULL,
  "actorRole" text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs ("actorId");

-- Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Trigger Function for broad clinical audit
CREATE OR REPLACE FUNCTION log_clinical_action()
RETURNS trigger AS $$
DECLARE
    actor_id uuid;
    actor_name text;
    actor_role text;
BEGIN
    -- Try to get current staff info from profiles based on auth.uid()
    SELECT id, name, role INTO actor_id, actor_name, actor_role 
    FROM profiles 
    WHERE id = auth.uid();

    IF actor_id IS NOT NULL THEN
        INSERT INTO audit_logs (action, "entityType", "entityId", "actorId", "actorName", "actorRole", details)
        VALUES (
            TG_OP, 
            TG_TABLE_NAME, 
            COALESCE(NEW.id::text, OLD.id::text), 
            actor_id, 
            actor_name, 
            actor_role,
            jsonb_build_object('old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to critical tables
DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION log_clinical_action();

DROP TRIGGER IF EXISTS audit_prescriptions ON prescriptions;
CREATE TRIGGER audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION log_clinical_action();

DROP TRIGGER IF EXISTS audit_schedule ON schedule_entries;
CREATE TRIGGER audit_schedule AFTER UPDATE ON schedule_entries FOR EACH ROW EXECUTE FUNCTION log_clinical_action();
