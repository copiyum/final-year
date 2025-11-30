'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { batchesApi } from '@/lib/api';
import ProofHeader from '@/components/proof/ProofHeader';
import MerkleTreeViz from '@/components/proof/MerkleTreeViz';
import ProofDetails from '@/components/proof/ProofDetails';

export default function ProofViewerPage() {
    const params = useParams();
    const batchId = params?.batchId as string;

    const { data: batch, isLoading, error } = useQuery({
        queryKey: ['batch', batchId],
        queryFn: () => batchesApi.getBatch(batchId),
        enabled: !!batchId,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading Proof...
                </div>
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Proof Not Found</h1>
                    <p className="text-gray-400 mb-6">The requested proof batch could not be found.</p>
                    <Link
                        href="/"
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                    >
                        Return Home
                    </Link>
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
                        <Link
                            href="/dashboard/startup"
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-6 py-8">
                <ProofHeader batch={batch} />

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <MerkleTreeViz batch={batch} />
                    </div>
                    <div>
                        <ProofDetails batch={batch} />
                    </div>
                </div>
            </div>
        </div>
    );
}
