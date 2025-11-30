import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle, Clock, ExternalLink, DollarSign } from 'lucide-react';
import { investorsApi } from '@/lib/api';

export default function CommitmentsSection() {
    const { data: commitments = [], isLoading } = useQuery({
        queryKey: ['investor', 'commitments'],
        queryFn: investorsApi.getCommitments,
    });

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading commitments...</p>
            </div>
        );
    }

    if (commitments.length === 0) {
        return (
            <div className="text-gray-400 text-center py-8">
                No commitments made yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {commitments.map((commitment: any) => (
                <div key={commitment.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            <div>
                                <h4 className="text-white font-medium">{commitment.startup_name || 'Unknown Startup'}</h4>
                                <p className="text-gray-400 text-xs">
                                    Committed on {new Date(commitment.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <span className="text-white font-bold">${commitment.amount?.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            {commitment.proof_batch_id ? (
                                <div className="flex items-center gap-1 text-green-400 text-xs">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Batched & Proved</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending Batch</span>
                                </div>
                            )}
                        </div>
                        {commitment.proof_batch_id && (
                            <a
                                href={`/proof/${commitment.proof_batch_id}`}
                                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition text-xs"
                            >
                                View Proof
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
