// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AnchorRegistry.sol";
import "../src/Verifier.sol";

/**
 * @title MockVerifier
 * @notice A mock verifier for testing that allows controlled proof validation
 * @dev In production tests, use actual circuit-generated proofs
 */
contract MockVerifier {
    bool public shouldVerify = true;
    
    function setVerifyResult(bool _result) external {
        shouldVerify = _result;
    }
    
    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[1] calldata
    ) external view returns (bool) {
        return shouldVerify;
    }
}

contract AnchorRegistryTest is Test {
    AnchorRegistry public registry;
    MockVerifier public mockVerifier;
    Groth16Verifier public realVerifier;

    function setUp() public {
        // Use mock verifier for unit tests
        mockVerifier = new MockVerifier();
        registry = new AnchorRegistry(address(mockVerifier));
        
        // Also deploy real verifier for integration tests
        realVerifier = new Groth16Verifier();
    }

    function testAnchorBatchWithMockVerifier() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 batchRoot = bytes32(uint256(123));
        bytes32 prestateRoot = bytes32(uint256(456));
        bytes32 poststateRoot = batchRoot;
        string memory metadataURI = "ipfs://test";

        // Mock verifier is configured to return true by default
        uint256[2] memory pA = [uint256(0), uint256(0)];
        uint256[2][2] memory pB = [[uint256(0), uint256(0)], [uint256(0), uint256(0)]];
        uint256[2] memory pC = [uint256(0), uint256(0)];

        vm.expectEmit(true, false, false, true);
        emit AnchorRegistry.BatchVerified(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            block.timestamp
        );

        registry.anchorBatch(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            pA,
            pB,
            pC,
            metadataURI
        );

        AnchorRegistry.Anchor memory anchor = registry.getAnchor(batchId);
        assertEq(anchor.batchRoot, batchRoot);
        assertEq(anchor.timestamp, block.timestamp);
    }
    
    function testAnchorBatchRejectsInvalidProof() public {
        bytes32 batchId = keccak256("batch2");
        bytes32 batchRoot = bytes32(uint256(789));
        bytes32 prestateRoot = bytes32(uint256(0));
        bytes32 poststateRoot = batchRoot;
        string memory metadataURI = "ipfs://test2";

        // Configure mock to reject proofs
        mockVerifier.setVerifyResult(false);

        uint256[2] memory pA = [uint256(0), uint256(0)];
        uint256[2][2] memory pB = [[uint256(0), uint256(0)], [uint256(0), uint256(0)]];
        uint256[2] memory pC = [uint256(0), uint256(0)];

        vm.expectRevert("Invalid proof");
        registry.anchorBatch(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            pA,
            pB,
            pC,
            metadataURI
        );
    }
    
    function testCannotAnchorSameBatchTwice() public {
        bytes32 batchId = keccak256("batch3");
        bytes32 batchRoot = bytes32(uint256(111));
        bytes32 prestateRoot = bytes32(uint256(0));
        bytes32 poststateRoot = batchRoot;
        string memory metadataURI = "ipfs://test3";

        uint256[2] memory pA = [uint256(0), uint256(0)];
        uint256[2][2] memory pB = [[uint256(0), uint256(0)], [uint256(0), uint256(0)]];
        uint256[2] memory pC = [uint256(0), uint256(0)];

        // First anchor should succeed
        registry.anchorBatch(batchId, batchRoot, prestateRoot, poststateRoot, pA, pB, pC, metadataURI);
        
        // Second anchor should fail
        vm.expectRevert("Batch already anchored");
        registry.anchorBatch(batchId, batchRoot, prestateRoot, poststateRoot, pA, pB, pC, metadataURI);
    }
    
    /**
     * @notice Integration test placeholder for real proof verification
     * @dev To run this test with real proofs:
     * 1. Generate a valid proof using snarkjs for the rollup circuit
     * 2. Export the proof values and uncomment this test
     * 3. Deploy the real Groth16Verifier generated from the circuit
     */
    // function testAnchorBatchWithRealProof() public {
    //     // Deploy registry with real verifier
    //     AnchorRegistry realRegistry = new AnchorRegistry(address(realVerifier));
    //     
    //     // These values should come from actual snarkjs proof generation
    //     // uint256[2] memory pA = [...];
    //     // uint256[2][2] memory pB = [...];
    //     // uint256[2] memory pC = [...];
    //     // bytes32 batchRoot = ...; // Must match public input used in proof
    //     
    //     // realRegistry.anchorBatch(...);
    // }
}
