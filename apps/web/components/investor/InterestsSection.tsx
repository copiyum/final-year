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
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading interests...</p>
            </div>
        );
    }

    if (interests.length === 0) {
        return (
            <div className="text-gray-400 text-center py-8">
                No interests expressed yet.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {interests.map((interest: any) => (
                <div key={interest.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <div>
                            <h4 className="text-white font-medium">{interest.startup_name || 'Unknown Startup'}</h4>
                            <p className="text-gray-400 text-xs">
                                Expressed on {new Date(interest.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white">
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
