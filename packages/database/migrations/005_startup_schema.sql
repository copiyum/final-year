-- Startup Service Database Schema

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_startups_founder ON startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startup_documents_startup ON startup_documents(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_metrics_startup ON startup_metrics(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_metrics_status ON startup_metrics(proof_status);
CREATE INDEX IF NOT EXISTS idx_access_permissions_startup ON access_permissions(startup_id);
CREATE INDEX IF NOT EXISTS idx_access_permissions_investor ON access_permissions(investor_id);
CREATE INDEX IF NOT EXISTS idx_access_permissions_lookup ON access_permissions(startup_id, investor_id);

-- Update timestamp trigger for startups
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON startups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
