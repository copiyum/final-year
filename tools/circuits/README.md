# Metrics Threshold ZK Circuit

## Overview

This circuit proves that a startup's metric exceeds a threshold without revealing the actual value.

**Use Case:** A startup wants to prove "We have > 100K users" without revealing they have exactly 127K users.

## Circuit Design

**Private Input:**
- `actualValue` - The real metric value (kept secret)

**Public Inputs:**
- `threshold` - The minimum value to prove against
- `metricType` - Identifier for the metric (1=users, 2=revenue, etc.)

**Output:**
- `isValid` - Boolean (1 if actualValue > threshold, else proof generation fails)

## Setup

1. **Install dependencies:**
```bash
npm install -g circom snarkjs
```

2. **Compile circuit and generate keys:**
```bash
cd tools/circuits
./setup-circuit.sh
```

This will:
- Compile the Circom circuit to R1CS
- Generate WASM witness generator
- Run Powers of Tau ceremony
- Generate proving and verification keys

## Testing

```bash
cd tools/circuits
./test-circuit.sh
```

This runs two tests:
1. ✅ Prove 150,000 > 100,000 (succeeds)
2. ✅ Prove 80,000 > 100,000 (fails as expected)

## Usage in Prover Worker

The Prover Worker will use these artifacts:

```typescript
import * as snarkjs from 'snarkjs';

const input = {
  actualValue: 127000,  // Private
  threshold: 100000,    // Public
  metricType: 1         // Public (1 = users)
};

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  input,
  'circuits/build/metrics_threshold.wasm',
  'circuits/build/metrics_threshold_final.zkey'
);

// Verify
const vkey = JSON.parse(fs.readFileSync('circuits/build/verification_key.json'));
const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
```

## Files Generated

- `build/metrics_threshold.wasm` - Witness generator (copy to prover-worker)
- `build/metrics_threshold_final.zkey` - Proving key (copy to prover-worker)
- `build/verification_key.json` - Verification key (for public verification)
- `build/metrics_threshold.r1cs` - Constraint system (for reference)

## Security Notes

- This is a simplified circuit for Phase-1
- Production version should include:
  - Range checks to prevent overflow
  - Additional constraints for metric validity
  - Nullifier to prevent proof reuse
  - Timestamp constraints for freshness

## Next Steps

1. Run `./setup-circuit.sh` to compile
2. Run `./test-circuit.sh` to verify
3. Copy artifacts to `apps/prover-worker/circuits/`
4. Update Prover Worker to use real proofs
