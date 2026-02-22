-- Promotions & Discounts
-- Allows professionals to create discount codes and time-limited promotions
-- Platform-wide promotions have professional_id = NULL

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Promotion Uses tracking table
CREATE TABLE IF NOT EXISTS promotion_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  discount_applied NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promotion_id, booking_id)
);

-- Row Level Security
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_uses ENABLE ROW LEVEL SECURITY;

-- Professionals can manage their own promotions
CREATE POLICY "Professionals can manage own promotions"
  ON promotions FOR ALL
  USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Anyone can read active promotions (for client view)
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true AND starts_at <= now() AND ends_at > now());

-- Promotion uses follow promotion ownership
CREATE POLICY "Professionals can view own promotion uses"
  ON promotion_uses FOR SELECT
  USING (promotion_id IN (
    SELECT id FROM promotions WHERE professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  ));

-- Clients can insert promotion uses (when booking)
CREATE POLICY "Clients can record promotion use"
  ON promotion_uses FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Indexes
CREATE INDEX idx_promotions_professional ON promotions(professional_id);
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active, starts_at, ends_at);
CREATE INDEX idx_promotion_uses_promotion ON promotion_uses(promotion_id);
CREATE INDEX idx_promotion_uses_client ON promotion_uses(client_id);
