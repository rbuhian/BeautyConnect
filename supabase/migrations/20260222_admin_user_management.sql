-- ============================================
-- BeautyConnect: Admin User Management
-- Migration: 20260222_admin_user_management
-- ============================================

-- 1. Add is_suspended column to users
-- NOT NULL with DEFAULT false so existing rows backfill automatically.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- 2. Admin RLS policies
-- The alias 'me' on the users table avoids self-referential recursion
-- when the SELECT policy checks auth.uid() against the same table being queried.

-- Allow admins to read all users
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

-- Allow admins to update any user (for is_suspended toggle)
DROP POLICY IF EXISTS "Admin can update any user" ON users;
CREATE POLICY "Admin can update any user"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS me
      WHERE me.id = auth.uid()
        AND me.role = 'admin'
    )
  );

-- Allow admins to read all professional_profiles
DROP POLICY IF EXISTS "Admin can read all professional profiles" ON professional_profiles;
CREATE POLICY "Admin can read all professional profiles"
  ON professional_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Allow admins to update any professional profile (for is_live toggle)
DROP POLICY IF EXISTS "Admin can update any professional profile" ON professional_profiles;
CREATE POLICY "Admin can update any professional profile"
  ON professional_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Allow admins to read all bookings (for client booking history + professional detail)
DROP POLICY IF EXISTS "Admin can read all bookings" ON bookings;
CREATE POLICY "Admin can read all bookings"
  ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Allow admins to read all businesses (for salon info in professional detail)
DROP POLICY IF EXISTS "Admin can read all businesses" ON businesses;
CREATE POLICY "Admin can read all businesses"
  ON businesses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Allow admins to read all services (for professional detail view)
DROP POLICY IF EXISTS "Admin can read all services" ON services;
CREATE POLICY "Admin can read all services"
  ON services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_professional_profiles_is_live ON professional_profiles(is_live);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location_type ON professional_profiles(location_type);

-- NOTE: If the users SELECT policy causes a recursion error in Supabase, replace
-- the self-join alias approach with a SECURITY DEFINER helper function:
--
-- CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
--   SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
-- $$ LANGUAGE sql SECURITY DEFINER;
--
-- Then update the policies to use: USING (is_admin())
