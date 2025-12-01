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
                <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Loading requests...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-zinc-500 text-center py-8 text-sm">
                No access requests made.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {requests.map((req: any) => (
                <div key={req.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                        {req.status === 'granted' ? (
                            <Unlock className="w-5 h-5 text-white" />
                        ) : (
                            <Lock className="w-5 h-5 text-zinc-500" />
                        )}
                        <div>
                            <h4 className="text-white font-medium text-sm">{req.startup_name || 'Unknown Startup'}</h4>
                            <p className="text-zinc-500 text-xs">
                                Requested on {new Date(req.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className={`text-[10px] px-2 py-1 rounded-full border font-medium ${req.status === 'granted'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                        {req.status === 'granted' ? 'Access Granted' : 'Pending'}
                    </div>
                </div>
            ))}
        </div>
    );
}
