-- Complete Database Schema for ZKP Ledger System
-- This file contains all tables needed for the system
-- Last updated: 2025-11-30

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- LEDGER SERVICE TABLES
-- ============================================================================

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  commitments JSONB,
  nullifiers JSONB,
  proof_ids TEXT[],
  proof_status TEXT CHECK (proof_status IN ('none', 'pending', 'verified', 'failed')),
  signer TEXT NOT NULL,
  signature TEXT NOT NULL,
  leaf_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_proof_status ON events(proof_status);
CREATE INDEX IF NOT EXISTS idx_events_signer ON events(signer);
CREATE INDEX IF NOT EXISTS idx_events_payload ON events USING GIN(payload);
CREATE INDEX IF NOT EXISTS idx_events_leaf_hash ON events(leaf_hash);

-- Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
  index BIGSERIAL PRIMARY KEY,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  canonical_payload BYTEA NOT NULL,
  merkle_root TEXT NOT NULL,
  anchor_refs JSONB,
  format_version TEXT NOT NULL,
  circuit_version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(hash);
CREATE INDEX IF NOT EXISTS idx_blocks_merkle_root ON blocks(merkle_root);

-- Prover Jobs Table
CREATE TABLE IF NOT EXISTS prover_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'batch', 'verification_request')),
  target_id TEXT NOT NULL,
  circuit TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'verified', 'failed')),
  worker_id TEXT,
  vk_hash TEXT,
  proof_s3_url TEXT,
  public_inputs JSONB,
  witness_data JSONB,
  witness_ref TEXT,
  error_log TEXT,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prover_jobs_status ON prover_jobs(status);
CREATE INDEX IF NOT EXISTS idx_prover_jobs_target ON prover_jobs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_prover_jobs_circuit ON prover_jobs(circuit);
CREATE INDEX IF NOT EXISTS idx_prover_jobs_priority ON prover_jobs(priority DESC, created_at);

-- Batches Table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ids JSONB NOT NULL,
  prestate_root TEXT NOT NULL,
  poststate_root TEXT NOT NULL,
  proof_job_id UUID REFERENCES prover_jobs(id),
  anchor_tx JSONB,
  proof_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'proving', 'ready', 'anchored', 'proof_fetch_failed')),
  last_fetch_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  anchored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_proof_job ON batches(proof_job_id);

-- ============================================================================
-- IDENTITY SERVICE TABLES
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('founder', 'investor')),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- User credentials (linking to ZK credentials)
CREATE TABLE IF NOT EXISTS user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    credential_hash VARCHAR(255) NOT NULL,
    credential_type VARCHAR(100) NOT NULL,
    issued_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);

-- Refresh tokens for JWT authentication
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);


-- ============================================================================
-- STARTUP SERVICE TABLES
-- ============================================================================

-- Startups table
CREATE TABLE IF NOT EXISTS startups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    founder_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sector VARCHAR(100),
    team_size INTEGER,
    funding_ask DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startups_founder ON startups(founder_id);

-- Startup documents (stored in MinIO)
CREATE TABLE IF NOT EXISTS startup_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_key VARCHAR(500) NOT NULL,
    file_size BIGINT,
    upload_event_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_documents_startup ON startup_documents(startup_id);

-- Startup metrics (encrypted values)
CREATE TABLE IF NOT EXISTS startup_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value_encrypted TEXT NOT NULL,
    threshold_value DECIMAL(15,2),
    proof_batch_id UUID,
    proof_status VARCHAR(50) DEFAULT 'pending',
    event_id UUID,
    proof_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startup_metrics_startup ON startup_metrics(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_metrics_status ON startup_metrics(proof_status);

-- Access permissions for investors
CREATE TABLE IF NOT EXISTS access_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL DEFAULT 'basic',
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    request_event_id UUID,
    grant_event_id UUID,
    UNIQUE(startup_id, investor_id)
);

CREATE INDEX IF NOT EXISTS idx_access_permissions_startup ON access_permissions(startup_id);
CREATE INDEX IF NOT EXISTS idx_access_permissions_investor ON access_permissions(investor_id);
CREATE INDEX IF NOT EXISTS idx_access_permissions_lookup ON access_permissions(startup_id, investor_id);

-- ============================================================================
-- INVESTOR SERVICE TABLES
-- ============================================================================

-- Interests table
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    event_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(investor_id, startup_id)
);

CREATE INDEX IF NOT EXISTS idx_interests_investor ON interests(investor_id);
CREATE INDEX IF NOT EXISTS idx_interests_startup ON interests(startup_id);

-- Commitments table
CREATE TABLE IF NOT EXISTS commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    terms TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    event_id UUID,
    proof_batch_id UUID,
    proof_url TEXT,
    proof_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commitments_investor ON commitments(investor_id);
CREATE INDEX IF NOT EXISTS idx_commitments_startup ON commitments(startup_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON commitments(status);

-- Metric Verification Requests table (investor-driven ZKP verification)
CREATE TABLE IF NOT EXISTS metric_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    threshold DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'verified', 'failed')),
    proof_result BOOLEAN,
    proof_batch_id UUID,
    proof_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mvr_investor ON metric_verification_requests(investor_id);
CREATE INDEX IF NOT EXISTS idx_mvr_startup ON metric_verification_requests(startup_id);
CREATE INDEX IF NOT EXISTS idx_mvr_status ON metric_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_mvr_startup_status ON metric_verification_requests(startup_id, status);

-- ============================================================================
-- CREDENTIAL ISSUER TABLES
-- ============================================================================

-- Credential Issuances table
CREATE TABLE IF NOT EXISTS credential_issuances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root TEXT NOT NULL,
    holders JSONB NOT NULL,
    leaves JSONB NOT NULL,
    salt TEXT,
    status TEXT DEFAULT 'active',
    issued_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_credential_issuances_root ON credential_issuances(root);
CREATE INDEX IF NOT EXISTS idx_credential_issuances_issued_at ON credential_issuances(issued_at);

-- Credential Revocations table
CREATE TABLE IF NOT EXISTS credential_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revoked_credential_ids JSONB NOT NULL,
    new_root TEXT,
    revoked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credential_revocations_revoked_at ON credential_revocations(revoked_at);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (DROP first to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_startups_updated_at ON startups;
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON startups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
