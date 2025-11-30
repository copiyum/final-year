#!/bin/bash

# Metrics Threshold Circuit Setup Script
# This script compiles the circuit and generates proving/verification keys

set -e

echo "🔧 Setting up Metrics Threshold ZK Circuit..."
echo ""

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom not found. Installing..."
    echo "Run: npm install -g circom"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Installing..."
    npm install -g snarkjs
fi

echo "📦 Step 1: Compiling circuit..."
mkdir -p build
circom metrics_threshold.circom --r1cs --wasm --sym --output build

echo ""
echo "📊 Circuit info:"
snarkjs r1cs info build/metrics_threshold.r1cs

echo ""
echo "🔑 Step 2: Generating Powers of Tau (this may take a while)..."
# Using small ceremony for development (14 = 2^14 constraints)
if [ ! -f "build/pot14_0000.ptau" ]; then
    snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v
    snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v
else
    echo "Powers of Tau already exists, skipping..."
fi

echo ""
echo "🔐 Step 3: Generating proving and verification keys..."
snarkjs groth16 setup build/metrics_threshold.r1cs build/pot14_final.ptau build/metrics_threshold_0000.zkey
snarkjs zkey contribute build/metrics_threshold_0000.zkey build/metrics_threshold_final.zkey --name="Second contribution" -v -e="more random entropy"
snarkjs zkey export verificationkey build/metrics_threshold_final.zkey build/verification_key.json

echo ""
echo "✅ Circuit setup complete!"
echo ""
echo "📁 Generated files:"
echo "   - build/metrics_threshold.wasm (witness generator)"
echo "   - build/metrics_threshold_final.zkey (proving key)"
echo "   - build/verification_key.json (verification key)"
echo ""
echo "🧪 Test the circuit with:"
echo "   ./test-circuit.sh"
