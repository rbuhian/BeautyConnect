-- Service Packages & Bundles
-- Allows professionals to bundle multiple services at discounted prices

-- Service Packages table
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_price NUMERIC(10,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Package Services junction table
CREATE TABLE IF NOT EXISTS package_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(package_id, service_id)
);

-- Row Level Security
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;

-- Professionals can manage their own packages
CREATE POLICY "Professionals can manage own packages"
  ON service_packages FOR ALL
  USING (professional_id IN (
    SELECT id FROM professional_profiles WHERE user_id = auth.uid()
  ));

-- Anyone can read active packages (for client view)
CREATE POLICY "Anyone can view active packages"
  ON service_packages FOR SELECT
  USING (is_active = true);

-- Package services follow package ownership
CREATE POLICY "Professionals can manage own package services"
  ON package_services FOR ALL
  USING (package_id IN (
    SELECT id FROM service_packages WHERE professional_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  ));

-- Anyone can read package services for active packages
CREATE POLICY "Anyone can view active package services"
  ON package_services FOR SELECT
  USING (package_id IN (
    SELECT id FROM service_packages WHERE is_active = true
  ));

-- Indexes
CREATE INDEX idx_service_packages_professional ON service_packages(professional_id);
CREATE INDEX idx_package_services_package ON package_services(package_id);
