'use client';

import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import BrowseStartups from '@/components/investor/BrowseStartups';
import InterestsSection from '@/components/investor/InterestsSection';
import CommitmentsSection from '@/components/investor/CommitmentsSection';
import AccessRequestsSection from '@/components/investor/AccessRequestsSection';

export default function InvestorDashboard() {
    const { user, loading, logout } = useAuth('investor');

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <nav className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-purple-400" />
                            <span className="text-xl font-bold text-white">ZKP Ledger</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-300">{user?.email}</span>
                            <button
                                onClick={logout}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Investor Dashboard</h1>
                    <p className="text-gray-400">Discover ZK-verified startups and manage your portfolio</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Content - Browse */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-2xl font-bold text-white mb-6">Browse Startups</h2>
                            <BrowseStartups />
                        </div>
                    </div>

                    {/* Sidebar - My Activity */}
                    <div className="space-y-6">
                        {/* Interests */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h3 className="text-lg font-bold text-white mb-4">My Interests</h3>
                            <InterestsSection />
                        </div>

                        {/* Commitments */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h3 className="text-lg font-bold text-white mb-4">My Commitments</h3>
                            <CommitmentsSection />
                        </div>

                        {/* Access Requests */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                            <h3 className="text-lg font-bold text-white mb-4">Access Requests</h3>
                            <AccessRequestsSection />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
