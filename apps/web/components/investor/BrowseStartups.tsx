import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, DollarSign, Lock, Unlock, Loader2, Star, ExternalLink, Clock } from 'lucide-react';
import { investorsApi, Startup } from '@/lib/api';
import Link from 'next/link';

interface StartupWithAccess extends Startup {
    access_status?: 'granted' | 'pending' | 'none';
}

export default function BrowseStartups() {
    const queryClient = useQueryClient();

    // Fetch startups
    const { data: startups = [], isLoading } = useQuery<StartupWithAccess[]>({
        queryKey: ['investor', 'startups'],
        queryFn: investorsApi.getStartups,
    });

    // Request access mutation
    const requestAccessMutation = useMutation({
        mutationFn: investorsApi.requestAccess,
        onSuccess: () => {
            // Ideally we'd update the specific startup's state or refetch
            // For now, just invalidate
            queryClient.invalidateQueries({ queryKey: ['investor', 'access-requests'] });
            alert('Access requested successfully!');
        },
    });

    // Express interest mutation
    const expressInterestMutation = useMutation({
        mutationFn: investorsApi.expressInterest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investor', 'interests'] });
            alert('Interest expressed successfully!');
        },
    });

    if (isLoading) {
        return (
            <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading startups...</p>
            </div>
        );
    }

    if (startups.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                No startups found.
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup: Startup) => (
                <div key={startup.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{startup.name}</h3>
                                <span className="text-gray-400 text-xs">{startup.sector}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-6 flex-1 line-clamp-3">
                        {startup.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <Users className="w-3 h-3" />
                                Team
                            </div>
                            <span className="text-white font-semibold">{startup.team_size}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <DollarSign className="w-3 h-3" />
                                Ask
                            </div>
                            <span className="text-white font-semibold">
                                ${startup.funding_ask?.toLocaleString() || '0'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                        {startup.access_status === 'granted' ? (
                            <Link
                                href={`/dashboard/investor/startup/${startup.id}`}
                                className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Unlock className="w-4 h-4" />
                                View Details
                            </Link>
                        ) : startup.access_status === 'pending' ? (
                            <button
                                disabled
                                className="flex-1 py-2 bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <Clock className="w-4 h-4" />
                                Access Pending
                            </button>
                        ) : (
                            <button
                                onClick={() => requestAccessMutation.mutate(startup.id)}
                                disabled={requestAccessMutation.isPending}
                                className="flex-1 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Request Access
                            </button>
                        )}
                        <button
                            onClick={() => expressInterestMutation.mutate(startup.id)}
                            disabled={expressInterestMutation.isPending}
                            className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-purple-600/10 border border-purple-500/50 text-purple-400 rounded-lg transition"
                            title="Express Interest"
                        >
                            <Star className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
