import { useQuery } from '@tanstack/react-query';
import { Loader2, Lock, Unlock, Clock } from 'lucide-react';
import { investorsApi } from '@/lib/api';

export default function AccessRequestsSection() {
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['investor', 'access-requests'],
        queryFn: investorsApi.getAccessRequests,
    });

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading requests...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-gray-400 text-center py-8">
                No access requests made.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requests.map((req: any) => (
                <div key={req.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {req.status === 'granted' ? (
                            <Unlock className="w-5 h-5 text-green-400" />
                        ) : (
                            <Lock className="w-5 h-5 text-yellow-400" />
                        )}
                        <div>
                            <h4 className="text-white font-medium">{req.startup_name || 'Unknown Startup'}</h4>
                            <p className="text-gray-400 text-xs">
                                Requested on {new Date(req.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full border ${req.status === 'granted'
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                        }`}>
                        {req.status === 'granted' ? 'Access Granted' : 'Pending'}
                    </div>
                </div>
            ))}
        </div>
    );
}
