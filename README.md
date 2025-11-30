# ZKP Ledger System

A zero-knowledge proof platform for startup-investor interactions with on-chain verification.

## Overview

This system enables startups to prove business metrics (revenue, users, growth) to investors without revealing exact values, using zero-knowledge proofs anchored on-chain for public verifiability.

### Key Features

- Zero-knowledge proof generation for metrics threshold verification
- On-chain batch anchoring with Groth16 verification
- Merkle tree-based event batching and inclusion proofs
- Role-based access control (founders, investors)
- Real-time proof status tracking
- Interactive proof visualization

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js)                        │
│                    Startup Dashboard | Investor Dashboard           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway (3005)                          │
│                    JWT Auth | Rate Limiting | Routing               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│Identity Service│         │ Startup Service │         │Investor Service │
│    (3007)     │         │     (3008)      │         │     (3009)      │
└───────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Ledger Service (3000)                        │
│                    Event Storage | Merkle Trees | Blocks            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    Prover     │         │     Rollup      │         │   Credential    │
│  Coordinator  │◄────────│   Aggregator    │         │     Issuer      │
│    (3001)     │         │     (3003)      │         │     (3004)      │
└───────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        ▼                           ▼
┌───────────────┐         ┌─────────────────┐
│ Prover Worker │         │   Blockchain    │
│    (3002)     │         │  (Anvil/Testnet)│
└───────────────┘         └─────────────────┘
        │                           │
        ▼                           ▼
┌───────────────┐         ┌─────────────────┐
│     MinIO     │         │  BatchVerifier  │
│   (Proofs)    │         │    Contract     │
└───────────────┘         └─────────────────┘
```

## Prerequisites

- Node.js 20+
- Bun 1.0+
- Docker and Docker Compose
- Foundry (for smart contracts)
- Circom 2.x (for circuit compilation)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd zkp-ledger-system
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local development)
```

### 3. Start Infrastructure

```bash
docker-compose up -d postgres redis minio
```

### 4. Run Database Migrations

```bash
cd packages/database
npm run migrate
```

### 5. Start All Services

```bash
./start-all.sh
```

This will start:
- Anvil (local Ethereum node) on port 8545
- Deploy smart contracts automatically
- All backend services (ports 3000-3009)
- Frontend on port 3006

### 6. Access the Application

- Frontend: http://localhost:3006
- API Gateway: http://localhost:3005/api
- Anvil RPC: http://localhost:8545

## Project Structure

```
zkp-ledger-system/
├── apps/
│   ├── api-gateway/          # API routing and authentication
│   ├── credential-issuer/    # ZK credential management
│   ├── identity-service/     # User authentication
│   ├── investor-service/     # Investor interactions
│   ├── ledger-service/       # Event storage and Merkle trees
│   ├── prover-coordinator/   # Proof job management
│   ├── prover-worker/        # ZKP generation with snarkjs
│   ├── rollup-aggregator/    # Batch creation and on-chain anchoring
│   ├── startup-service/      # Startup profile and metrics
│   └── web/                  # Next.js frontend
├── contracts/                # Solidity smart contracts (Foundry)
├── packages/
│   ├── common/               # Shared utilities (hashing, Merkle trees)
│   ├── database/             # Database module and migrations
│   ├── queue/                # Redis Streams queue module
│   └── storage/              # MinIO/S3 storage module
└── tools/
    └── circuits/             # Circom circuits and setup scripts
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Ledger Service | 3000 | Event storage, blocks, Merkle proofs |
| Prover Coordinator | 3001 | Proof job queue management |
| Prover Worker | 3002 | ZKP generation using snarkjs |
| Rollup Aggregator | 3003 | Batch creation and on-chain anchoring |
| Credential Issuer | 3004 | ZK credential issuance |
| API Gateway | 3005 | Authentication and routing |
| Frontend | 3006 | Next.js web application |
| Identity Service | 3007 | User registration and JWT auth |
| Startup Service | 3008 | Startup profiles and metrics |
| Investor Service | 3009 | Investor interests and commitments |

## Smart Contracts

Located in `contracts/`:

- **Groth16Verifier.sol**: Verifies Groth16 ZK proofs on-chain
- **BatchVerifier.sol**: Anchors batch proofs with event emission

### Deployment

Contracts are automatically deployed when starting with `./start-all.sh`. For manual deployment:

```bash
cd contracts
PRIVATE_KEY=<your-key> forge script script/Deploy.s.sol --rpc-url <rpc-url> --broadcast
```

### Contract Addresses (Local Anvil)

| Contract | Address |
|----------|---------|
| Groth16Verifier | 0x5FbDB2315678afecb367f032d93F642f64180aa3 |
| BatchVerifier | 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 |

## ZK Circuits

The `metrics_threshold` circuit proves that a value exceeds a threshold without revealing the actual value.

### Circuit Inputs

- `actualValue` (private): The real metric value
- `threshold` (public): The minimum threshold to prove
- `metricType` (public): Type identifier for the metric

### Circuit Output

- `isValid`: 1 if actualValue > threshold, 0 otherwise

### Compiling Circuits

```bash
cd tools/circuits
./setup.sh
```

## API Reference

### Authentication

```
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login and get JWT
POST /api/auth/refresh     # Refresh JWT token
GET  /api/auth/me          # Get current user
```

### Startups

```
POST /api/startups              # Create startup profile
GET  /api/startups              # List startups
GET  /api/startups/:id          # Get startup details
PUT  /api/startups/:id          # Update startup
POST /api/startups/:id/metrics  # Add metric with ZKP
GET  /api/startups/:id/metrics  # Get metrics with proof status
```

### Investors

```
POST /api/investor/interests     # Express interest
GET  /api/investor/interests     # List interests
POST /api/investor/commitments   # Make commitment
GET  /api/investor/commitments   # List commitments
```

### Verification

```
GET /api/verify/batch/:batchId   # Public batch verification
GET /api/events/:id/proof        # Get inclusion proof
```

## Development

### Running Individual Services

```bash
cd apps/<service-name>
bun run src/main.ts
```

### Running Tests

```bash
# All tests
npm test

# Specific package
cd packages/common
npm test

# Contract tests
cd contracts
forge test
```

### Resetting Data

To clear all data and start fresh:

```bash
./reset-all.sh
./start-all.sh
```

### Stopping Services

```bash
./stop-all.sh
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://postgres:password@localhost:5432/zkp_ledger |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| BLOCKCHAIN_RPC_URL | Ethereum RPC endpoint | http://localhost:8545 |
| BATCH_VERIFIER_ADDRESS | BatchVerifier contract address | (set after deployment) |
| JWT_SECRET | Secret for JWT signing | (required) |

## Proof Flow

1. **Event Submission**: User action creates an event in the Ledger Service
2. **Batching**: Rollup Aggregator collects events into batches (every 10 seconds or 10 events)
3. **Proof Generation**: Prover Worker generates Groth16 proof using snarkjs
4. **Storage**: Proof artifacts uploaded to MinIO
5. **Anchoring**: Batch root and proof anchored on-chain via BatchVerifier contract
6. **Verification**: Anyone can verify the batch using the public contract

## Troubleshooting

### Services not starting

Check logs in `./logs/` directory:
```bash
tail -f logs/<service-name>.log
```

### Database connection issues

Ensure PostgreSQL is running:
```bash
docker-compose ps
docker-compose up -d postgres
```

### Proof generation failing

Check prover-worker logs:
```bash
tail -f logs/prover-worker.log
```

Ensure circuit files exist in `apps/prover-worker/circuits/`:
- metrics_threshold.wasm
- metrics_threshold_final.zkey
- verification_key.json

### Contract deployment issues

Ensure Anvil is running:
```bash
lsof -i :8545
```

If not, start it manually:
```bash
anvil --host 0.0.0.0
```

## License

MIT
