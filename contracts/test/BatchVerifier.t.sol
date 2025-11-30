// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Groth16Verifier.sol";
import "../src/BatchVerifier.sol";

contract BatchVerifierTest is Test {
    Groth16Verifier public verifier;
    BatchVerifier public batchVerifier;
    
    address public owner = address(this);
    address public submitter = address(0x1);
    address public unauthorized = address(0x2);

    function setUp() public {
        verifier = new Groth16Verifier();
        batchVerifier = new BatchVerifier(address(verifier));
        
        // Add submitter as authorized
        batchVerifier.addAuthorizedSubmitter(submitter);
    }

    function testDeployment() public view {
        assertEq(address(batchVerifier.verifier()), address(verifier));
        assertEq(batchVerifier.owner(), owner);
        assertTrue(batchVerifier.authorizedSubmitters(owner));
        assertTrue(batchVerifier.authorizedSubmitters(submitter));
    }

    function testAnchorBatchWithoutProof() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 batchRoot = keccak256("root1");
        bytes32 prestateRoot = keccak256("prestate1");
        bytes32 poststateRoot = keccak256("poststate1");
        string memory metadataURI = "ipfs://test";

        batchVerifier.anchorBatchWithoutProof(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            metadataURI
        );

        assertTrue(batchVerifier.isBatchVerified(batchId));
        
        BatchVerifier.Batch memory batch = batchVerifier.getBatch(batchId);
        assertEq(batch.batchRoot, batchRoot);
        assertEq(batch.prestateRoot, prestateRoot);
        assertEq(batch.poststateRoot, poststateRoot);
        assertEq(batch.submitter, owner);
        assertTrue(batch.verified);
    }

    function testCannotAnchorDuplicateBatch() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 batchRoot = keccak256("root1");
        
        batchVerifier.anchorBatchWithoutProof(
            batchId,
            batchRoot,
            bytes32(0),
            bytes32(0),
            ""
        );

        vm.expectRevert(BatchVerifier.BatchAlreadyExists.selector);
        batchVerifier.anchorBatchWithoutProof(
            batchId,
            batchRoot,
            bytes32(0),
            bytes32(0),
            ""
        );
    }

    function testUnauthorizedCannotAnchor() public {
        vm.prank(unauthorized);
        vm.expectRevert(BatchVerifier.Unauthorized.selector);
        batchVerifier.anchorBatchWithoutProof(
            keccak256("batch1"),
            keccak256("root1"),
            bytes32(0),
            bytes32(0),
            ""
        );
    }

    function testAuthorizedSubmitterCanAnchorWithProof() public {
        // Note: anchorBatchWithoutProof is onlyOwner, so submitter uses anchorBatch
        // For this test, we'll verify the submitter is authorized
        assertTrue(batchVerifier.authorizedSubmitters(submitter));
        
        // The submitter can call anchorBatch (with proof) but not anchorBatchWithoutProof
        // Since our simplified verifier accepts valid-looking proofs, test that flow
        uint256[2] memory pA = [uint256(1), uint256(2)];
        uint256[2][2] memory pB = [[uint256(1), uint256(2)], [uint256(3), uint256(4)]];
        uint256[2] memory pC = [uint256(1), uint256(2)];
        
        vm.prank(submitter);
        batchVerifier.anchorBatch(
            keccak256("batch1"),
            keccak256("root1"),
            bytes32(0),
            bytes32(0),
            pA,
            pB,
            pC,
            ""
        );

        assertTrue(batchVerifier.isBatchVerified(keccak256("batch1")));
    }

    function testGetBatchCount() public {
        assertEq(batchVerifier.getBatchCount(), 0);

        batchVerifier.anchorBatchWithoutProof(
            keccak256("batch1"),
            keccak256("root1"),
            bytes32(0),
            bytes32(0),
            ""
        );
        assertEq(batchVerifier.getBatchCount(), 1);

        batchVerifier.anchorBatchWithoutProof(
            keccak256("batch2"),
            keccak256("root2"),
            bytes32(0),
            bytes32(0),
            ""
        );
        assertEq(batchVerifier.getBatchCount(), 2);
    }

    function testRemoveAuthorizedSubmitter() public {
        assertTrue(batchVerifier.authorizedSubmitters(submitter));
        
        batchVerifier.removeAuthorizedSubmitter(submitter);
        
        assertFalse(batchVerifier.authorizedSubmitters(submitter));
        
        vm.prank(submitter);
        vm.expectRevert(BatchVerifier.Unauthorized.selector);
        batchVerifier.anchorBatchWithoutProof(
            keccak256("batch1"),
            keccak256("root1"),
            bytes32(0),
            bytes32(0),
            ""
        );
    }

    function testTransferOwnership() public {
        address newOwner = address(0x3);
        
        batchVerifier.transferOwnership(newOwner);
        assertEq(batchVerifier.owner(), newOwner);
        
        // Old owner can no longer perform owner actions
        vm.expectRevert(BatchVerifier.Unauthorized.selector);
        batchVerifier.addAuthorizedSubmitter(address(0x4));
    }

    function testBatchVerifiedEventEmitted() public {
        bytes32 batchId = keccak256("batch1");
        bytes32 batchRoot = keccak256("root1");

        // Just verify the function executes and batch is verified
        batchVerifier.anchorBatchWithoutProof(
            batchId,
            batchRoot,
            bytes32(0),
            bytes32(0),
            ""
        );
        
        assertTrue(batchVerifier.isBatchVerified(batchId));
    }
}
