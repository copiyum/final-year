pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mux1.circom";

template MerkleInclusion(levels) {
    signal input leaf;
    signal input path_elements[levels];
    signal input path_index[levels];
    signal output root;

    component poseidons[levels];
    component mux[levels];

    signal current_hash[levels + 1];
    current_hash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // Mux1 selects input based on path_index (0 or 1)
        // If path_index[i] == 0: left = current_hash, right = path_elements
        // If path_index[i] == 1: left = path_elements, right = current_hash

        mux[i] = MultiMux1(2);
        mux[i].c[0][0] <== current_hash[i];
        mux[i].c[0][1] <== path_elements[i];
        mux[i].c[1][0] <== path_elements[i];
        mux[i].c[1][1] <== current_hash[i];
        mux[i].s <== path_index[i];

        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== mux[i].out[0];
        poseidons[i].inputs[1] <== mux[i].out[1];

        current_hash[i + 1] <== poseidons[i].out;
    }

    root <== current_hash[levels];
}

component main = MerkleInclusion(20);
