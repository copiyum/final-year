import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react';
import { verificationApi, MetricVerificationRequest } from '@/lib/api';

export default function VerificationRequestsSection() {
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['investor', 'verification-requests'],
        queryFn: verificationApi.getMyRequests,
    });

    const getStatusBadge = (request: MetricVerificationRequest) => {
        switch (request.status) {
            case 'verified':
                return (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${request.proof_result
                            ? 'bg-white text-black border border-white'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                        {request.proof_result ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-bold">Verified ✓</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Below Threshold</span>
                            </>
                        )}
                    </div>
                );
            case 'approved':
                return (
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-full animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Generating Proof</span>
                    </div>
                );
            case 'rejected':
                return (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Rejected</span>
                    </div>
                );
            case 'failed':
                return (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400 text-sm font-medium">Proof Failed</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full">
                        <Clock className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400 text-sm font-medium">Awaiting Approval</span>
                    </div>
                );
        }
    };

    const formatThreshold = (request: MetricVerificationRequest) => {
        const num = parseFloat(request.threshold.toString());
        if (request.metric_type === 'growth') return `${num}%`;
        if (['revenue', 'mrr', 'arr'].includes(request.metric_type)) {
            return `$${num.toLocaleString()}`;
        }
        return num.toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                <h2 className="text-xl font-bold text-white mb-6 tracking-tight">My Verification Requests</h2>
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">My Verification Requests</h2>
            </div>

            {requests.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No verification requests yet. Browse startups and request metric verification!
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-white font-semibold text-sm">{request.startup_name}</h3>
                                    <p className="text-zinc-400 text-xs capitalize">
                                        {request.metric_type.replace(/_/g, ' ')} &gt; {formatThreshold(request)}
                                    </p>
                                </div>
                                {getStatusBadge(request)}
                            </div>

                            {request.status === 'verified' && request.proof_result && (
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg mb-3">
                                    <p className="text-white text-xs">
                                        ✓ Cryptographically verified: {request.metric_type} exceeds {formatThreshold(request)}
                                    </p>
                                </div>
                            )}

                            {request.status === 'verified' && !request.proof_result && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-3">
                                    <p className="text-amber-400 text-xs">
                                        ⚠ ZK Proof verified: {request.metric_type} does not exceed {formatThreshold(request)}
                                    </p>
                                </div>
                            )}

                            {request.status === 'rejected' && request.rejection_reason && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
                                    <p className="text-red-400 text-xs">Reason: {request.rejection_reason}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                                {request.responded_at && (
                                    <span>Responded: {new Date(request.responded_at).toLocaleDateString()}</span>
                                )}
                                {request.proof_batch_id && request.status === 'verified' && (
                                    <a
                                        href={`/proof/${request.proof_batch_id}`}
                                        className="flex items-center gap-1 text-white hover:text-zinc-300 transition underline underline-offset-2"
                                    >
                                        View Proof
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
