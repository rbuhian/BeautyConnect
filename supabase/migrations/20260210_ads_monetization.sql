-- ============================================
-- BeautyConnect: Ads Monetization Schema
-- Migration: 20260210_ads_monetization
-- ============================================

-- ── ENUMS ──────────────────────────────────────────────────────────────────────

CREATE TYPE ad_type AS ENUM ('feed_card', 'interstitial', 'banner', 'affiliate_card', 'sponsored_content');
CREATE TYPE ad_status AS ENUM ('active', 'paused', 'expired');
CREATE TYPE ad_target_role AS ENUM ('client', 'professional', 'both');
CREATE TYPE featured_package AS ENUM ('boost_1d', 'weekly', 'monthly', 'priority_category');


-- ── TABLE: ad_creatives ────────────────────────────────────────────────────────

CREATE TABLE ad_creatives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            ad_type NOT NULL,
  advertiser_name text NOT NULL,
  headline        text NOT NULL,
  subtext         text NOT NULL DEFAULT '',
  image_url       text,
  cta_label       text NOT NULL DEFAULT 'Learn More',
  cta_url         text NOT NULL,
  target_categories category[] NOT NULL DEFAULT '{}',
  target_user_role  ad_target_role NOT NULL DEFAULT 'both',
  status          ad_status NOT NULL DEFAULT 'active',
  start_date      timestamptz NOT NULL DEFAULT now(),
  end_date        timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads"
  ON ad_creatives FOR SELECT
  USING (status = 'active' AND now() BETWEEN start_date AND end_date);


-- ── TABLE: ad_impressions ──────────────────────────────────────────────────────

CREATE TABLE ad_impressions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id     uuid NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screen    text NOT NULL,
  position  integer NOT NULL DEFAULT 0,
  shown_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_shown_at ON ad_impressions(shown_at);

ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own impressions"
  ON ad_impressions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── TABLE: ad_clicks ───────────────────────────────────────────────────────────

CREATE TABLE ad_clicks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id      uuid NOT NULL REFERENCES ad_creatives(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screen     text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_clicks_ad_id ON ad_clicks(ad_id);
CREATE INDEX idx_ad_clicks_clicked_at ON ad_clicks(clicked_at);

ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own clicks"
  ON ad_clicks FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── TABLE: featured_listings ───────────────────────────────────────────────────

CREATE TABLE featured_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  package         featured_package NOT NULL,
  price_paid      numeric NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  starts_at       timestamptz NOT NULL DEFAULT now(),
  ends_at         timestamptz NOT NULL,
  payment_ref     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_featured_listings_professional ON featured_listings(professional_id);
CREATE INDEX idx_featured_listings_active ON featured_listings(is_active, ends_at);

ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active featured listings"
  ON featured_listings FOR SELECT
  USING (is_active = true AND now() < ends_at);

CREATE POLICY "Professionals can create own featured listings"
  ON featured_listings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE id = professional_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can update own featured listings"
  ON featured_listings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE id = professional_id AND user_id = auth.uid()
    )
  );


-- ── TABLE: affiliate_products ──────────────────────────────────────────────────

CREATE TABLE affiliate_products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  brand             text NOT NULL,
  image_url         text NOT NULL,
  price             numeric NOT NULL,
  affiliate_url     text NOT NULL,
  target_categories category[] NOT NULL DEFAULT '{}',
  commission_rate   numeric NOT NULL DEFAULT 0.05,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active affiliate products"
  ON affiliate_products FOR SELECT
  USING (is_active = true);


-- ── SEED DATA: ad_creatives ────────────────────────────────────────────────────

INSERT INTO ad_creatives (type, advertiser_name, headline, subtext, image_url, cta_label, cta_url, target_categories, target_user_role, status, start_date, end_date) VALUES
  ('feed_card', 'Watsons Philippines', 'Watsons Beauty Sale', 'Up to 50% off on top beauty brands this week!', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600', 'Shop Now', 'https://www.watsons.com.ph', '{}', 'client', 'active', now(), now() + interval '90 days'),
  ('feed_card', 'BeautyMNL', 'New Arrivals at BeautyMNL', 'Discover the latest K-beauty products curated for Filipinas.', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600', 'Explore', 'https://www.beautymnl.com', '{makeup,lash}', 'client', 'active', now(), now() + interval '90 days'),
  ('banner', 'TESDA Beauty Care', 'Get NCII Certified', 'Upgrade your skills with TESDA-accredited beauty care training.', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600', 'Enroll Now', 'https://www.tesda.gov.ph', '{}', 'professional', 'active', now(), now() + interval '90 days'),
  ('banner', 'GCash for Business', 'Accept Payments Anywhere', 'Set up GCash Business for your salon — zero monthly fees.', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600', 'Sign Up', 'https://www.gcash.com', '{}', 'professional', 'active', now(), now() + interval '90 days'),
  ('interstitial', 'Shopee Beauty', 'Your Booking is Confirmed!', 'Prep for your appointment — enjoy free shipping on beauty essentials.', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600', 'Shop Now', 'https://shopee.ph/beauty', '{makeup,hair,nails}', 'client', 'active', now(), now() + interval '90 days'),
  ('sponsored_content', 'Cetaphil Philippines', '5 Skincare Steps Before Your Makeup Appointment', 'Prep your skin for flawless makeup application with this dermatologist-approved routine.', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600', 'Read More', 'https://www.cetaphil.com.ph', '{makeup}', 'client', 'active', now(), now() + interval '90 days');


-- ── SEED DATA: affiliate_products ──────────────────────────────────────────────

INSERT INTO affiliate_products (name, brand, image_url, price, affiliate_url, target_categories, commission_rate) VALUES
  ('Fit Me Matte Foundation', 'Maybelline', 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=300', 399, 'https://shopee.ph/maybelline-fit-me', '{makeup}', 0.08),
  ('Color Sensational Lipstick', 'Maybelline', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300', 299, 'https://shopee.ph/maybelline-lipstick', '{makeup}', 0.08),
  ('Keratin Smooth Shampoo 350ml', 'TRESemmé', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=300', 259, 'https://shopee.ph/tresemme-keratin', '{hair}', 0.06),
  ('Argan Oil Hair Treatment 100ml', 'Moroccanoil', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300', 899, 'https://lazada.com.ph/moroccanoil', '{hair}', 0.07),
  ('Nail Envy Strengthener', 'OPI', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300', 750, 'https://shopee.ph/opi-nail-envy', '{nails}', 0.06),
  ('Gel Nail Polish Set (6 Colors)', 'Beetles', 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=300', 450, 'https://shopee.ph/beetles-gel-set', '{nails}', 0.10),
  ('Individual Lash Extensions Kit', 'Ardell', 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=300', 520, 'https://shopee.ph/ardell-lashes', '{lash}', 0.07),
  ('Brow Lamination Kit', 'RefectoCil', 'https://images.unsplash.com/photo-1594987658738-56cc4f1dc03b?w=300', 680, 'https://lazada.com.ph/refectocil-brow', '{brow}', 0.08),
  ('Hydrating Primer 30ml', 'e.l.f.', 'https://images.unsplash.com/photo-1617897903246-719242758050?w=300', 350, 'https://shopee.ph/elf-primer', '{makeup}', 0.09),
  ('Professional Ring Light 18"', 'Neewer', 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300', 1499, 'https://lazada.com.ph/neewer-ring-light', '{makeup,hair,nails,lash,brow}', 0.05);


-- ── SEED DATA: featured_listings ───────────────────────────────────────────────
-- Note: These reference professional_profiles created in 01_seed_data.sql
-- The actual IDs will depend on the seed data; these use a subquery pattern

INSERT INTO featured_listings (professional_id, package, price_paid, is_active, starts_at, ends_at)
SELECT id, 'monthly', 999, true, now(), now() + interval '30 days'
FROM professional_profiles
WHERE user_id = (SELECT id FROM users WHERE phone = '+639201111111')
LIMIT 1;

INSERT INTO featured_listings (professional_id, package, price_paid, is_active, starts_at, ends_at)
SELECT id, 'weekly', 399, true, now(), now() + interval '7 days'
FROM professional_profiles
WHERE user_id = (SELECT id FROM users WHERE phone = '+639205555555')
LIMIT 1;
