-- Add geolocation columns to professional_profiles for distance-based sorting
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;
