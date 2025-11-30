// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AnchorRegistry.sol";
import "../src/Verifier.sol";

contract AnchorRegistryTest is Test {
    AnchorRegistry public registry;
    Groth16Verifier public verifier;

    function setUp() public {
        verifier = new Groth16Verifier();
        registry = new AnchorRegistry(address(verifier));
    }

    function testAnchorBatch() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 batchRoot = bytes32(uint256(123)); // Mock root
        bytes32 prestateRoot = bytes32(uint256(456));
        bytes32 poststateRoot = batchRoot;
        string memory metadataURI = "ipfs://test";

        // Mock proof data (valid for Groth16, but verifier will reject if not real)
        // Since we can't easily generate a valid proof in test without circuit,
        // we might need to mock the Verifier or use vm.mockCall.
        
        // Let's mock the verifier call to return true
        vm.mockCall(
            address(verifier),
            abi.encodeWithSelector(IVerifier.verifyProof.selector),
            abi.encode(true)
        );

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
}
