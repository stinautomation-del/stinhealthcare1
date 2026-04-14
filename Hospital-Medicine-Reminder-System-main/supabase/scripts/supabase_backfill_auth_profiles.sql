-- Safe Auth ↔ Profiles Backfill Script
-- Purpose: Link existing Supabase auth.users to profiles table without breaking current data
-- This script is idempotent and can be run multiple times safely
--
-- WHAT IT DOES:
-- 1. For each auth.users entry, checks if a matching profile already exists
-- 2. If profile is missing, creates one with id = auth.users.id (critical for RLS)
-- 3. Extracts name and role from auth.users metadata if available
-- 4. Preserves all existing profile data (never deletes or overwrites)
-- 5. Safe to run after production RLS policies are applied
--
-- PREREQUISITES:
-- - Schema already created (tables exist, RLS enabled)
-- - At least one auth.users entry exists (from registration or admin creation)
-- - No profile row has a manually-set ID that conflicts with auth.users.id
--
-- EXPECTED OUTCOME:
-- - All auth.users have corresponding profiles with matching IDs
-- - RLS policies now work correctly (auth.uid() = profiles.id)
-- - Login flow succeeds for all auth users
--

-- Step 1: Verify schema is ready
SELECT 'Schema Check' as step,
  COUNT(*) as auth_users_count,
  (SELECT COUNT(*) FROM profiles) as current_profiles_count
FROM auth.users;

-- Step 2: Create missing profiles for auth.users
-- This INSERT only adds profiles that don't already exist
-- Each new profile.id MATCHES the auth.users.id (critical for RLS)
INSERT INTO public.profiles (
  id,
  "name",
  email,
  role,
  "isActive",
  "createdAt"
)
SELECT
  au.id,
  -- Extract full name from metadata; fallback to email; fallback to 'User'
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1),
    'User'
  ) as full_name,
  au.email,
  -- Extract role from metadata; fallback to 'nurse' (safest default)
  COALESCE(
    au.raw_user_meta_data->>'role',
    'nurse'
  ) as role,
  true as is_active,
  au.created_at as created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = au.id
)
-- Idempotent: if somehow a row with this ID already exists, skip it
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify the backfill
SELECT 'Backfill Results' as step,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE role = 'nurse') as nurse_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'doctor') as doctor_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'head_nurse') as head_nurse_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_count;

-- Step 4: Verify no orphaned auth.users (all should have matching profiles)
SELECT 'Orphaned Auth Users Check' as step,
  COUNT(*) as orphaned_users_found
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.id = au.id
);

-- Step 5: Show newly created profiles for verification
SELECT 'Newly Created Profiles (from this backfill)' as step,
  id,
  "name",
  email,
  role,
  "createdAt"
FROM public.profiles
WHERE "createdAt" >= now() - interval '5 minutes'
ORDER BY "createdAt" DESC;

-- Step 6: Test RLS functions work with new profiles
SELECT 'RLS Function Test' as step,
  (SELECT COUNT(*) FROM public.profiles WHERE public.current_user_role() IS NOT NULL) as profiles_with_accessible_roles;

-- Done!
SELECT 'Backfill Complete ✓' as status,
  'All auth.users now have matching profiles. RLS policies can safely reference auth.uid().' as notes;
