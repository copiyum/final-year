-- Migration: Investor-driven metric verification requests
-- Allows investors to request ZKP verification of startup metrics with custom thresholds

CREATE TABLE IF NOT EXISTS metric_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,  -- e.g., 'revenue', 'users', 'mrr'
    threshold DECIMAL(15,2) NOT NULL,   -- investor's requested threshold
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'verified', 'failed')),
    proof_result BOOLEAN,               -- true if metric > threshold, false otherwise, NULL if not yet proven
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
