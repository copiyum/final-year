'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Shield, Users, DollarSign, FileText, TrendingUp, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { startupsApi } from '@/lib/api';

export default function InvestorStartupDetailPage() {
    const params = useParams();
    const startupId = params.id as string;

    const { data: startup, isLoading: startupLoading } = useQuery({
        queryKey: ['startup', startupId],
        queryFn: () => startupsApi.getById(startupId),
    });

    const { data: metrics = [], isLoading: metricsLoading } = useQuery({
        queryKey: ['startup', startupId, 'metrics'],
        queryFn: () => startupsApi.getMetrics(startupId),
    });

    const { data: documents = [], isLoading: docsLoading } = useQuery({
        queryKey: ['startup', startupId, 'documents'],
        queryFn: () => startupsApi.getDocuments(startupId),
    });

    const { data: verificationStatus } = useQuery({
        queryKey: ['startup', startupId, 'verification'],
        queryFn: () => startupsApi.getVerificationStatus(startupId),
    });

    if (startupLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-gray-400">Loading startup details...</p>
                </div>
            </div>
        );
    }

    if (!startup) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
                <div className="text-center py-12 text-gray-400">
                    Startup not found or access denied.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                <Link
                    href="/dashboard/investor"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                {/* Header */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Shield className="w-10 h-10 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">{startup.name}</h1>
                            <p className="text-purple-400 mb-4">{startup.sector}</p>
                            <p className="text-gray-300">{startup.description}</p>
                        </div>
                        {verificationStatus?.verified && (
                            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg">
                                <CheckCircle className="w-5 h-5" />
                                ZK Verified
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <Users className="w-4 h-4" />
                                Team Size
                            </div>
                            <span className="text-2xl font-bold text-white">{startup.team_size || 'N/A'}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <DollarSign className="w-4 h-4" />
                                Funding Ask
                            </div>
                            <span className="text-2xl font-bold text-white">
                                ${startup.funding_ask?.toLocaleString() || '0'}
                            </span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <FileText className="w-4 h-4" />
                                Documents
                            </div>
                            <span className="text-2xl font-bold text-white">{documents.length}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <TrendingUp className="w-4 h-4" />
                                Metrics
                            </div>
                            <span className="text-2xl font-bold text-white">{metrics.length}</span>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Metrics Section */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                            Verified Metrics
                        </h2>
                        {metricsLoading ? (
                            <p className="text-gray-400">Loading metrics...</p>
                        ) : metrics.length === 0 ? (
                            <p className="text-gray-400">No metrics available yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {metrics.map((metric: any) => (
                                    <div key={metric.id} className="bg-white/5 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-white font-medium">{metric.metric_name}</p>
                                            {metric.proof_status === 'verified' ? (
                                                <div className="flex items-center gap-1 text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-sm">ZK Verified</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-yellow-400">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm">Pending</span>
                                                </div>
                                            )}
                                        </div>
                                        {metric.proof_status === 'verified' && metric.threshold_value && (
                                            <p className="text-purple-400 text-sm mb-2">
                                                ✓ Proved: {metric.metric_name} &gt; {Number(metric.threshold_value).toLocaleString()}
                                            </p>
                                        )}
                                        <p className="text-gray-500 text-xs">
                                            Added: {new Date(metric.created_at).toLocaleDateString()}
                                        </p>
                                        {metric.proof_status === 'verified' && metric.proof_batch_id && (
                                            <Link
                                                href={`/proof/${metric.proof_batch_id}`}
                                                className="inline-flex items-center gap-1 mt-2 text-purple-400 hover:text-purple-300 text-sm"
                                            >
                                                View ZK Proof →
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Documents Section */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-400" />
                            Documents
                        </h2>
                        {docsLoading ? (
                            <p className="text-gray-400">Loading documents...</p>
                        ) : documents.length === 0 ? (
                            <p className="text-gray-400">No documents uploaded yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc: any) => (
                                    <div key={doc.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{doc.document_type}</p>
                                            <p className="text-gray-400 text-sm">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <FileText className="w-5 h-5 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
