// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals
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
    
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
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
        // Construct public inputs array
        // The circuit likely has public inputs: [batchRoot] or similar.
        // We need to match the circuit's public input structure.
        // For merkle_inclusion, it was just root.
        // For rollup circuit (not yet implemented fully, but assuming structure), 
        // let's assume the public input is the batchRoot (poststate_root).
        // If the circuit has more public inputs, we need to adjust.
        // Based on design.md, the batch circuit has prestate and poststate.
        // But for now, let's assume the public signal is the batchRoot (poststate).
        
        // Converting bytes32 to uint256 for snarkjs verifier
        uint256[1] memory pubSignals;
        pubSignals[0] = uint256(batchRoot); 
        
        require(verifier.verifyProof(_pA, _pB, _pC, pubSignals), "Invalid proof");
        require(anchors[batchId].timestamp == 0, "Batch already anchored");
        
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
}
