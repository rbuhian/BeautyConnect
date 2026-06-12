-- ============================================
-- Block Time Ranges
-- Allow blocking a specific time range (not just a whole day) for both
-- solo professionals and salon staff. NULL start_time/end_time = whole day.
-- ============================================

-- Solo professionals
ALTER TABLE professional_blocked_dates
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Salon staff
ALTER TABLE staff_blocked_dates
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Drop the one-block-per-day uniqueness so a date can hold several partial
-- blocks (or a single whole-day block).
ALTER TABLE professional_blocked_dates
  DROP CONSTRAINT IF EXISTS professional_blocked_dates_professional_id_date_key;
ALTER TABLE staff_blocked_dates
  DROP CONSTRAINT IF EXISTS staff_blocked_dates_staff_member_id_date_key;

-- ============================================
-- Make is_staff_available aware of partial (time-range) blocks.
-- A blocked row with NULL times blocks the whole day; otherwise it only
-- blocks slots that overlap [start_time, end_time).
-- ============================================
CREATE OR REPLACE FUNCTION is_staff_available(
  p_staff_member_id UUID,
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_end_time TIME;
  v_is_available BOOLEAN;
  v_has_conflict BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  v_end_time := p_time + (p_duration_minutes || ' minutes')::INTERVAL;

  -- Check if staff is working on this day
  SELECT is_available INTO v_is_available
  FROM staff_availability
  WHERE staff_member_id = p_staff_member_id
    AND day_of_week = v_day_of_week
    AND p_time >= start_time
    AND v_end_time <= end_time;

  IF v_is_available IS NULL OR v_is_available = false THEN
    RETURN false;
  END IF;

  -- Check if staff has blocked this date (whole day, or an overlapping range)
  IF EXISTS (
    SELECT 1 FROM staff_blocked_dates
    WHERE staff_member_id = p_staff_member_id
      AND date = p_date
      AND (
        (start_time IS NULL OR end_time IS NULL)
        OR (p_time < end_time AND v_end_time > start_time)
      )
  ) THEN
    RETURN false;
  END IF;

  -- Check for conflicting bookings
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.staff_member_id = p_staff_member_id
      AND b.date = p_date
      AND b.status IN ('pending', 'confirmed')
      AND (
        (p_time >= b.time_slot AND p_time < b.time_slot + (s.duration_minutes || ' minutes')::INTERVAL)
        OR
        (v_end_time > b.time_slot AND v_end_time <= b.time_slot + (s.duration_minutes || ' minutes')::INTERVAL)
        OR
        (p_time <= b.time_slot AND v_end_time >= b.time_slot + (s.duration_minutes || ' minutes')::INTERVAL)
      )
  ) INTO v_has_conflict;

  RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql;
