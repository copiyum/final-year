-- Migration: Add leaf_hash column to events table for efficient Merkle proof generation
-- This stores the pre-computed canonical hash of each event

-- Add leaf_hash column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS leaf_hash TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_events_leaf_hash ON events(leaf_hash);

-- Add proof_fetch_failed status to batches
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_status_check;
ALTER TABLE batches ADD CONSTRAINT batches_status_check 
    CHECK (status IN ('pending', 'proving', 'ready', 'anchored', 'proof_fetch_failed'));

-- Add last_fetch_attempt column for retry tracking
ALTER TABLE batches ADD COLUMN IF NOT EXISTS last_fetch_attempt TIMESTAMPTZ;

-- Add retry_count and error_message to prover_jobs for better tracking
ALTER TABLE prover_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE prover_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add salt column to credential_issuances for secure leaf generation
ALTER TABLE credential_issuances ADD COLUMN IF NOT EXISTS salt TEXT;
ALTER TABLE credential_issuances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create credential_revocations table for tracking revocation history
CREATE TABLE IF NOT EXISTS credential_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revoked_credential_ids JSONB NOT NULL,
    new_root TEXT,
    revoked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_revocations_revoked_at ON credential_revocations(revoked_at);

-- Add proof_url and proof_status to commitments table
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS proof_status TEXT DEFAULT 'pending';

-- Add notifications table for investor/founder notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
