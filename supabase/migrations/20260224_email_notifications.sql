-- ============================================================
-- Feature 6.2: Email Booking Confirmations
-- Add email notification preference to users table
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;
