'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { startupsApi, Startup } from '@/lib/api';
import { useState } from 'react';
import ProfileSection from '@/components/startup/ProfileSection';
import DocumentsSection from '@/components/startup/DocumentsSection';
import MetricsSection from '@/components/startup/MetricsSection';
import InvestorRequestsSection from '@/components/startup/InvestorRequestsSection';
import VerificationRequestsSection from '@/components/startup/VerificationRequestsSection';

export default function StartupDashboard() {
    const { user, loading: authLoading, logout } = useAuth('founder');
    const queryClient = useQueryClient();

    // Form state for creating startup
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        sector: '',
        team_size: '',
        funding_ask: '',
    });

    // Fetch startup profile using React Query
    const { data: startup, isLoading: startupLoading, error } = useQuery({
        queryKey: ['startup', 'me'],
        queryFn: startupsApi.getMyStartup,
        enabled: !!user, // Only fetch when user is authenticated
    });

    // Create startup mutation
    const createStartupMutation = useMutation({
        mutationFn: (data: Partial<Startup>) => {
            return startupsApi.create({
                ...data,
                founder_id: user?.id,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', 'me'] });
        },
    });

    const handleCreateStartup = (e: React.FormEvent) => {
        e.preventDefault();
        createStartupMutation.mutate({
            name: createForm.name,
            description: createForm.description,
            sector: createForm.sector,
            team_size: parseInt(createForm.team_size) || 0,
            funding_ask: parseFloat(createForm.funding_ask) || 0,
        });
    };

    const loading = authLoading || startupLoading;

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        console.error('Failed to load startup data:', error);
    }

    return (
        <div className="min-h-screen bg-black bg-dot-white/[0.2] relative">
            {/* Radial gradient for the container to give a faded look */}
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] fixed"></div>

            <div className="relative z-10">
                {/* Header */}
                <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-lg sticky top-0 z-50">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-6 h-6 text-white" />
                                <span className="text-xl font-bold text-white tracking-tight">ZKP Ledger</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-zinc-400 text-sm">{user?.email}</span>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors border border-zinc-800 text-sm font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="container mx-auto px-6 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Startup Dashboard</h1>
                        <p className="text-zinc-400">Manage your profile and prove your metrics with ZK</p>
                    </div>

                    {!startup ? (
                        /* Create Startup Profile */
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-8 border border-zinc-800 shadow-xl">
                                <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Create Your Startup Profile</h2>
                                <form onSubmit={handleCreateStartup} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Startup Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                            placeholder="Acme Inc"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            rows={4}
                                            required
                                            value={createForm.description}
                                            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                            placeholder="What does your startup do?"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Sector
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={createForm.sector}
                                                onChange={(e) => setCreateForm({ ...createForm, sector: e.target.value })}
                                                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                                placeholder="SaaS"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                                Team Size
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                value={createForm.team_size}
                                                onChange={(e) => setCreateForm({ ...createForm, team_size: e.target.value })}
                                                className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                                placeholder="5"
                                                min="1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            Funding Ask ($)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={createForm.funding_ask}
                                            onChange={(e) => setCreateForm({ ...createForm, funding_ask: e.target.value })}
                                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                            placeholder="500000"
                                            min="0"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={createStartupMutation.isPending}
                                        className="w-full py-3 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        {createStartupMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Profile'
                                        )}
                                    </button>
                                    {createStartupMutation.isError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                            Failed to create profile. Please try again.
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* Dashboard Content */
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                <VerificationRequestsSection startupId={startup.id} />
                                <MetricsSection startupId={startup.id} />
                                <DocumentsSection startupId={startup.id} />
                                <InvestorRequestsSection startupId={startup.id} />
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                <ProfileSection startup={startup} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
