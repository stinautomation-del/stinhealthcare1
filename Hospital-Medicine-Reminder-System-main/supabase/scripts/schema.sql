-- MediSync Pro Supabase initialization script
-- Run this in the Supabase SQL Editor to create the app database schema.
-- It is safe for a fresh project. It drops existing app tables if they already exist.

create extension if not exists pgcrypto;

-- Drop existing tables in dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS escalations CASCADE;
DROP TABLE IF EXISTS nurse_reminders CASCADE;
DROP TABLE IF EXISTS schedule_entries CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS ward_stats CASCADE;
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin', 'doctor', 'head_nurse', 'nurse')),
  phone text,
  ward text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "lastLogin" timestamptz,
  "licenseNumber" text,
  "employeeId" text,
  speciality text,
  "auth0Id" text UNIQUE,
  "avatarUrl" text
);

-- Wards
CREATE TABLE wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  floor text NOT NULL,
  "totalBeds" integer NOT NULL DEFAULT 0,
  "occupiedBeds" integer NOT NULL DEFAULT 0,
  "headNurseId" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  "headNurseName" text
);

-- Patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" text NOT NULL,
  phone text NOT NULL,
  "whatsappNumber" text,
  ward text NOT NULL,
  room text NOT NULL,
  bed text NOT NULL,
  "doctorId" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  "doctorName" text NOT NULL,
  "emergencyContact" text,
  "emergencyPhone" text,
  "preferredLanguage" text NOT NULL CHECK ("preferredLanguage" IN ('en', 'ta', 'hi')) DEFAULT 'en',
  "notificationPreference" text NOT NULL CHECK ("notificationPreference" IN ('whatsapp', 'sms', 'both', 'none')) DEFAULT 'whatsapp',
  allergies text[] NOT NULL DEFAULT '{}',
  "isActive" boolean NOT NULL DEFAULT true,
  "admittedAt" timestamptz NOT NULL DEFAULT now(),
  "dischargedAt" timestamptz
);

-- Prescriptions
CREATE TABLE prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "patientName" text NOT NULL,
  "medicineName" text NOT NULL,
  dose text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  frequency text NOT NULL CHECK (frequency IN ('OD', 'BD', 'TDS', 'QID', 'Custom')),
  times text[] NOT NULL DEFAULT '{}',
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "specialInstructions" text,
  "prescribedBy" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  "prescribedByName" text NOT NULL,
  "prescribedAt" timestamptz NOT NULL DEFAULT now(),
  "isActive" boolean NOT NULL DEFAULT true
);

-- Schedule entries
CREATE TABLE schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "prescriptionId" uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  "patientId" uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "patientName" text NOT NULL,
  ward text NOT NULL,
  room text NOT NULL,
  bed text NOT NULL,
  "medicineName" text NOT NULL,
  dose text NOT NULL,
  quantity integer NOT NULL,
  "scheduledTime" text NOT NULL,
  "scheduledDate" date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'given', 'missed', 'escalated')) DEFAULT 'pending',
  "acknowledgedAt" timestamptz,
  "acknowledgedBy" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  "acknowledgedByName" text,
  "escalatedAt" timestamptz,
  "escalatedTo" text,
  "notificationSent" boolean NOT NULL DEFAULT false,
  "notificationChannel" text CHECK ("notificationChannel" IN ('whatsapp', 'sms', 'both'))
);

-- Nurse reminders
CREATE TABLE nurse_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "patientId" uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "patientName" text NOT NULL,
  "patientPhone" text NOT NULL,
  "nurseId" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  "nurseName" text NOT NULL,
  "messageBody" text NOT NULL,
  "templateId" uuid,
  "templateName" text,
  language text NOT NULL CHECK (language IN ('en', 'ta', 'hi')) DEFAULT 'en',
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'both')) DEFAULT 'whatsapp',
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "scheduledAt" timestamptz NOT NULL,
  "sentAt" timestamptz,
  "deliveryStatus" text NOT NULL CHECK ("deliveryStatus" IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')) DEFAULT 'pending',
  "retryCount" integer NOT NULL DEFAULT 0,
  "nextAttemptAt" timestamptz,
  "lastAttemptAt" timestamptz,
  "lastError" text,
  "providerMessageSid" text,
  "sendAttemptKey" text,
  recurrence text NOT NULL CHECK (recurrence IN ('none', 'daily', 'weekly')) DEFAULT 'none',
  "cancelledBy" text,
  "cancelledAt" timestamptz,
  "internalNote" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Message templates
CREATE TABLE message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "bodyEn" text NOT NULL,
  "bodyTa" text NOT NULL,
  "bodyHi" text NOT NULL,
  "metaApproved" boolean NOT NULL DEFAULT false,
  category text NOT NULL CHECK (category IN ('medication', 'procedure', 'discharge', 'custom')),
  variables text[] NOT NULL DEFAULT '{}'
);

-- Escalations
CREATE TABLE escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "scheduleEntryId" uuid REFERENCES schedule_entries(id) ON DELETE SET NULL,
  "patientId" uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  "patientName" text NOT NULL,
  ward text NOT NULL,
  "medicineName" text NOT NULL,
  "scheduledTime" text NOT NULL,
  "escalatedAt" timestamptz NOT NULL DEFAULT now(),
  "escalatedTo" text NOT NULL,
  "escalatedToName" text NOT NULL,
  "resolvedAt" timestamptz,
  "resolvedBy" uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('open', 'resolved')) DEFAULT 'open'
);

-- Ward stats
CREATE TABLE ward_stats (
  "wardId" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "wardName" text NOT NULL UNIQUE,
  "totalPatients" integer NOT NULL DEFAULT 0,
  "todayReminders" integer NOT NULL DEFAULT 0,
  "givenDoses" integer NOT NULL DEFAULT 0,
  "missedDoses" integer NOT NULL DEFAULT 0,
  "pendingDoses" integer NOT NULL DEFAULT 0,
  "escalationCount" integer NOT NULL DEFAULT 0
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('reminder', 'escalation', 'confirmation', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Auth helper trigger for future Supabase auth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    "name",
    email,
    role,
    ward,
    "licenseNumber",
    "employeeId",
    phone,
    speciality,
    "isActive",
    "createdAt"
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Professional Staff'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'nurse'),
    new.raw_user_meta_data->>'ward',
    COALESCE(new.raw_user_meta_data->>'licenseNumber', new.raw_user_meta_data->>'license_number'),
    COALESCE(new.raw_user_meta_data->>'employeeId', new.raw_user_meta_data->>'employee_id'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'speciality',
    true,
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ward_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Development-friendly open policies
CREATE POLICY "open_profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_wards" ON wards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_prescriptions" ON prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_schedule_entries" ON schedule_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_nurse_reminders" ON nurse_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_message_templates" ON message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_escalations" ON escalations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_ward_stats" ON ward_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Helpful indexes
CREATE INDEX idx_patients_ward ON patients (ward);
CREATE INDEX idx_patients_doctor ON patients ("doctorId");
CREATE INDEX idx_prescriptions_patient ON prescriptions ("patientId");
CREATE INDEX idx_schedule_entries_date ON schedule_entries ("scheduledDate");
CREATE INDEX idx_schedule_entries_status ON schedule_entries (status);
CREATE INDEX idx_nurse_reminders_patient ON nurse_reminders ("patientId");
CREATE INDEX idx_escalations_status ON escalations (status);
CREATE INDEX idx_notifications_timestamp ON notifications (timestamp DESC);

-- Seed profiles
INSERT INTO profiles (id, "name", email, role, phone, ward, "isActive", "createdAt", "licenseNumber", "employeeId", speciality)
VALUES
  ('0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01', 'Dr. Rajesh Sharma', 'rajesh.sharma@hospital.com', 'doctor', '+91 98765 43201', 'Ward 3B', true, now(), 'DOC-1001', 'EMP-1001', 'Internal Medicine'),
  ('446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0', 'Dr. Priya Patel', 'priya.patel@hospital.com', 'doctor', '+91 98765 43202', 'Ward 2A', true, now(), 'DOC-1002', 'EMP-1002', 'Cardiology'),
  ('f87a45eb-61d3-46f0-a6f0-8061b0db58d0', 'Head Nurse Anitha', 'anitha.k@hospital.com', 'head_nurse', '+91 98765 43203', 'Ward 3B', true, now(), 'NUR-2001', 'EMP-2001', 'Critical Care'),
  ('c8ed8e92-d046-438c-a835-f4ed59a2202d', 'Nurse Priya', 'priya.n@hospital.com', 'nurse', '+91 98765 43204', 'Ward 3B', true, now(), 'NUR-2002', 'EMP-2002', null),
  ('2d0fdad3-38d7-47d7-9d03-99f53f7eefb9', 'Nurse Kumar', 'kumar.r@hospital.com', 'nurse', '+91 98765 43205', 'Ward 2A', true, now(), 'NUR-2003', 'EMP-2003', null),
  ('f8462f20-4dae-4fe0-8954-a89b12f5ccf2', 'Admin User', 'admin@hospital.com', 'admin', '+91 98765 43200', null, true, now(), 'ADM-0001', 'EMP-0001', null)
ON CONFLICT (id) DO NOTHING;

-- Seed wards
INSERT INTO wards (id, "name", floor, "totalBeds", "occupiedBeds", "headNurseId", "headNurseName")
VALUES
  ('ec05d620-6cfb-4307-b287-a4b04d98f6c6', 'Ward 2A', '2nd Floor', 30, 24, 'f87a45eb-61d3-46f0-a6f0-8061b0db58d0', 'Head Nurse Anitha'),
  ('771f5890-c4c1-4c80-ac5d-b8d7cc6ee975', 'Ward 3B', '3rd Floor', 25, 20, 'f87a45eb-61d3-46f0-a6f0-8061b0db58d0', 'Head Nurse Anitha'),
  ('8e80751d-5358-4422-afdf-cc10dadac4de', 'ICU', '1st Floor', 15, 12, 'f87a45eb-61d3-46f0-a6f0-8061b0db58d0', 'Head Nurse Anitha')
ON CONFLICT (id) DO NOTHING;

-- Seed message templates
INSERT INTO message_templates (id, "name", "bodyEn", "bodyTa", "bodyHi", "metaApproved", category, variables)
VALUES
  ('b1e4c0a9-83b7-40ce-8a46-55d33d9f1c01', 'Medication Reminder', 'Please take your medication on time.', 'தயவுசெய்து உங்கள் மருந்தை சரியான நேரத்தில் எடுத்துக் கொள்ளவும்.', 'कृपया अपनी दवा समय पर लें।', true, 'medication', ARRAY['patientName', 'medicineName', 'time']),
  ('b1e4c0a9-83b7-40ce-8a46-55d33d9f1c02', 'Escalation Notice', 'A dose was missed and has been escalated.', 'ஒரு மருந்தளவு தவறவிடப்பட்டது, மற்றும் மேலதிக நடவடிக்கை எடுக்கப்பட்டது.', 'एक खुराक छूट गई है और उसे आगे बढ़ा दिया गया है।', true, 'procedure', ARRAY['patientName', 'medicineName', 'time'])
ON CONFLICT (id) DO NOTHING;

-- Seed patients
INSERT INTO patients (id, "fullName", phone, "whatsappNumber", ward, room, bed, "doctorId", "doctorName", "emergencyContact", "emergencyPhone", "preferredLanguage", "notificationPreference", allergies, "isActive", "admittedAt")
VALUES
  ('7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001', 'Arjun Mehta', '+91 90000 00001', '+91 90000 00011', 'Ward 3B', '301', '4', '0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01', 'Dr. Rajesh Sharma', 'Meera Mehta', '+91 90000 10001', 'en', 'whatsapp', ARRAY['Penicillin'], true, now()),
  ('7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c002', 'Lakshmi Iyer', '+91 90000 00002', '+91 90000 00012', 'Ward 2A', '210', '2', '446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0', 'Dr. Priya Patel', 'Ravi Iyer', '+91 90000 10002', 'ta', 'sms', ARRAY[]::text[], true, now())
ON CONFLICT (id) DO NOTHING;

-- Seed prescriptions
INSERT INTO prescriptions (id, "patientId", "patientName", "medicineName", dose, quantity, frequency, times, "startDate", "endDate", "specialInstructions", "prescribedBy", "prescribedByName", "prescribedAt", "isActive")
VALUES
  ('9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0001', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001', 'Arjun Mehta', 'Metformin', '500mg', 1, 'BD', ARRAY['08:00', '20:00'], CURRENT_DATE, CURRENT_DATE + 29, 'Take after meals', '0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01', 'Dr. Rajesh Sharma', now(), true),
  ('9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0002', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c002', 'Lakshmi Iyer', 'Amlodipine', '5mg', 1, 'OD', ARRAY['09:00'], CURRENT_DATE, CURRENT_DATE + 14, 'Monitor blood pressure', '446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0', 'Dr. Priya Patel', now(), true)
ON CONFLICT (id) DO NOTHING;

-- Seed schedule entries
INSERT INTO schedule_entries (id, "prescriptionId", "patientId", "patientName", ward, room, bed, "medicineName", dose, quantity, "scheduledTime", "scheduledDate", status, "notificationSent")
VALUES
  ('d1e3d6e0-2a12-4a8a-8e4c-000000000001', '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0001', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001', 'Arjun Mehta', 'Ward 3B', '301', '4', 'Metformin', '500mg', 1, '08:00', CURRENT_DATE, 'pending', false),
  ('d1e3d6e0-2a12-4a8a-8e4c-000000000002', '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0002', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c002', 'Lakshmi Iyer', 'Ward 2A', '210', '2', 'Amlodipine', '5mg', 1, '09:00', CURRENT_DATE, 'pending', false)
ON CONFLICT (id) DO NOTHING;

-- Seed nurse reminders
INSERT INTO nurse_reminders (id, "patientId", "patientName", "patientPhone", "nurseId", "nurseName", "messageBody", "templateId", "templateName", language, channel, "startDate", "endDate", "scheduledAt", "deliveryStatus", recurrence, "createdAt")
VALUES
  ('e4d3d6e0-2a12-4a8a-8e4c-000000000001', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001', 'Arjun Mehta', '+91 90000 00001', 'c8ed8e92-d046-438c-a835-f4ed59a2202d', 'Nurse Priya', 'Medication due reminder for Arjun Mehta', 'b1e4c0a9-83b7-40ce-8a46-55d33d9f1c01', 'Medication Reminder', 'en', 'whatsapp', now() + interval '1 hour', 'pending', 'none', now())
ON CONFLICT (id) DO NOTHING;

-- Seed escalations
INSERT INTO escalations (id, "scheduleEntryId", "patientId", "patientName", ward, "medicineName", "scheduledTime", "escalatedTo", "escalatedToName", status)
VALUES
  ('f5d3d6e0-2a12-4a8a-8e4c-000000000001', 'd1e3d6e0-2a12-4a8a-8e4c-000000000001', '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001', 'Arjun Mehta', 'Ward 3B', 'Metformin', '08:00', 'doctor', 'Dr. Rajesh Sharma', 'open')
ON CONFLICT (id) DO NOTHING;

-- Seed ward stats
INSERT INTO ward_stats ("wardId", "wardName", "totalPatients", "todayReminders", "givenDoses", "missedDoses", "pendingDoses", "escalationCount")
VALUES
  ('ec05d620-6cfb-4307-b287-a4b04d98f6c6', 'Ward 2A', 1, 1, 0, 0, 1, 0),
  ('771f5890-c4c1-4c80-ac5d-b8d7cc6ee975', 'Ward 3B', 1, 1, 0, 0, 1, 1),
  ('8e80751d-5358-4422-afdf-cc10dadac4de', 'ICU', 0, 0, 0, 0, 0, 0)
ON CONFLICT ("wardId") DO NOTHING;

-- Seed notifications
INSERT INTO notifications (id, type, title, message, data, timestamp)
VALUES
  ('a6e3d6e0-2a12-4a8a-8e4c-000000000001', 'system', 'Database Ready', 'Supabase schema created successfully.', '{"source":"supabase_init"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;
