-- ============================================
-- PHASE 11: SALON/BUSINESS SUPPORT
-- Migration: 20260125_salon_business_support.sql
-- ============================================

-- ============================================
-- NEW ENUM
-- ============================================

CREATE TYPE business_type AS ENUM ('salon', 'spa', 'studio');

-- ============================================
-- NEW TABLES
-- ============================================

-- Business/Salon profiles (extends professional_profiles)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type business_type NOT NULL DEFAULT 'salon',
  logo TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id)
);

-- Staff members belonging to a business
CREATE TABLE staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = staff without app account
  name TEXT NOT NULL,
  avatar TEXT,
  specialties category[] NOT NULL DEFAULT '{}',
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff availability (per-staff weekly schedule)
CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_member_id, day_of_week)
);

-- Staff blocked dates (vacation, sick leave)
CREATE TABLE staff_blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_member_id, date)
);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add staff_member_id to services (optional - NULL means any staff can do it)
ALTER TABLE services ADD COLUMN staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

-- Add staff_member_id to bookings (NULL for individual professionals or "any available")
ALTER TABLE bookings ADD COLUMN staff_member_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_businesses_professional_id ON businesses(professional_id);
CREATE INDEX idx_staff_members_business_id ON staff_members(business_id);
CREATE INDEX idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX idx_staff_members_is_active ON staff_members(is_active);
CREATE INDEX idx_staff_members_specialties ON staff_members USING GIN(specialties);
CREATE INDEX idx_staff_availability_staff_member_id ON staff_availability(staff_member_id);
CREATE INDEX idx_staff_blocked_dates_staff_member_id ON staff_blocked_dates(staff_member_id);
CREATE INDEX idx_staff_blocked_dates_date ON staff_blocked_dates(date);
CREATE INDEX idx_services_staff_member_id ON services(staff_member_id);
CREATE INDEX idx_bookings_staff_member_id ON bookings(staff_member_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Businesses policies
CREATE POLICY "Anyone can view businesses" ON businesses
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage own business" ON businesses
  FOR ALL USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Staff members policies
CREATE POLICY "Anyone can view active staff members" ON staff_members
  FOR SELECT USING (
    is_active = true OR
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN professional_profiles pp ON b.professional_id = pp.id
      WHERE pp.user_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Business owners can manage staff" ON staff_members
  FOR ALL USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN professional_profiles pp ON b.professional_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

-- Staff availability policies
CREATE POLICY "Anyone can view staff availability" ON staff_availability
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage staff availability" ON staff_availability
  FOR ALL USING (
    staff_member_id IN (
      SELECT sm.id FROM staff_members sm
      JOIN businesses b ON sm.business_id = b.id
      JOIN professional_profiles pp ON b.professional_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

-- Staff blocked dates policies
CREATE POLICY "Anyone can view staff blocked dates" ON staff_blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Business owners can manage staff blocked dates" ON staff_blocked_dates
  FOR ALL USING (
    staff_member_id IN (
      SELECT sm.id FROM staff_members sm
      JOIN businesses b ON sm.business_id = b.id
      JOIN professional_profiles pp ON b.professional_id = pp.id
      WHERE pp.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if a staff member is available at a given time
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

  -- Check if staff has blocked this date
  IF EXISTS (
    SELECT 1 FROM staff_blocked_dates
    WHERE staff_member_id = p_staff_member_id AND date = p_date
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
        -- New booking overlaps with existing booking
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

-- Function to get available staff for a service at a given time
CREATE OR REPLACE FUNCTION get_available_staff(
  p_business_id UUID,
  p_service_category category,
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  staff_member_id UUID,
  staff_name TEXT,
  staff_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.name,
    sm.avatar
  FROM staff_members sm
  WHERE sm.business_id = p_business_id
    AND sm.is_active = true
    AND p_service_category = ANY(sm.specialties)
    AND is_staff_available(sm.id, p_date, p_time, p_duration_minutes);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign staff for "Any Available" bookings
CREATE OR REPLACE FUNCTION auto_assign_staff()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
  v_service_category category;
  v_duration INTEGER;
  v_available_staff_id UUID;
BEGIN
  -- Only process if staff_member_id is NULL and professional has a business
  IF NEW.staff_member_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check if professional has a business
  SELECT b.id INTO v_business_id
  FROM businesses b
  WHERE b.professional_id = NEW.professional_id;

  IF v_business_id IS NULL THEN
    RETURN NEW; -- Individual professional, no auto-assignment needed
  END IF;

  -- Get service details
  SELECT s.category, s.duration_minutes INTO v_service_category, v_duration
  FROM services s
  WHERE s.id = NEW.service_id;

  -- Find first available staff
  SELECT staff_member_id INTO v_available_staff_id
  FROM get_available_staff(v_business_id, v_service_category, NEW.date, NEW.time_slot, v_duration)
  LIMIT 1;

  -- Assign if found
  IF v_available_staff_id IS NOT NULL THEN
    NEW.staff_member_id := v_available_staff_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_staff_on_booking
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_assign_staff();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_staff_available TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_staff TO authenticated;

-- ============================================
-- MIGRATION UTILITY
-- ============================================

-- Function to migrate business professional_id when seed users login
CREATE OR REPLACE FUNCTION migrate_business_professional_id(
  p_business_id uuid,
  p_old_professional_id uuid,
  p_new_professional_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET professional_id = p_new_professional_id
  WHERE id = p_business_id
    AND professional_id = p_old_professional_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION migrate_business_professional_id TO authenticated;
