# Smart Contract Deployment Guide

## Overview

This guide covers deploying the ZKP Ledger System smart contracts to testnets.

## Contracts

1. **Groth16Verifier.sol** - Verifies Groth16 ZKP proofs
2. **BatchVerifier.sol** - Anchors batch proofs on-chain with access control

## Prerequisites

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Get testnet tokens:
   - Polygon Amoy: https://faucet.polygon.technology/
   - Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

3. Set up environment variables:
```bash
cp .env.testnet .env
# Edit .env with your values
```

## Local Testing

```bash
cd contracts

# Run tests
forge test -vvv

# Run specific test
forge test --match-test testAnchorBatchWithoutProof -vvv

# Gas report
forge test --gas-report
```

## Deploy to Testnet

### Polygon Amoy

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# Deploy
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $POLYGON_AMOY_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

# Verify contracts (if not auto-verified)
forge verify-contract <VERIFIER_ADDRESS> src/Groth16Verifier.sol:Groth16Verifier \
    --chain polygon-amoy \
    --etherscan-api-key $POLYGONSCAN_API_KEY

forge verify-contract <BATCH_VERIFIER_ADDRESS> src/BatchVerifier.sol:BatchVerifier \
    --chain polygon-amoy \
    --constructor-args $(cast abi-encode "constructor(address)" <VERIFIER_ADDRESS>) \
    --etherscan-api-key $POLYGONSCAN_API_KEY
```

### Base Sepolia

```bash
export PRIVATE_KEY=your_private_key
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

forge script script/Deploy.s.sol:DeployScript \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv
```

## Post-Deployment

1. Update `.env` with deployed contract addresses:
```
GROTH16_VERIFIER_ADDRESS=0x...
BATCH_VERIFIER_ADDRESS=0x...
```

2. Add authorized submitters (the rollup aggregator wallet):
```bash
cast send $BATCH_VERIFIER_ADDRESS \
    "addAuthorizedSubmitter(address)" \
    $AGGREGATOR_WALLET_ADDRESS \
    --rpc-url $POLYGON_AMOY_RPC_URL \
    --private-key $PRIVATE_KEY
```

3. Restart the rollup-aggregator service to enable on-chain anchoring.

## Contract Interaction

### Check if batch is verified
```bash
cast call $BATCH_VERIFIER_ADDRESS \
    "isBatchVerified(bytes32)" \
    0x... \
    --rpc-url $POLYGON_AMOY_RPC_URL
```

### Get batch details
```bash
cast call $BATCH_VERIFIER_ADDRESS \
    "getBatch(bytes32)" \
    0x... \
    --rpc-url $POLYGON_AMOY_RPC_URL
```

### Get batch count
```bash
cast call $BATCH_VERIFIER_ADDRESS \
    "getBatchCount()" \
    --rpc-url $POLYGON_AMOY_RPC_URL
```

## Security Considerations

1. **Private Key Security**: Never commit private keys. Use environment variables or hardware wallets.

2. **Access Control**: Only authorized submitters can anchor batches. The owner can add/remove submitters.

3. **Proof Verification**: The `anchorBatch` function verifies proofs on-chain. Use `anchorBatchWithoutProof` only for testing.

4. **Gas Costs**: Proof verification is gas-intensive (~300k gas). Ensure sufficient funds.

## Troubleshooting

### "Unauthorized" error
- Ensure the submitter address is authorized
- Check that you're using the correct private key

### "BatchAlreadyExists" error
- The batch ID has already been anchored
- Use a unique batch ID

### Verification failed
- Ensure the proof is valid
- Check that public signals match the expected format

## Contract Addresses (Testnet)

| Network | Groth16Verifier | BatchVerifier |
|---------|-----------------|---------------|
| Polygon Amoy | TBD | TBD |
| Base Sepolia | TBD | TBD |
