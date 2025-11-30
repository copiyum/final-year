#!/bin/bash

echo "🚀 Starting ZKP Ledger System with Identity Service..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📋 Loading environment from .env..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if infrastructure is running
echo "📋 Checking infrastructure..."
if ! docker ps | grep -q postgres; then
    echo "⚠️  PostgreSQL not running. Starting with docker-compose..."
    docker-compose up -d postgres redis minio
    sleep 2
fi

# Start Anvil (local Ethereum node) if not running
echo "⛓️  Checking Anvil (local blockchain)..."
if ! lsof -i :8545 > /dev/null 2>&1; then
    echo -e "${BLUE}Starting Anvil on port 8545...${NC}"
    anvil --host 0.0.0.0 > logs/anvil.log 2>&1 &
    echo $! > logs/anvil.pid
    sleep 2
    
    # Always deploy contracts when starting fresh Anvil
    echo "📜 Deploying smart contracts to fresh Anvil..."
    cd contracts
    PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast > ../logs/contract-deploy.log 2>&1
    cd - > /dev/null
    echo "   ✅ Contracts deployed:"
    echo "      Groth16Verifier: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
    echo "      BatchVerifier:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
else
    echo "   Anvil already running on port 8545"
fi

# Function to check and free port
check_port() {
    local port=$1
    local name=$2
    if lsof -i :$port > /dev/null; then
        echo "⚠️  Port $port is in use. Killing process..."
        lsof -ti :$port | xargs kill -9
        sleep 1
    fi
}

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local port=$3
    local logname=$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    
    check_port $port "$name"
    
    echo -e "${BLUE}Starting $name on port $port...${NC}"
    cd "$dir"
    # Use tsx for prover-worker (snarkjs has Bun compatibility issues with web workers)
    if [ "$name" = "Prover Worker" ]; then
        PORT=$port npx tsx src/main.ts > "../../logs/${logname}.log" 2>&1 &
    else
        PORT=$port bun run src/main.ts > "../../logs/${logname}.log" 2>&1 &
    fi
    echo $! > "../../logs/${logname}.pid"
    cd - > /dev/null
}

# Create logs directory
mkdir -p logs

# Start backend services
echo ""
echo "🔧 Starting backend services..."
start_service "Ledger Service" "apps/ledger-service" 3000
sleep 1
start_service "Prover Coordinator" "apps/prover-coordinator" 3001
sleep 1
start_service "Prover Worker" "apps/prover-worker" 3002
sleep 1
start_service "Rollup Aggregator" "apps/rollup-aggregator" 3003
sleep 1
start_service "Credential Issuer" "apps/credential-issuer" 3004
sleep 1
start_service "API Gateway" "apps/api-gateway" 3005
sleep 1
start_service "Identity Service" "apps/identity-service" 3007
sleep 1
start_service "Startup Service" "apps/startup-service" 3008
sleep 1
start_service "Investor Service" "apps/investor-service" 3009
sleep 2

# Start frontend
echo ""
echo "🎨 Starting frontend..."
check_port 3006 "Frontend"
cd apps/web
PORT=3006 bun run dev > ../../logs/web.log 2>&1 &
echo $! > ../../logs/web.pid
cd - > /dev/null

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📍 Service URLs:"
echo "   - Frontend:          http://localhost:3006"
echo "   - API Gateway:       http://localhost:3005/api"
echo "   - Ledger Service:    http://localhost:3000"
echo "   - Prover Coordinator: http://localhost:3001"
echo "   - Identity Service:  http://localhost:3007"
echo "   - Startup Service:   http://localhost:3008"
echo "   - Investor Service:  http://localhost:3009"
echo "   - Metrics:           http://localhost:3000/metrics"
echo ""
echo "⛓️  Blockchain:"
echo "   - Anvil RPC:         http://localhost:8545"
echo "   - BatchVerifier:     ${BATCH_VERIFIER_ADDRESS:-Check logs/contract-deploy.log}"
echo ""
echo "📝 Logs are in ./logs/"
echo ""
echo "To stop all services, run: ./stop-all.sh"
echo "To view logs, run: tail -f logs/<service>.log"
