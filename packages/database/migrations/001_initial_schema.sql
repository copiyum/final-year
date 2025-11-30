-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Events Table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  commitments JSONB,
  nullifiers JSONB,
  proof_ids TEXT[],
  proof_status TEXT CHECK (proof_status IN ('none', 'pending', 'verified', 'failed')),
  signer TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_proof_status ON events(proof_status);
CREATE INDEX idx_events_signer ON events(signer);
CREATE INDEX idx_events_payload ON events USING GIN(payload);

-- Blocks Table
CREATE TABLE blocks (
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

CREATE INDEX idx_blocks_hash ON blocks(hash);
CREATE INDEX idx_blocks_merkle_root ON blocks(merkle_root);

-- Prover Jobs Table
CREATE TABLE prover_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('event', 'batch')),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_prover_jobs_status ON prover_jobs(status);
CREATE INDEX idx_prover_jobs_target ON prover_jobs(target_type, target_id);
CREATE INDEX idx_prover_jobs_circuit ON prover_jobs(circuit);
CREATE INDEX idx_prover_jobs_priority ON prover_jobs(priority DESC, created_at);

-- Batches Table
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ids JSONB NOT NULL,
  prestate_root TEXT NOT NULL,
  poststate_root TEXT NOT NULL,
  proof_job_id UUID REFERENCES prover_jobs(id),
  anchor_tx JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'proving', 'ready', 'anchored')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  anchored_at TIMESTAMPTZ
);

CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_proof_job ON batches(proof_job_id);
