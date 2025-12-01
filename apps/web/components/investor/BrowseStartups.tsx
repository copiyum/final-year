import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, DollarSign, Lock, Unlock, Loader2, Star, ExternalLink, Clock, Search } from 'lucide-react';
import { investorsApi, Startup } from '@/lib/api';
import Link from 'next/link';
import VerifyMetricModal from './VerifyMetricModal';

interface StartupWithAccess extends Startup {
    access_status?: 'granted' | 'pending' | 'none';
}

export default function BrowseStartups() {
    const queryClient = useQueryClient();
    const [verifyModalStartup, setVerifyModalStartup] = useState<{ id: string; name: string } | null>(null);

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
                <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                <p className="text-zinc-500">Loading startups...</p>
            </div>
        );
    }

    if (startups.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500">
                No startups found.
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup: Startup) => (
                <div key={startup.id} className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm flex flex-col hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg tracking-tight">{startup.name}</h3>
                                <span className="text-zinc-400 text-xs">{startup.sector}</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-zinc-300 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">
                        {startup.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/50 rounded-lg p-3 border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1 uppercase tracking-wider">
                                <Users className="w-3 h-3" />
                                Team
                            </div>
                            <span className="text-white font-semibold">{startup.team_size}</span>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-zinc-800">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1 uppercase tracking-wider">
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
                                className="flex-1 py-2 bg-white hover:bg-zinc-200 border border-white text-black rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Unlock className="w-4 h-4" />
                                View Details
                            </Link>
                        ) : startup.access_status === 'pending' ? (
                            <button
                                disabled
                                className="flex-1 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <Clock className="w-4 h-4" />
                                Access Pending
                            </button>
                        ) : (
                            <button
                                onClick={() => requestAccessMutation.mutate(startup.id)}
                                disabled={requestAccessMutation.isPending}
                                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-900/50 disabled:cursor-not-allowed text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Lock className="w-4 h-4" />
                                Request Access
                            </button>
                        )}
                        <button
                            onClick={() => setVerifyModalStartup({ id: startup.id, name: startup.name })}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white rounded-lg transition-colors"
                            title="Request ZK Verification"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => expressInterestMutation.mutate(startup.id)}
                            disabled={expressInterestMutation.isPending}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 text-white rounded-lg transition-colors"
                            title="Express Interest"
                        >
                            <Star className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Verify Metric Modal */}
            {verifyModalStartup && (
                <VerifyMetricModal
                    startupId={verifyModalStartup.id}
                    startupName={verifyModalStartup.name}
                    onClose={() => setVerifyModalStartup(null)}
                />
            )}
        </div>
    );
}
