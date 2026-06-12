-- ============================================
-- BeautyConnect: Admin User Management
-- Migration: 20260222_admin_user_management
-- ============================================

-- 1. Add is_suspended column to users
-- NOT NULL with DEFAULT false so existing rows backfill automatically.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- 2. Admin RLS policies
-- Use a SECURITY DEFINER function to check admin role.
-- This avoids infinite recursion: a plain EXISTS (SELECT FROM users ...) inside
-- a users SELECT policy would recurse indefinitely through Supabase's RLS engine.

-- Helper function — bypasses RLS to safely check the caller's role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Allow admins to read all users
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  USING (is_admin());

-- Allow admins to update any user (for is_suspended toggle)
DROP POLICY IF EXISTS "Admin can update any user" ON users;
CREATE POLICY "Admin can update any user"
  ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admins to read all professional_profiles
DROP POLICY IF EXISTS "Admin can read all professional profiles" ON professional_profiles;
CREATE POLICY "Admin can read all professional profiles"
  ON professional_profiles
  FOR SELECT
  USING (is_admin());

-- Allow admins to update any professional profile (for is_live toggle)
DROP POLICY IF EXISTS "Admin can update any professional profile" ON professional_profiles;
CREATE POLICY "Admin can update any professional profile"
  ON professional_profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admins to read all bookings (for client booking history + professional detail)
DROP POLICY IF EXISTS "Admin can read all bookings" ON bookings;
CREATE POLICY "Admin can read all bookings"
  ON bookings
  FOR SELECT
  USING (is_admin());

-- Allow admins to read all businesses (for salon info in professional detail)
DROP POLICY IF EXISTS "Admin can read all businesses" ON businesses;
CREATE POLICY "Admin can read all businesses"
  ON businesses
  FOR SELECT
  USING (is_admin());

-- Allow admins to read all services (for professional detail view)
DROP POLICY IF EXISTS "Admin can read all services" ON services;
CREATE POLICY "Admin can read all services"
  ON services
  FOR SELECT
  USING (is_admin());

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_professional_profiles_is_live ON professional_profiles(is_live);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_location_type ON professional_profiles(location_type);

