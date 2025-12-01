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
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Proof Details</h2>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm text-zinc-300"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 text-white" />
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
                    <span className="text-zinc-500 text-sm block mb-2 font-mono uppercase tracking-wider">Proof Data (Groth16)</span>
                    <div className="bg-black rounded-xl p-4 overflow-x-auto border border-zinc-800">
                        <pre className="text-zinc-300 font-mono text-xs">
                            {proofData}
                        </pre>
                    </div>
                </div>

                {/* Public Signals */}
                <div>
                    <span className="text-zinc-500 text-sm block mb-2 font-mono uppercase tracking-wider">Public Signals</span>
                    <div className="bg-black rounded-xl p-4 overflow-x-auto border border-zinc-800">
                        <pre className="text-white font-mono text-xs">
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
                    <span className="text-zinc-500 text-sm block mb-2 font-mono uppercase tracking-wider">Verification Key Hash</span>
                    <div className="bg-black/50 rounded-lg p-3 border border-zinc-800">
                        <code className="text-zinc-300 font-mono text-sm break-all">
                            {batch.vk_hash || 'Not available'}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
}
