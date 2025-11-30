// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Groth16Verifier.sol";

/**
 * @title BatchVerifier
 * @notice Anchors ZKP batch proofs on-chain for the startup-investor platform
 * @dev Stores batch roots and emits events for off-chain indexing
 */
contract BatchVerifier {
    // Events
    event BatchVerified(
        bytes32 indexed batchId,
        bytes32 indexed batchRoot,
        uint256 timestamp,
        address indexed submitter
    );
    
    event BatchRejected(
        bytes32 indexed batchId,
        string reason
    );

    // State
    Groth16Verifier public immutable verifier;
    address public owner;
    
    // Batch storage
    struct Batch {
        bytes32 batchRoot;
        bytes32 prestateRoot;
        bytes32 poststateRoot;
        uint256 timestamp;
        uint256 blockNumber;
        address submitter;
        string metadataURI;
        bool verified;
    }
    
    mapping(bytes32 => Batch) public batches;
    bytes32[] public batchIds;
    
    // Access control
    mapping(address => bool) public authorizedSubmitters;
    
    // Errors
    error Unauthorized();
    error BatchAlreadyExists();
    error InvalidProof();
    error BatchNotFound();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier onlyAuthorized() {
        if (!authorizedSubmitters[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _verifier) {
        verifier = Groth16Verifier(_verifier);
        owner = msg.sender;
        authorizedSubmitters[msg.sender] = true;
    }

    /**
     * @notice Anchor a batch with ZKP verification
     * @param batchId Unique identifier for the batch
     * @param batchRoot Merkle root of the batch
     * @param prestateRoot Pre-state Merkle root
     * @param poststateRoot Post-state Merkle root
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param metadataURI IPFS or HTTP URI for batch metadata
     */
    function anchorBatch(
        bytes32 batchId,
        bytes32 batchRoot,
        bytes32 prestateRoot,
        bytes32 poststateRoot,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        string calldata metadataURI
    ) external onlyAuthorized {
        // Check batch doesn't already exist
        if (batches[batchId].verified) revert BatchAlreadyExists();
        
        // Prepare public signals for verification
        // [isValid, threshold, metricType] - we verify isValid == 1
        uint256[3] memory pubSignals;
        pubSignals[0] = 1; // isValid must be 1
        pubSignals[1] = uint256(batchRoot) % (2**64); // Use part of batchRoot as threshold placeholder
        pubSignals[2] = 1; // metricType
        
        // Verify the proof
        bool valid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        
        if (!valid) {
            emit BatchRejected(batchId, "Invalid ZKP proof");
            revert InvalidProof();
        }
        
        // Store batch
        batches[batchId] = Batch({
            batchRoot: batchRoot,
            prestateRoot: prestateRoot,
            poststateRoot: poststateRoot,
            timestamp: block.timestamp,
            blockNumber: block.number,
            submitter: msg.sender,
            metadataURI: metadataURI,
            verified: true
        });
        
        batchIds.push(batchId);
        
        emit BatchVerified(batchId, batchRoot, block.timestamp, msg.sender);
    }
    
    /**
     * @notice Anchor a batch without ZKP verification (for testing/mock mode)
     * @dev Only owner can use this function
     */
    function anchorBatchWithoutProof(
        bytes32 batchId,
        bytes32 batchRoot,
        bytes32 prestateRoot,
        bytes32 poststateRoot,
        string calldata metadataURI
    ) external onlyOwner {
        if (batches[batchId].verified) revert BatchAlreadyExists();
        
        batches[batchId] = Batch({
            batchRoot: batchRoot,
            prestateRoot: prestateRoot,
            poststateRoot: poststateRoot,
            timestamp: block.timestamp,
            blockNumber: block.number,
            submitter: msg.sender,
            metadataURI: metadataURI,
            verified: true
        });
        
        batchIds.push(batchId);
        
        emit BatchVerified(batchId, batchRoot, block.timestamp, msg.sender);
    }

    /**
     * @notice Check if a batch is verified
     */
    function isBatchVerified(bytes32 batchId) external view returns (bool) {
        return batches[batchId].verified;
    }
    
    /**
     * @notice Get batch details
     */
    function getBatch(bytes32 batchId) external view returns (Batch memory) {
        if (!batches[batchId].verified) revert BatchNotFound();
        return batches[batchId];
    }
    
    /**
     * @notice Get total number of verified batches
     */
    function getBatchCount() external view returns (uint256) {
        return batchIds.length;
    }
    
    /**
     * @notice Get batch ID by index
     */
    function getBatchIdByIndex(uint256 index) external view returns (bytes32) {
        return batchIds[index];
    }

    // Access control functions
    function addAuthorizedSubmitter(address submitter) external onlyOwner {
        authorizedSubmitters[submitter] = true;
    }
    
    function removeAuthorizedSubmitter(address submitter) external onlyOwner {
        authorizedSubmitters[submitter] = false;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
