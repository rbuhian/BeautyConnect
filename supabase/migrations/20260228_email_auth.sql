-- Replace phone-based auth with email-based auth
-- Users will now sign in with email OTP instead of phone OTP

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
