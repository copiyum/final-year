pragma circom 2.0.0;

// Num2Bits template - converts number to binary
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

// LessThan template - checks if in[0] < in[1]
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n+1);
    n2b.in <== in[0] + (1<<n) - in[1];

    out <== 1 - n2b.out[n];
}

// GreaterThan template - checks if in[0] > in[1]
template GreaterThan(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    out <== lt.out;
}

// Main Metrics Threshold Circuit
// Proves that actualValue > threshold without revealing actualValue
template MetricsThreshold() {
    // Private input: the actual metric value
    signal input actualValue;
    
    // Public inputs: threshold and metric type identifier
    signal input threshold;
    signal input metricType;
    
    // Public output: whether the condition is satisfied
    signal output isValid;
    
    // Constraint: actualValue > threshold
    component gt = GreaterThan(64);  // 64-bit comparison
    gt.in[0] <== actualValue;
    gt.in[1] <== threshold;
    
    // Output 1 if actualValue > threshold, else 0
    isValid <== gt.out;
    
    // Additional constraint: isValid must be 1 (proof only succeeds if condition is true)
    isValid === 1;
    
    // Dummy constraint to include metricType in the circuit
    // This ensures the proof is specific to a metric type
    signal metricTypeSquared;
    metricTypeSquared <== metricType * metricType;
}

component main {public [threshold, metricType]} = MetricsThreshold();
