#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$SCRIPT_DIR/../src"
BUILD_DIR="$SCRIPT_DIR/../build"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ZKP Circuit Build Script ===${NC}"

# Check for circom
if ! command -v circom &> /dev/null; then
    echo -e "${YELLOW}circom not found. Checking local build...${NC}"
    CIRCOM_BIN="$SCRIPT_DIR/../../../circom/target/release/circom"
    if [ -f "$CIRCOM_BIN" ]; then
        echo "Using local circom build: $CIRCOM_BIN"
        CIRCOM="$CIRCOM_BIN"
    else
        echo "Building circom from source..."
        (cd "$SCRIPT_DIR/../../../circom" && cargo build --release)
        CIRCOM="$CIRCOM_BIN"
    fi
else
    CIRCOM="circom"
fi

# Check for snarkjs
if ! command -v snarkjs &> /dev/null; then
    echo "snarkjs not found. Using npx..."
    SNARKJS="npx snarkjs"
else
    SNARKJS="snarkjs"
fi

# Ensure build directory exists
mkdir -p "$BUILD_DIR"

# Download powers of tau if not present
PTAU_FILE="$BUILD_DIR/pot15_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo -e "${YELLOW}Downloading powers of tau (pot15)...${NC}"
    curl -L -o "$PTAU_FILE" "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_15.ptau"
fi

# Function to compile a circuit
compile_circuit() {
    local CIRCUIT_NAME=$1
    local CIRCUIT_FILE="$CIRCUITS_DIR/${CIRCUIT_NAME}.circom"
    
    if [ ! -f "$CIRCUIT_FILE" ]; then
        echo "Circuit file not found: $CIRCUIT_FILE"
        return 1
    fi
    
    echo -e "${GREEN}Compiling ${CIRCUIT_NAME}...${NC}"
    
    # Compile circuit
    $CIRCOM "$CIRCUIT_FILE" --r1cs --wasm --sym -o "$BUILD_DIR" -l "$SCRIPT_DIR/../node_modules"
    
    # Generate zkey
    echo "Generating zkey for ${CIRCUIT_NAME}..."
    $SNARKJS groth16 setup "$BUILD_DIR/${CIRCUIT_NAME}.r1cs" "$PTAU_FILE" "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"
    
    # Contribute to ceremony (for production, use multiple contributors)
    echo "Contributing to ceremony..."
    echo "random entropy for ${CIRCUIT_NAME}" | $SNARKJS zkey contribute "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey" "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" --name="Local Dev" -v
    
    # Export verification key
    echo "Exporting verification key..."
    $SNARKJS zkey export verificationkey "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" "$BUILD_DIR/${CIRCUIT_NAME}_verification_key.json"
    
    # Cleanup intermediate files
    rm -f "$BUILD_DIR/${CIRCUIT_NAME}_0000.zkey"
    
    echo -e "${GREEN}✓ ${CIRCUIT_NAME} compiled successfully${NC}"
}

# Compile all circuits
compile_circuit "metrics_threshold"
compile_circuit "merkle_inclusion"

echo -e "${GREEN}=== All circuits compiled ===${NC}"
echo ""
echo "Output files in $BUILD_DIR:"
ls -la "$BUILD_DIR"
