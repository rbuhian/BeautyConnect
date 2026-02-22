-- ============================================================
-- Feature 4.4: Report & Block Users
-- ============================================================

-- 1. user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON user_blocks(blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks"
  ON user_blocks FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Admins read all blocks"
  ON user_blocks FOR SELECT
  USING (is_admin());

-- 2. user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL
    CHECK (reason IN ('harassment','inappropriate_content','fraud','unsafe_practices','no_show','spam','other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON user_reports(status);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports"
  ON user_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON user_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins read all reports"
  ON user_reports FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins update reports"
  ON user_reports FOR UPDATE
  USING (is_admin());
