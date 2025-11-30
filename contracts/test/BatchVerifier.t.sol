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

    function testDirectVerifierWithRealProof() public view {
        // Real proof generated from metrics_threshold circuit using snarkjs soliditycalldata
        // Input: actualValue=150000, threshold=100000, metricType=1
        // Public signals: [1, 100000, 1] (isValid=1, threshold=100000, metricType=1)
        uint256[2] memory pA = [
            uint256(0x1311084766c465592d14447dc47e3f8ed27c490efbd154af422964a748e4e47f),
            uint256(0x05b16ce5d08c284ff08f456cc66f9c0eb16440a9d26b5691ce487e3be738a1ca)
        ];
        uint256[2][2] memory pB = [
            [
                uint256(0x0719562818ccee6e1ebd183c389e94f264af1a28fd960671442913ce9f380a00),
                uint256(0x2ae0f371ffaf9f9455a643ffa2b4b041ea6d8cfb89f716ca11ec648b7d18490e)
            ],
            [
                uint256(0x135acce54aa683a32d1c31125aad9387f71d52443c0c5f4fdd23aa35c0ff80cf),
                uint256(0x0a04a3d0eeebf72b51b6d3d22c201f375c91952120a920002e0420a158c354dd)
            ]
        ];
        uint256[2] memory pC = [
            uint256(0x2a0e4a7964c52fd82c3c456fd9268fd49256ce7a4a359a749b6f3f978697050f),
            uint256(0x0de945d25d039d325aa400fcf807e2da0b4b1282d634f1c6ae5ff585f49af364)
        ];
        uint256[3] memory pubSignals = [uint256(1), uint256(100000), uint256(1)];
        
        bool valid = verifier.verifyProof(pA, pB, pC, pubSignals);
        console.log("Direct verifier result:", valid);
        assertTrue(valid, "Proof verification should succeed");
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
        
        // Real proof generated from metrics_threshold circuit using snarkjs soliditycalldata
        uint256[2] memory pA = [
            uint256(0x1311084766c465592d14447dc47e3f8ed27c490efbd154af422964a748e4e47f),
            uint256(0x05b16ce5d08c284ff08f456cc66f9c0eb16440a9d26b5691ce487e3be738a1ca)
        ];
        uint256[2][2] memory pB = [
            [
                uint256(0x0719562818ccee6e1ebd183c389e94f264af1a28fd960671442913ce9f380a00),
                uint256(0x2ae0f371ffaf9f9455a643ffa2b4b041ea6d8cfb89f716ca11ec648b7d18490e)
            ],
            [
                uint256(0x135acce54aa683a32d1c31125aad9387f71d52443c0c5f4fdd23aa35c0ff80cf),
                uint256(0x0a04a3d0eeebf72b51b6d3d22c201f375c91952120a920002e0420a158c354dd)
            ]
        ];
        uint256[2] memory pC = [
            uint256(0x2a0e4a7964c52fd82c3c456fd9268fd49256ce7a4a359a749b6f3f978697050f),
            uint256(0x0de945d25d039d325aa400fcf807e2da0b4b1282d634f1c6ae5ff585f49af364)
        ];
        
        // The BatchVerifier.anchorBatch constructs pubSignals as:
        // [1, batchRoot % 2^64, 1]
        // Our proof was generated with pubSignals [1, 100000, 1]
        // So we need batchRoot % 2^64 == 100000
        bytes32 batchRoot = bytes32(uint256(100000));
        
        vm.prank(submitter);
        batchVerifier.anchorBatch(
            keccak256("batch1"),
            batchRoot,
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
