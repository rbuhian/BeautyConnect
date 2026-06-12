-- ============================================
-- BeautyConnect: Fix Professional Profile RLS
-- Migration: 20260406_fix_professional_profile_rls
-- ============================================
-- Professionals could not save their profile or toggle is_live because
-- there was no UPDATE policy on professional_profiles for the profile owner.
-- Also ensures users can update their own record (name, avatar).
-- ============================================

-- 1. Users table: allow each user to read and update their own row
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. professional_profiles: allow professionals to read and update their own row
DROP POLICY IF EXISTS "Professionals can read own profile" ON professional_profiles;
CREATE POLICY "Professionals can read own profile"
  ON professional_profiles
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update own profile" ON professional_profiles;
CREATE POLICY "Professionals can update own profile"
  ON professional_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Allow clients to view live professional profiles (needed for Discover screen)
DROP POLICY IF EXISTS "Anyone can view live professional profiles" ON professional_profiles;
CREATE POLICY "Anyone can view live professional profiles"
  ON professional_profiles
  FOR SELECT
  USING (is_live = true);
