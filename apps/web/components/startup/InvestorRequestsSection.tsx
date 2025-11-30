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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Investor Access</h2>

            {requestsLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                    No access requests pending or active.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req: any) => (
                        <div key={req.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <User className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{req.investor_name || 'Unknown Investor'}</h4>
                                    <p className="text-gray-400 text-sm">{req.investor_email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${req.status === 'granted'
                                                ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                                : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
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
                                        className="p-2 hover:bg-green-500/20 rounded-lg transition text-green-400"
                                        title="Approve Access"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRevoke(req.investor_id)}
                                    disabled={revokeAccessMutation.isPending}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
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
