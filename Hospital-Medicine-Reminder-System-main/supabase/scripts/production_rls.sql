-- Production RLS policy patch for MediSync Pro
-- Run this in Supabase SQL Editor AFTER schema/tables exist.
-- This file does not drop tables or seed data.

-- Helper to resolve current signed-in user's role from profiles table.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p."isActive" = true
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

-- Ensure RLS is enabled
alter table public.profiles enable row level security;
alter table public.wards enable row level security;
alter table public.patients enable row level security;
alter table public.prescriptions enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.nurse_reminders enable row level security;
alter table public.message_templates enable row level security;
alter table public.escalations enable row level security;
alter table public.ward_stats enable row level security;
alter table public.notifications enable row level security;

-- Remove old wide-open policies
DROP POLICY IF EXISTS "open_profiles" ON public.profiles;
DROP POLICY IF EXISTS "open_wards" ON public.wards;
DROP POLICY IF EXISTS "open_patients" ON public.patients;
DROP POLICY IF EXISTS "open_prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "open_schedule_entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "open_nurse_reminders" ON public.nurse_reminders;
DROP POLICY IF EXISTS "open_message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "open_escalations" ON public.escalations;
DROP POLICY IF EXISTS "open_ward_stats" ON public.ward_stats;
DROP POLICY IF EXISTS "open_notifications" ON public.notifications;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_self_or_staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;

CREATE POLICY "profiles_select_self_or_staff"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.is_staff()
);

CREATE POLICY "profiles_insert_admin_only"
ON public.profiles FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_delete_admin_only"
ON public.profiles FOR DELETE
USING (public.is_admin());

-- Wards
DROP POLICY IF EXISTS "wards_select_staff" ON public.wards;
DROP POLICY IF EXISTS "wards_mutate_admin_or_head_nurse" ON public.wards;

CREATE POLICY "wards_select_staff"
ON public.wards FOR SELECT
USING (public.is_staff());

CREATE POLICY "wards_mutate_admin_or_head_nurse"
ON public.wards FOR ALL
USING (public.current_user_role() in ('admin', 'head_nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'head_nurse'));

-- Patients
DROP POLICY IF EXISTS "patients_select_staff" ON public.patients;
DROP POLICY IF EXISTS "patients_mutate_clinical_staff" ON public.patients;

CREATE POLICY "patients_select_staff"
ON public.patients FOR SELECT
USING (public.is_staff());

CREATE POLICY "patients_mutate_clinical_staff"
ON public.patients FOR ALL
USING (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

-- Prescriptions
DROP POLICY IF EXISTS "prescriptions_select_staff" ON public.prescriptions;
DROP POLICY IF EXISTS "prescriptions_mutate_doctor_admin" ON public.prescriptions;

CREATE POLICY "prescriptions_select_staff"
ON public.prescriptions FOR SELECT
USING (public.is_staff());

CREATE POLICY "prescriptions_mutate_doctor_admin"
ON public.prescriptions FOR ALL
USING (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

-- Schedule entries
DROP POLICY IF EXISTS "schedule_entries_select_staff" ON public.schedule_entries;
DROP POLICY IF EXISTS "schedule_entries_insert_clinical" ON public.schedule_entries;
DROP POLICY IF EXISTS "schedule_entries_update_clinical" ON public.schedule_entries;
DROP POLICY IF EXISTS "schedule_entries_delete_admin_doctor" ON public.schedule_entries;

CREATE POLICY "schedule_entries_select_staff"
ON public.schedule_entries FOR SELECT
USING (public.is_staff());

CREATE POLICY "schedule_entries_insert_clinical"
ON public.schedule_entries FOR INSERT
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse'));

CREATE POLICY "schedule_entries_update_clinical"
ON public.schedule_entries FOR UPDATE
USING (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

CREATE POLICY "schedule_entries_delete_admin_doctor"
ON public.schedule_entries FOR DELETE
USING (public.current_user_role() in ('admin', 'doctor'));

-- Nurse reminders
DROP POLICY IF EXISTS "nurse_reminders_select_staff" ON public.nurse_reminders;
DROP POLICY IF EXISTS "nurse_reminders_insert_clinical" ON public.nurse_reminders;
DROP POLICY IF EXISTS "nurse_reminders_update_clinical" ON public.nurse_reminders;
DROP POLICY IF EXISTS "nurse_reminders_delete_admin_head_nurse" ON public.nurse_reminders;

CREATE POLICY "nurse_reminders_select_staff"
ON public.nurse_reminders FOR SELECT
USING (public.is_staff());

CREATE POLICY "nurse_reminders_insert_clinical"
ON public.nurse_reminders FOR INSERT
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

CREATE POLICY "nurse_reminders_update_clinical"
ON public.nurse_reminders FOR UPDATE
USING (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

CREATE POLICY "nurse_reminders_delete_admin_head_nurse"
ON public.nurse_reminders FOR DELETE
USING (public.current_user_role() in ('admin', 'head_nurse'));

-- Message templates
DROP POLICY IF EXISTS "message_templates_select_staff" ON public.message_templates;
DROP POLICY IF EXISTS "message_templates_mutate_admin_head_nurse" ON public.message_templates;

CREATE POLICY "message_templates_select_staff"
ON public.message_templates FOR SELECT
USING (public.is_staff());

CREATE POLICY "message_templates_mutate_admin_head_nurse"
ON public.message_templates FOR ALL
USING (public.current_user_role() in ('admin', 'head_nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'head_nurse'));

-- Escalations
DROP POLICY IF EXISTS "escalations_select_staff" ON public.escalations;
DROP POLICY IF EXISTS "escalations_insert_clinical" ON public.escalations;
DROP POLICY IF EXISTS "escalations_update_clinical" ON public.escalations;
DROP POLICY IF EXISTS "escalations_delete_admin_head_nurse" ON public.escalations;

CREATE POLICY "escalations_select_staff"
ON public.escalations FOR SELECT
USING (public.is_staff());

CREATE POLICY "escalations_insert_clinical"
ON public.escalations FOR INSERT
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

CREATE POLICY "escalations_update_clinical"
ON public.escalations FOR UPDATE
USING (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'doctor', 'head_nurse', 'nurse'));

CREATE POLICY "escalations_delete_admin_head_nurse"
ON public.escalations FOR DELETE
USING (public.current_user_role() in ('admin', 'head_nurse'));

-- Ward stats
DROP POLICY IF EXISTS "ward_stats_select_staff" ON public.ward_stats;
DROP POLICY IF EXISTS "ward_stats_mutate_admin_head_nurse" ON public.ward_stats;

CREATE POLICY "ward_stats_select_staff"
ON public.ward_stats FOR SELECT
USING (public.is_staff());

CREATE POLICY "ward_stats_mutate_admin_head_nurse"
ON public.ward_stats FOR ALL
USING (public.current_user_role() in ('admin', 'head_nurse'))
WITH CHECK (public.current_user_role() in ('admin', 'head_nurse'));

-- Notifications
DROP POLICY IF EXISTS "notifications_select_staff" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system_roles" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;

CREATE POLICY "notifications_select_staff"
ON public.notifications FOR SELECT
USING (public.is_staff());

CREATE POLICY "notifications_insert_system_roles"
ON public.notifications FOR INSERT
WITH CHECK (public.current_user_role() in ('admin', 'head_nurse', 'doctor'));

CREATE POLICY "notifications_update_admin"
ON public.notifications FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "notifications_delete_admin"
ON public.notifications FOR DELETE
USING (public.is_admin());
