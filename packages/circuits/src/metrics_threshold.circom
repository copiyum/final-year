pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

/**
 * MetricsThreshold Circuit
 * 
 * Proves that actualValue > threshold without revealing actualValue.
 * 
 * Public Inputs:
 *   - isValid: 1 if actualValue > threshold, 0 otherwise
 *   - threshold: The threshold value being compared against
 *   - metricType: Type identifier for the metric (1=revenue, 2=users, etc.)
 * 
 * Private Inputs:
 *   - actualValue: The actual metric value (kept private)
 */
template MetricsThreshold() {
    // Private input - the actual value we want to keep secret
    signal input actualValue;
    
    // Public inputs
    signal input threshold;
    signal input metricType;
    
    // Public outputs
    signal output isValid;
    signal output thresholdOut;
    signal output metricTypeOut;
    
    // Use GreaterThan comparator from circomlib
    // GreaterThan(n) compares two n-bit numbers
    // Returns 1 if in[0] > in[1], 0 otherwise
    component gt = GreaterThan(64); // Support up to 64-bit numbers
    gt.in[0] <== actualValue;
    gt.in[1] <== threshold;
    
    // Output whether the comparison passed
    isValid <== gt.out;
    
    // Pass through public inputs as outputs for verification
    thresholdOut <== threshold;
    metricTypeOut <== metricType;
    
    // Constraint: metricType must be in valid range (1-10)
    // This prevents arbitrary values being passed
    signal metricTypeValid;
    component gtMetric = GreaterThan(8);
    gtMetric.in[0] <== metricType;
    gtMetric.in[1] <== 0;
    
    component ltMetric = LessThan(8);
    ltMetric.in[0] <== metricType;
    ltMetric.in[1] <== 11;
    
    metricTypeValid <== gtMetric.out * ltMetric.out;
    metricTypeValid === 1;
}

component main {public [threshold, metricType]} = MetricsThreshold();
