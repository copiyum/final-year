#!/bin/bash

# ZKP Ledger System - Reset Everything
# This script stops all services and clears all data

echo "🔄 Resetting ZKP Ledger System..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Confirm reset
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL data including:${NC}"
echo "   - All database records (events, batches, users, startups, etc.)"
echo "   - All MinIO/S3 stored proofs"
echo "   - Redis queue data"
echo "   - All log files"
echo "   - Anvil blockchain state"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo "🛑 Stopping all services..."

# Stop all services using stop-all.sh
./stop-all.sh 2>/dev/null

# Kill any remaining processes
echo "🔪 Killing any remaining processes..."
pkill -f "bun run" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true
pkill -f "anvil" 2>/dev/null || true
pkill -f "prover-worker" 2>/dev/null || true
pkill -f "rollup-aggregator" 2>/dev/null || true
sleep 2

echo ""
echo "🗑️  Clearing database..."
# Reset PostgreSQL database - use CASCADE to handle foreign keys
docker exec final-postgres-1 psql -U postgres -d zkp_ledger -c "
-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Truncate all tables with CASCADE
TRUNCATE TABLE startup_metrics CASCADE;
TRUNCATE TABLE startup_documents CASCADE;
TRUNCATE TABLE access_permissions CASCADE;
TRUNCATE TABLE commitments CASCADE;
TRUNCATE TABLE interests CASCADE;
TRUNCATE TABLE startups CASCADE;
TRUNCATE TABLE user_credentials CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE prover_jobs CASCADE;
TRUNCATE TABLE batches CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE blocks CASCADE;
TRUNCATE TABLE credentials CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';
" 2>/dev/null && echo "   ✅ Database cleared" || echo "   Database reset skipped (tables may not exist)"

echo ""
echo "🗑️  Clearing Redis..."
docker exec final-redis-1 redis-cli FLUSHALL 2>/dev/null || echo "   Redis reset skipped"

echo ""
echo "🗑️  Clearing MinIO storage..."
# Clear MinIO bucket
docker exec final-minio-1 mc rm --recursive --force /data/zkp-proofs 2>/dev/null || true
docker exec final-minio-1 mkdir -p /data/zkp-proofs 2>/dev/null || true

echo ""
echo "🗑️  Clearing logs..."
rm -rf logs/*.log logs/*.pid 2>/dev/null || true
mkdir -p logs

echo ""
echo "🗑️  Clearing contract broadcast cache..."
rm -rf contracts/broadcast/* 2>/dev/null || true
rm -rf contracts/cache/Deploy.s.sol 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Reset complete!${NC}"
echo ""
echo "To start fresh, run: ./start-all.sh"
