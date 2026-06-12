-- Scheduling Rules table for professional automated scheduling configuration
CREATE TABLE IF NOT EXISTS scheduling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  max_daily_bookings INTEGER DEFAULT NULL,
  lunch_break_enabled BOOLEAN NOT NULL DEFAULT false,
  lunch_start_time TIME DEFAULT '12:00',
  lunch_end_time TIME DEFAULT '13:00',
  travel_buffer_minutes INTEGER NOT NULL DEFAULT 0,
  min_advance_booking_hours INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(professional_id)
);

-- Row Level Security
ALTER TABLE scheduling_rules ENABLE ROW LEVEL SECURITY;

-- Professionals can read and manage their own rules
CREATE POLICY "Professionals can manage own scheduling rules"
  ON scheduling_rules FOR ALL
  USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));
