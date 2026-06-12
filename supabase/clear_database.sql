-- ============================================================
-- CLEAR DATABASE SCRIPT
-- ============================================================
-- Deletes ALL user data from every table and removes all
-- auth users. Safe to re-run (idempotent).
--
-- HOW TO USE:
--   Option A: Supabase Dashboard → SQL Editor → paste & run
--   Option B: supabase db execute --file supabase/clear_database.sql
-- ============================================================

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = replica;

-- ── Leaf tables (no dependents) ───────────────────────────
TRUNCATE TABLE promotion_uses       RESTART IDENTITY CASCADE;
TRUNCATE TABLE package_services     RESTART IDENTITY CASCADE;
TRUNCATE TABLE ad_impressions       RESTART IDENTITY CASCADE;
TRUNCATE TABLE ad_clicks            RESTART IDENTITY CASCADE;
TRUNCATE TABLE staff_blocked_dates  RESTART IDENTITY CASCADE;
TRUNCATE TABLE staff_availability   RESTART IDENTITY CASCADE;

-- ── Mid-level tables ──────────────────────────────────────
TRUNCATE TABLE messages             RESTART IDENTITY CASCADE;
TRUNCATE TABLE reviews              RESTART IDENTITY CASCADE;
TRUNCATE TABLE favorites            RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_reports         RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_blocks          RESTART IDENTITY CASCADE;
TRUNCATE TABLE professional_verifications RESTART IDENTITY CASCADE;

-- ── Business / staff ─────────────────────────────────────
TRUNCATE TABLE staff_members        RESTART IDENTITY CASCADE;
TRUNCATE TABLE businesses           RESTART IDENTITY CASCADE;

-- ── Bookings ─────────────────────────────────────────────
TRUNCATE TABLE bookings             RESTART IDENTITY CASCADE;

-- ── Professional sub-tables ──────────────────────────────
TRUNCATE TABLE availability                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE professional_blocked_dates   RESTART IDENTITY CASCADE;
TRUNCATE TABLE scheduling_rules             RESTART IDENTITY CASCADE;
TRUNCATE TABLE service_packages             RESTART IDENTITY CASCADE;
TRUNCATE TABLE promotions                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE featured_listings            RESTART IDENTITY CASCADE;
TRUNCATE TABLE services                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE ad_creatives                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE affiliate_products           RESTART IDENTITY CASCADE;

-- ── Root tables ───────────────────────────────────────────
TRUNCATE TABLE professional_profiles RESTART IDENTITY CASCADE;
TRUNCATE TABLE users                 RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ── Auth users ────────────────────────────────────────────
-- Deletes all Supabase auth accounts (requires service role / superuser)
DELETE FROM auth.users;

-- ── Confirm ───────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Database cleared successfully.';
END $$;
