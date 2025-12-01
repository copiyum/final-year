'use client';

import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import BrowseStartups from '@/components/investor/BrowseStartups';
import InterestsSection from '@/components/investor/InterestsSection';
import CommitmentsSection from '@/components/investor/CommitmentsSection';
import AccessRequestsSection from '@/components/investor/AccessRequestsSection';
import VerificationRequestsSection from '@/components/investor/VerificationRequestsSection';

export default function InvestorDashboard() {
    const { user, loading, logout } = useAuth('investor');

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
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Investor Dashboard</h1>
                        <p className="text-zinc-400">Discover ZK-verified startups and manage your portfolio</p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Main Content - Browse */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                                <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Browse Startups</h2>
                                <BrowseStartups />
                            </div>

                            {/* Verification Requests */}
                            <VerificationRequestsSection />
                        </div>

                        {/* Sidebar - My Activity */}
                        <div className="space-y-6">
                            {/* Interests */}
                            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                                <h3 className="text-lg font-bold text-white mb-4 tracking-tight">My Interests</h3>
                                <InterestsSection />
                            </div>

                            {/* Commitments */}
                            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                                <h3 className="text-lg font-bold text-white mb-4 tracking-tight">My Commitments</h3>
                                <CommitmentsSection />
                            </div>

                            {/* Access Requests */}
                            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                                <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Access Requests</h3>
                                <AccessRequestsSection />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
