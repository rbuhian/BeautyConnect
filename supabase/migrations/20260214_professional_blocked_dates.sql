-- ============================================
-- Professional Blocked Dates
-- For solo professionals who don't have staff members
-- ============================================

CREATE TABLE professional_blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, date)
);

-- Indexes
CREATE INDEX idx_professional_blocked_dates_professional_id ON professional_blocked_dates(professional_id);
CREATE INDEX idx_professional_blocked_dates_date ON professional_blocked_dates(date);

-- Enable RLS
ALTER TABLE professional_blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view blocked dates (needed for availability checks)
CREATE POLICY "Anyone can view professional blocked dates" ON professional_blocked_dates
  FOR SELECT USING (true);

-- Professionals can manage their own blocked dates
CREATE POLICY "Professionals can manage own blocked dates" ON professional_blocked_dates
  FOR ALL USING (
    professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  );
