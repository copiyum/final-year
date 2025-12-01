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
            <div className="min-h-screen bg-black bg-dot-white/[0.2] relative flex items-center justify-center">
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                <div className="text-white text-xl flex items-center gap-2 z-10">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Loading Proof...
                </div>
            </div>
        );
    }

    if (error || !batch) {
        return (
            <div className="min-h-screen bg-black bg-dot-white/[0.2] relative flex items-center justify-center">
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                <div className="text-center z-10">
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Proof Not Found</h1>
                    <p className="text-zinc-400 mb-6">The requested proof batch could not be found.</p>
                    <Link
                        href="/"
                        className="px-6 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors font-medium"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black bg-dot-white/[0.2] relative">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            {/* Header */}
            <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-lg sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-white" />
                            <span className="text-xl font-bold text-white tracking-tight">ZKP Ledger</span>
                        </div>
                        <Link
                            href="/dashboard/startup"
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-6 py-8 relative z-10">
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
