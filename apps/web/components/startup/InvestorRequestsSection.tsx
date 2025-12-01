import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, User, Shield } from 'lucide-react';
import { startupsApi } from '@/lib/api';

interface InvestorRequestsSectionProps {
    startupId: string;
}

export default function InvestorRequestsSection({ startupId }: InvestorRequestsSectionProps) {
    const queryClient = useQueryClient();

    // Fetch access requests
    const { data: requests = [], isLoading: requestsLoading } = useQuery({
        queryKey: ['access-requests', startupId],
        queryFn: () => startupsApi.getAccessRequests(startupId),
        enabled: !!startupId,
    });

    // Grant access mutation
    const grantAccessMutation = useMutation({
        mutationFn: async (investorId: string) => {
            return startupsApi.grantAccess(startupId, investorId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access-requests', startupId] });
        },
    });

    // Revoke/Deny access mutation
    const revokeAccessMutation = useMutation({
        mutationFn: async (investorId: string) => {
            return startupsApi.revokeAccess(startupId, investorId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access-requests', startupId] });
        },
    });

    const handleGrant = (investorId: string) => {
        grantAccessMutation.mutate(investorId);
    };

    const handleRevoke = (investorId: string) => {
        revokeAccessMutation.mutate(investorId);
    };

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Investor Access</h2>

            {requestsLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No access requests pending or active.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req: any) => (
                        <div key={req.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-sm">{req.investor_name || 'Unknown Investor'}</h4>
                                    <p className="text-zinc-500 text-xs">{req.investor_email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${req.status === 'granted'
                                            ? 'bg-white text-black border-white'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                            }`}>
                                            {req.status === 'granted' ? 'Access Granted' : 'Request Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {req.status !== 'granted' && (
                                    <button
                                        onClick={() => handleGrant(req.investor_id)}
                                        disabled={grantAccessMutation.isPending}
                                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                        title="Approve Access"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRevoke(req.investor_id)}
                                    disabled={revokeAccessMutation.isPending}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-400"
                                    title={req.status === 'granted' ? "Revoke Access" : "Deny Request"}
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
