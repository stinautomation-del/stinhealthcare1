-- Remove obvious demo/test rows only.
-- This script is intentionally conservative: it matches exact placeholder names.
-- Review the SELECTs before running the DELETE statements in Supabase SQL Editor.

begin;

with target_patients as (
  select id
  from patients
  where lower(trim("fullName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
),
target_reminders as (
  select id
  from nurse_reminders
  where lower(trim("patientName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
     or lower(trim("nurseName")) in ('tobi', 'demo nurse', 'test nurse', 'sample nurse')
)
select 'patients_to_delete' as scope, count(*) as total from target_patients
union all
select 'reminders_to_delete' as scope, count(*) as total from target_reminders;

delete from nurse_reminders
where id in (
  select id from nurse_reminders
  where lower(trim("patientName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
     or lower(trim("nurseName")) in ('tobi', 'demo nurse', 'test nurse', 'sample nurse')
);

delete from schedule_entries
where "patientId" in (
  select id from patients
  where lower(trim("fullName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
)
or lower(trim("patientName")) in ('gobi', 'demo patient', 'test patient', 'sample patient');

delete from prescriptions
where "patientId" in (
  select id from patients
  where lower(trim("fullName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
)
or lower(trim("patientName")) in ('gobi', 'demo patient', 'test patient', 'sample patient');

delete from escalations
where "patientId" in (
  select id from patients
  where lower(trim("fullName")) in ('gobi', 'demo patient', 'test patient', 'sample patient')
)
or lower(trim("patientName")) in ('gobi', 'demo patient', 'test patient', 'sample patient');

delete from patients
where lower(trim("fullName")) in ('gobi', 'demo patient', 'test patient', 'sample patient');

commit;