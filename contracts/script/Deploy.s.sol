// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Groth16Verifier.sol";
import "../src/BatchVerifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Groth16Verifier first
        Groth16Verifier verifier = new Groth16Verifier();
        console.log("Groth16Verifier deployed at:", address(verifier));
        
        // Deploy BatchVerifier with verifier address
        BatchVerifier batchVerifier = new BatchVerifier(address(verifier));
        console.log("BatchVerifier deployed at:", address(batchVerifier));
        
        vm.stopBroadcast();
        
        // Output for easy copy-paste
        console.log("\n=== Deployment Summary ===");
        console.log("GROTH16_VERIFIER_ADDRESS=%s", address(verifier));
        console.log("BATCH_VERIFIER_ADDRESS=%s", address(batchVerifier));
    }
}
