#!/bin/bash

# Test script for Metrics Threshold Circuit

set -e

echo "🧪 Testing Metrics Threshold Circuit..."
echo ""

# Test case 1: actualValue (150000) > threshold (100000) - should succeed
echo "Test 1: Proving 150,000 > 100,000 (should succeed)"
cat > build/input.json <<EOF
{
  "actualValue": "150000",
  "threshold": "100000",
  "metricType": "1"
}
EOF

echo "Generating witness..."
node build/metrics_threshold_js/generate_witness.js build/metrics_threshold_js/metrics_threshold.wasm build/input.json build/witness.wtns

echo "Generating proof..."
snarkjs groth16 prove build/metrics_threshold_final.zkey build/witness.wtns build/proof.json build/public.json

echo "Verifying proof..."
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

echo ""
echo "✅ Test 1 passed!"
echo ""

# Test case 2: actualValue (80000) > threshold (100000) - should fail
echo "Test 2: Proving 80,000 > 100,000 (should fail)"
cat > build/input_fail.json <<EOF
{
  "actualValue": "80000",
  "threshold": "100000",
  "metricType": "1"
}
EOF

echo "Generating witness (this should fail)..."
if node build/metrics_threshold_js/generate_witness.js build/metrics_threshold_js/metrics_threshold.wasm build/input_fail.json build/witness_fail.wtns 2>&1 | grep -q "Error"; then
    echo "✅ Test 2 passed! (correctly failed to generate proof for false statement)"
else
    echo "❌ Test 2 failed! (should not be able to prove false statement)"
fi

echo ""
echo "🎉 All tests complete!"
