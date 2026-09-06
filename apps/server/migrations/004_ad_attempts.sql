-- Server-issued rewarded-ad attempts.
-- The client completion event is only a development attestation until Toss
-- exposes a documented server-side verification mechanism.

CREATE TABLE ad_attempts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose varchar(24) NOT NULL CHECK (purpose IN ('PACK', 'ENHANCEMENT', 'SALE')),
  status varchar(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'REWARDED', 'CONSUMED', 'EXPIRED', 'REJECTED')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  not_before timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  rewarded_at timestamptz,
  consumed_at timestamptz,
  request_id varchar(80),
  CHECK (not_before >= issued_at),
  CHECK (expires_at > not_before)
);

CREATE INDEX ad_attempts_user_status_idx
  ON ad_attempts(user_id, status, expires_at DESC);

CREATE UNIQUE INDEX ad_attempts_one_active_purpose_idx
  ON ad_attempts(user_id, purpose)
  WHERE status IN ('PENDING', 'REWARDED');

ALTER TABLE pack_openings
  ADD COLUMN IF NOT EXISTS ad_attempt_id uuid REFERENCES ad_attempts(id);

ALTER TABLE enhancement_logs
  ADD COLUMN IF NOT EXISTS ad_attempt_id uuid REFERENCES ad_attempts(id);
