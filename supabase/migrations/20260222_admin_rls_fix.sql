-- ============================================
-- BeautyConnect: Fix Admin RLS Infinite Recursion
-- Migration: 20260222_admin_rls_fix
-- ============================================
-- The previous migration (20260222_admin_user_management) introduced infinite
-- recursion in the users table SELECT policy. The EXISTS subquery on `users`
-- inside a `users` RLS policy causes Supabase to recurse indefinitely.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS to check the
-- admin role. This breaks the recursion chain.
-- ============================================

-- 1. Create SECURITY DEFINER helper to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Fix the recursive users policies
DROP POLICY IF EXISTS "Admin can read all users" ON users;
CREATE POLICY "Admin can read all users"
  ON users
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update any user" ON users;
CREATE POLICY "Admin can update any user"
  ON users
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. Update all other admin policies to use is_admin() for consistency
DROP POLICY IF EXISTS "Admin can read all professional profiles" ON professional_profiles;
CREATE POLICY "Admin can read all professional profiles"
  ON professional_profiles
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can update any professional profile" ON professional_profiles;
CREATE POLICY "Admin can update any professional profile"
  ON professional_profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can read all bookings" ON bookings;
CREATE POLICY "Admin can read all bookings"
  ON bookings
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can read all businesses" ON businesses;
CREATE POLICY "Admin can read all businesses"
  ON businesses
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin can read all services" ON services;
CREATE POLICY "Admin can read all services"
  ON services
  FOR SELECT
  USING (is_admin());
