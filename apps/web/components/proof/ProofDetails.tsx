import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface ProofDetailsProps {
    batch: any;
}

export default function ProofDetails({ batch }: ProofDetailsProps) {
    const [copied, setCopied] = useState(false);

    const proofData = batch.proof ? JSON.stringify(batch.proof, null, 2) : 'No proof generated yet';

    const handleCopy = () => {
        navigator.clipboard.writeText(proofData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Proof Details</h2>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition text-sm text-gray-300"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-green-400" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            Copy JSON
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {/* Proof JSON */}
                <div>
                    <span className="text-gray-400 text-sm block mb-2 font-mono">Proof Data (Groth16)</span>
                    <div className="bg-black/50 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-green-400 font-mono text-xs">
                            {proofData}
                        </pre>
                    </div>
                </div>

                {/* Public Signals */}
                <div>
                    <span className="text-gray-400 text-sm block mb-2 font-mono">Public Signals</span>
                    <div className="bg-black/50 rounded-xl p-4 overflow-x-auto">
                        <pre className="text-blue-400 font-mono text-xs">
                            {batch.proof?.public_inputs
                                ? JSON.stringify(batch.proof.public_inputs, null, 2)
                                : batch.public_signals
                                    ? JSON.stringify(batch.public_signals, null, 2)
                                    : '["' + (batch.batch_root || batch.root_hash || 'pending') + '"]'}
                        </pre>
                    </div>
                </div>

                {/* Verification Key Hash */}
                <div>
                    <span className="text-gray-400 text-sm block mb-2 font-mono">Verification Key Hash</span>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <code className="text-gray-300 font-mono text-sm break-all">
                            {batch.vk_hash || 'Not available'}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
}
