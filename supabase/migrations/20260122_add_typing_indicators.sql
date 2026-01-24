-- ============================================
-- Typing Indicators: Table, Indexes, and RLS
-- Safe to re-run
-- ============================================

-- Ensure UUID extension exists (Supabase usually has this, but safe to include)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------
-- Table: typing_indicators
------------------------------------------------
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 seconds'),
  UNIQUE (booking_id, user_id)
);

------------------------------------------------
-- Indexes
------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_typing_indicators_booking_id
  ON typing_indicators (booking_id);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_user_id
  ON typing_indicators (user_id);

------------------------------------------------
-- Enable Row Level Security
------------------------------------------------
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

------------------------------------------------
-- RLS Policies
-- Drop first to make migration re-runnable
------------------------------------------------

-- SELECT: View typing indicators
DROP POLICY IF EXISTS "Booking participants can view typing indicators"
  ON typing_indicators;

CREATE POLICY "Booking participants can view typing indicators"
  ON typing_indicators
  FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id
      FROM bookings b
      WHERE b.client_id = auth.uid()
         OR b.professional_id IN (
              SELECT pp.id
              FROM professional_profiles pp
              WHERE pp.user_id = auth.uid()
         )
    )
  );

------------------------------------------------

-- INSERT: Start typing
DROP POLICY IF EXISTS "Booking participants can start typing"
  ON typing_indicators;

CREATE POLICY "Booking participants can start typing"
  ON typing_indicators
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND booking_id IN (
      SELECT b.id
      FROM bookings b
      WHERE b.client_id = auth.uid()
         OR b.professional_id IN (
              SELECT pp.id
              FROM professional_profiles pp
              WHERE pp.user_id = auth.uid()
         )
    )
  );

------------------------------------------------

-- UPDATE: Update own typing status
DROP POLICY IF EXISTS "Users can update own typing status"
  ON typing_indicators;

CREATE POLICY "Users can update own typing status"
  ON typing_indicators
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND booking_id IN (
      SELECT b.id
      FROM bookings b
      WHERE b.client_id = auth.uid()
         OR b.professional_id IN (
              SELECT pp.id
              FROM professional_profiles pp
              WHERE pp.user_id = auth.uid()
         )
    )
  );

------------------------------------------------

-- DELETE: Remove own typing status
DROP POLICY IF EXISTS "Users can delete own typing status"
  ON typing_indicators;

CREATE POLICY "Users can delete own typing status"
  ON typing_indicators
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND booking_id IN (
      SELECT b.id
      FROM bookings b
      WHERE b.client_id = auth.uid()
         OR b.professional_id IN (
              SELECT pp.id
              FROM professional_profiles pp
              WHERE pp.user_id = auth.uid()
         )
    )
  );
