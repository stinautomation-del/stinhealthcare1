-- Remove the repo's seeded demo dataset from Supabase.
-- Safe to run multiple times: all deletes target exact seed IDs/names and are idempotent.
-- Review the preview counts before committing the transaction in production.

begin;

with preview as (
  select 'profiles' as scope, count(*) as total
  from profiles
  where id in (
    '0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01',
    '446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0',
    'f87a45eb-61d3-46f0-a6f0-8061b0db58d0',
    'c8ed8e92-d046-438c-a835-f4ed59a2202d',
    '2d0fdad3-38d7-47d7-9d03-99f53f7eefb9',
    'f8462f20-4dae-4fe0-8954-a89b12f5ccf2'
  )
  union all
  select 'wards' as scope, count(*) as total
  from wards
  where id in (
    'ec05d620-6cfb-4307-b287-a4b04d98f6c6',
    '771f5890-c4c1-4c80-ac5d-b8d7cc6ee975',
    '8e80751d-5358-4422-afdf-cc10dadac4de'
  )
  union all
  select 'message_templates' as scope, count(*) as total
  from message_templates
  where id in (
    'b1e4c0a9-83b7-40ce-8a46-55d33d9f1c01',
    'b1e4c0a9-83b7-40ce-8a46-55d33d9f1c02'
  )
  union all
  select 'patients' as scope, count(*) as total
  from patients
  where id in (
    '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001',
    '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c002'
  )
  union all
  select 'prescriptions' as scope, count(*) as total
  from prescriptions
  where id in (
    '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0001',
    '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0002'
  )
  union all
  select 'schedule_entries' as scope, count(*) as total
  from schedule_entries
  where id in (
    'd1e3d6e0-2a12-4a8a-8e4c-000000000001',
    'd1e3d6e0-2a12-4a8a-8e4c-000000000002'
  )
  union all
  select 'nurse_reminders' as scope, count(*) as total
  from nurse_reminders
  where id in (
    'e4d3d6e0-2a12-4a8a-8e4c-000000000001'
  )
  union all
  select 'escalations' as scope, count(*) as total
  from escalations
  where id in (
    'f5d3d6e0-2a12-4a8a-8e4c-000000000001'
  )
  union all
  select 'ward_stats' as scope, count(*) as total
  from ward_stats
  where "wardId" in (
    'ec05d620-6cfb-4307-b287-a4b04d98f6c6',
    '771f5890-c4c1-4c80-ac5d-b8d7cc6ee975',
    '8e80751d-5358-4422-afdf-cc10dadac4de'
  )
  union all
  select 'notifications' as scope, count(*) as total
  from notifications
  where id = 'a6e3d6e0-2a12-4a8a-8e4c-000000000001'
)
select * from preview order by scope;

delete from nurse_reminders
where id in ('e4d3d6e0-2a12-4a8a-8e4c-000000000001');

delete from escalations
where id in ('f5d3d6e0-2a12-4a8a-8e4c-000000000001');

delete from schedule_entries
where id in (
  'd1e3d6e0-2a12-4a8a-8e4c-000000000001',
  'd1e3d6e0-2a12-4a8a-8e4c-000000000002'
);

delete from prescriptions
where id in (
  '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0001',
  '9f5d0c9f-72cb-4f4f-9e40-1b7c2aab0002'
);

delete from patients
where id in (
  '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c001',
  '7c5b3cb6-85cb-4b6c-bd1a-11c2e8b4c002'
);

delete from ward_stats
where "wardId" in (
  'ec05d620-6cfb-4307-b287-a4b04d98f6c6',
  '771f5890-c4c1-4c80-ac5d-b8d7cc6ee975',
  '8e80751d-5358-4422-afdf-cc10dadac4de'
);

delete from notifications
where id = 'a6e3d6e0-2a12-4a8a-8e4c-000000000001';

delete from message_templates
where id in (
  'b1e4c0a9-83b7-40ce-8a46-55d33d9f1c01',
  'b1e4c0a9-83b7-40ce-8a46-55d33d9f1c02'
);

delete from wards
where id in (
  'ec05d620-6cfb-4307-b287-a4b04d98f6c6',
  '771f5890-c4c1-4c80-ac5d-b8d7cc6ee975',
  '8e80751d-5358-4422-afdf-cc10dadac4de'
);

delete from profiles
where id in (
  '0d9fc24d-2d2f-4d0e-bdb1-6022ec09ac01',
  '446a7a02-cd9a-4ecc-8fbf-aa2a7d5ed0b0',
  'f87a45eb-61d3-46f0-a6f0-8061b0db58d0',
  'c8ed8e92-d046-438c-a835-f4ed59a2202d',
  '2d0fdad3-38d7-47d7-9d03-99f53f7eefb9',
  'f8462f20-4dae-4fe0-8954-a89b12f5ccf2'
);

commit;
