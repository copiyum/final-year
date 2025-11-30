// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVerifier
 * @notice Interface for Groth16 verifier with single public input (legacy)
 */
interface IVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title IVerifierMulti
 * @notice Interface for Groth16 verifier with multiple public inputs (rollup circuit)
 */
interface IVerifierMulti {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external view returns (bool);
}

contract AnchorRegistry {
    struct Anchor {
        bytes32 batchRoot;
        bytes32 prestateRoot;
        bytes32 poststateRoot;
        uint256 timestamp;
        string metadataURI;
    }
    
    mapping(bytes32 => Anchor) public anchors;
    
    event BatchVerified(
        bytes32 indexed batchId,
        bytes32 batchRoot,
        bytes32 prestateRoot,
        bytes32 poststateRoot,
        uint256 timestamp
    );
    
    IVerifier public verifier;
    IVerifierMulti public verifierMulti;
    bool public useMultiInputVerifier;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
        owner = msg.sender;
    }
    
    /**
     * @notice Set the multi-input verifier for full rollup circuit support
     * @param _verifierMulti Address of the multi-input verifier contract
     */
    function setMultiInputVerifier(address _verifierMulti) external onlyOwner {
        verifierMulti = IVerifierMulti(_verifierMulti);
        useMultiInputVerifier = true;
    }
    
    function anchorBatch(
        bytes32 batchId,
        bytes32 batchRoot,
        bytes32 prestateRoot,
        bytes32 poststateRoot,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        string calldata metadataURI
    ) external {
        require(anchors[batchId].timestamp == 0, "Batch already anchored");
        
        bool valid;
        
        if (useMultiInputVerifier && address(verifierMulti) != address(0)) {
            // Full rollup circuit verification with all public inputs:
            // [0] prestateRoot - state before batch
            // [1] poststateRoot - state after batch  
            // [2] batchRoot - Merkle root of events
            uint256[3] memory pubSignals;
            pubSignals[0] = uint256(prestateRoot);
            pubSignals[1] = uint256(poststateRoot);
            pubSignals[2] = uint256(batchRoot);
            
            valid = verifierMulti.verifyProof(_pA, _pB, _pC, pubSignals);
        } else {
            // Legacy single-input verification (batchRoot only)
            uint256[1] memory pubSignals;
            pubSignals[0] = uint256(batchRoot);
            
            valid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        }
        
        require(valid, "Invalid proof");
        
        anchors[batchId] = Anchor({
            batchRoot: batchRoot,
            prestateRoot: prestateRoot,
            poststateRoot: poststateRoot,
            timestamp: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit BatchVerified(
            batchId,
            batchRoot,
            prestateRoot,
            poststateRoot,
            block.timestamp
        );
    }
    
    function getAnchor(bytes32 batchId) external view returns (Anchor memory) {
        return anchors[batchId];
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
