import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Clock, Loader2, Check, X } from 'lucide-react';
import { verificationApi, MetricVerificationRequest } from '@/lib/api';
import { useState } from 'react';

interface VerificationRequestsSectionProps {
    startupId: string;
}

export default function VerificationRequestsSection({ startupId }: VerificationRequestsSectionProps) {
    const queryClient = useQueryClient();
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['startup', 'verification-requests', startupId],
        queryFn: () => verificationApi.getStartupRequests(startupId),
        enabled: !!startupId,
    });

    const approveMutation = useMutation({
        mutationFn: (requestId: string) => verificationApi.approveRequest(startupId, requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', 'verification-requests', startupId] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
            verificationApi.rejectRequest(startupId, requestId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', 'verification-requests', startupId] });
            setRejectingId(null);
            setRejectReason('');
        },
    });

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const otherRequests = requests.filter(r => r.status !== 'pending');

    const formatThreshold = (request: MetricVerificationRequest) => {
        const num = parseFloat(request.threshold.toString());
        if (request.metric_type === 'growth') return `${num}%`;
        if (['revenue', 'mrr', 'arr'].includes(request.metric_type)) {
            return `$${num.toLocaleString()}`;
        }
        return num.toLocaleString();
    };

    const getStatusBadge = (status: string, proofResult?: boolean) => {
        switch (status) {
            case 'verified':
                return proofResult ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs rounded-full font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified ✓
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs rounded-full font-medium flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Below Threshold
                    </span>
                );
            case 'approved':
                return <span className="px-2 py-1 bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs rounded-full font-medium animate-pulse">Proving...</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-full font-medium">Rejected</span>;
            case 'failed':
                return <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-full font-medium">Proof Failed</span>;
            default:
                return <span className="px-2 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs rounded-full font-medium">Pending</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Investor Verification Requests</h2>
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white tracking-tight">Investor Verification Requests</h2>
                {pendingRequests.length > 0 && (
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs rounded-full">
                        {pendingRequests.length} pending
                    </span>
                )}
            </div>

            {requests.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No verification requests yet. Investors can request ZK proofs of your metrics.
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Pending requests first */}
                    {pendingRequests.map((request) => (
                        <div key={request.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-white font-medium text-sm">
                                        Investor wants to verify: <span className="text-white font-bold capitalize">{request.metric_type}</span>
                                    </p>
                                    <p className="text-zinc-400 text-xs">
                                        Threshold: {formatThreshold(request)}
                                    </p>
                                    <p className="text-zinc-500 text-[10px] mt-1">
                                        From: {request.investor_email || 'Anonymous'} • {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Clock className="w-4 h-4 text-zinc-500" />
                            </div>

                            <div className="p-3 bg-black/50 rounded-lg mb-3 border border-zinc-800">
                                <p className="text-zinc-300 text-xs italic">
                                    "Prove that your <strong>{request.metric_type}</strong> exceeds <strong>{formatThreshold(request)}</strong>"
                                </p>
                            </div>

                            {rejectingId === request.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Reason for rejection (optional)"
                                        className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => rejectMutation.mutate({ requestId: request.id, reason: rejectReason })}
                                            disabled={rejectMutation.isPending}
                                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
                                        </button>
                                        <button
                                            onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveMutation.mutate(request.id)}
                                        disabled={approveMutation.isPending}
                                        className="flex-1 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                        {approveMutation.isPending ? 'Approving...' : 'Approve & Generate Proof'}
                                    </button>
                                    <button
                                        onClick={() => setRejectingId(request.id)}
                                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            )}

                            {approveMutation.isError && (
                                <p className="text-red-400 text-xs mt-2">
                                    {(approveMutation.error as any)?.response?.data?.message || 'Failed to approve'}
                                </p>
                            )}
                        </div>
                    ))}

                    {/* Past requests */}
                    {otherRequests.length > 0 && pendingRequests.length > 0 && (
                        <div className="border-t border-zinc-800 pt-4 mt-4">
                            <h3 className="text-zinc-500 text-xs mb-3 uppercase tracking-wider">Previous Requests</h3>
                        </div>
                    )}
                    {otherRequests.map((request) => (
                        <div key={request.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white text-sm">
                                        <span className="capitalize font-medium">{request.metric_type}</span> &gt; {formatThreshold(request)}
                                    </p>
                                    <p className="text-zinc-500 text-xs">
                                        {request.investor_email || 'Anonymous'} • {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {getStatusBadge(request.status, request.proof_result)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
