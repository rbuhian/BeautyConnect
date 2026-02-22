-- ============================================================
-- Feature 4.1: Identity Verification
-- ============================================================

-- 1. Add verification columns to professional_profiles table
ALTER TABLE professional_profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. New verification submissions table
CREATE TABLE IF NOT EXISTS professional_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected')),
  id_document_path TEXT,
  certificate_paths TEXT[] NOT NULL DEFAULT '{}',
  submission_notes TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_professional ON professional_verifications(professional_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON professional_verifications(status);

-- 3. RLS on professional_verifications
ALTER TABLE professional_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can read own verifications"
  ON professional_verifications FOR SELECT USING (
    professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals can insert own verifications"
  ON professional_verifications FOR INSERT WITH CHECK (
    professional_id IN (SELECT id FROM professional_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can read all verifications"
  ON professional_verifications FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update verifications"
  ON professional_verifications FOR UPDATE USING (is_admin());

-- 4. Private storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verifications', 'verifications', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: professionals upload/read from their own user_id prefix
CREATE POLICY "Professionals upload own verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verifications' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Professionals read own verification docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verifications' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all verification docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verifications' AND is_admin());
