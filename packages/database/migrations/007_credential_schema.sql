-- Credential Issuer Database Schema

-- Credential Issuances table
CREATE TABLE IF NOT EXISTS credential_issuances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root TEXT NOT NULL,
    holders JSONB NOT NULL,
    leaves JSONB NOT NULL,
    issued_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP DEFAULT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_credential_issuances_root ON credential_issuances(root);
CREATE INDEX IF NOT EXISTS idx_credential_issuances_issued_at ON credential_issuances(issued_at);
