import { Shield, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface ProofHeaderProps {
    batch: any;
}

export default function ProofHeader({ batch }: ProofHeaderProps) {
    const isVerified = batch.status === 'verified' || batch.proof?.status === 'verified' || batch.verified === true;
    const isFailed = batch.status === 'failed' || batch.proof?.status === 'failed';

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">ZK Proof Batch</h1>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                            <span>ID: {batch.id?.substring(0, 8)}...{batch.id?.substring(batch.id.length - 6)}</span>
                            <button
                                className="hover:text-white transition-colors"
                                onClick={() => navigator.clipboard.writeText(batch.id)}
                            >
                                <FileText className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium ${isVerified
                        ? 'bg-white text-black border-white'
                        : isFailed
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                        {isVerified ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold">Verified</span>
                            </>
                        ) : isFailed ? (
                            <>
                                <XCircle className="w-5 h-5" />
                                <span className="font-bold">Verification Failed</span>
                            </>
                        ) : (
                            <>
                                <Clock className="w-5 h-5" />
                                <span className="font-bold">Pending Verification</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800">
                <div>
                    <span className="text-zinc-500 text-xs block mb-1 uppercase tracking-wider">Created At</span>
                    <span className="text-white font-medium">
                        {batch.created_at ? new Date(batch.created_at).toLocaleString() : 'Unknown'}
                    </span>
                </div>
                <div>
                    <span className="text-zinc-500 text-xs block mb-1 uppercase tracking-wider">Total Events</span>
                    <span className="text-white font-medium">{batch.event_count || batch.events?.length || 0}</span>
                </div>
                <div className="col-span-2">
                    <span className="text-zinc-500 text-xs block mb-1 uppercase tracking-wider">Root Hash</span>
                    <span className="text-white font-mono text-xs break-all">
                        {batch.batch_root || batch.root_hash || batch.root || 'Pending...'}
                    </span>
                </div>
            </div>

            {/* Blockchain Anchor Info */}
            {batch.anchor_tx && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                    <h3 className="text-white font-semibold mb-3 tracking-tight">On-Chain Verification</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-zinc-500 text-xs block mb-1 uppercase tracking-wider">Transaction Hash</span>
                            <a
                                href={`https://amoy.polygonscan.com/tx/${batch.anchor_tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-zinc-300 font-mono text-xs break-all underline underline-offset-2 transition-colors"
                            >
                                {batch.anchor_tx.txHash}
                            </a>
                        </div>
                        <div>
                            <span className="text-zinc-500 text-xs block mb-1 uppercase tracking-wider">Block Number</span>
                            <span className="text-white font-medium">{batch.anchor_tx.blockNumber}</span>
                        </div>
                    </div>
                    <a
                        href={`https://amoy.polygonscan.com/tx/${batch.anchor_tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white rounded-lg transition-colors text-sm"
                    >
                        View on Polygonscan →
                    </a>
                </div>
            )}
        </div>
    );
}
