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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-zinc-400">Loading startup details...</p>
                </div>
            </div>
        );
    }

    if (!startup) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center text-zinc-400">
                    Startup not found or access denied.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black bg-dot-white/[0.2] relative">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] fixed"></div>

            <div className="relative z-10 p-8">
                <div className="max-w-6xl mx-auto">
                    <Link
                        href="/dashboard/investor"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>

                    {/* Header */}
                    <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-8 border border-zinc-800 shadow-xl mb-8">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                <Shield className="w-10 h-10 text-white" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{startup.name}</h1>
                                <p className="text-zinc-400 mb-4 font-medium">{startup.sector}</p>
                                <p className="text-zinc-300 leading-relaxed">{startup.description}</p>
                            </div>
                            {verificationStatus?.verified && (
                                <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg border border-white shadow-lg">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold">ZK Verified</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                            <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-1">
                                    <Users className="w-4 h-4" />
                                    Team Size
                                </div>
                                <span className="text-2xl font-bold text-white">{startup.team_size || 'N/A'}</span>
                            </div>
                            <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-1">
                                    <DollarSign className="w-4 h-4" />
                                    Funding Ask
                                </div>
                                <span className="text-2xl font-bold text-white">
                                    ${startup.funding_ask?.toLocaleString() || '0'}
                                </span>
                            </div>
                            <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-1">
                                    <FileText className="w-4 h-4" />
                                    Documents
                                </div>
                                <span className="text-2xl font-bold text-white">{documents.length}</span>
                            </div>
                            <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                                <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    Metrics
                                </div>
                                <span className="text-2xl font-bold text-white">{metrics.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Metrics Section */}
                        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 tracking-tight">
                                <TrendingUp className="w-5 h-5 text-white" />
                                Verified Metrics
                            </h2>
                            {metricsLoading ? (
                                <p className="text-zinc-400">Loading metrics...</p>
                            ) : metrics.length === 0 ? (
                                <p className="text-zinc-400">No metrics available yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {metrics.map((metric: any) => (
                                        <div key={metric.id} className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-white font-medium">{metric.metric_name}</p>
                                                {metric.proof_status === 'verified' ? (
                                                    <div className="flex items-center gap-1 text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span className="text-xs font-bold">ZK Verified</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-xs">Pending</span>
                                                    </div>
                                                )}
                                            </div>
                                            {metric.proof_status === 'verified' && metric.threshold_value && (
                                                <p className="text-zinc-300 text-sm mb-2">
                                                    ✓ Proved: {metric.metric_name} &gt; {Number(metric.threshold_value).toLocaleString()}
                                                </p>
                                            )}
                                            <p className="text-zinc-500 text-xs">
                                                Added: {new Date(metric.created_at).toLocaleDateString()}
                                            </p>
                                            {metric.proof_status === 'verified' && metric.proof_batch_id && (
                                                <Link
                                                    href={`/proof/${metric.proof_batch_id}`}
                                                    className="inline-flex items-center gap-1 mt-2 text-white hover:text-zinc-300 text-sm underline underline-offset-4"
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
                        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 tracking-tight">
                                <FileText className="w-5 h-5 text-white" />
                                Documents
                            </h2>
                            {docsLoading ? (
                                <p className="text-zinc-400">Loading documents...</p>
                            ) : documents.length === 0 ? (
                                <p className="text-zinc-400">No documents uploaded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc: any) => (
                                        <div key={doc.id} className="bg-black/50 rounded-lg p-4 flex items-center justify-between border border-zinc-800 hover:border-zinc-700 transition-colors">
                                            <div>
                                                <p className="text-white font-medium">{doc.document_type}</p>
                                                <p className="text-zinc-500 text-xs">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <FileText className="w-5 h-5 text-zinc-400" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
