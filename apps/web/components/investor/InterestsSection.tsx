import { useQuery } from '@tanstack/react-query';
import { Loader2, Star, ExternalLink } from 'lucide-react';
import { investorsApi } from '@/lib/api';

export default function InterestsSection() {
    const { data: interests = [], isLoading } = useQuery({
        queryKey: ['investor', 'interests'],
        queryFn: investorsApi.getInterests,
    });

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Loading interests...</p>
            </div>
        );
    }

    if (interests.length === 0) {
        return (
            <div className="text-zinc-500 text-center py-8 text-sm">
                No interests expressed yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {interests.map((interest: any) => (
                <div key={interest.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-white" />
                        <div>
                            <h4 className="text-white font-medium text-sm">{interest.startup_name || 'Unknown Startup'}</h4>
                            <p className="text-zinc-500 text-xs">
                                Expressed on {new Date(interest.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
