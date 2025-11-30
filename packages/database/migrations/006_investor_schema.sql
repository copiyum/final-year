-- Investor Service Database Schema

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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_interests_investor ON interests(investor_id);
CREATE INDEX IF NOT EXISTS idx_interests_startup ON interests(startup_id);
CREATE INDEX IF NOT EXISTS idx_commitments_investor ON commitments(investor_id);
CREATE INDEX IF NOT EXISTS idx_commitments_startup ON commitments(startup_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status ON commitments(status);
