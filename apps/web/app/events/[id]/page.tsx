'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsApi, Event, InclusionProof } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.id as string;

    const { data: event, isLoading: eventLoading } = useQuery<Event>({
        queryKey: ['events', eventId],
        queryFn: () => eventsApi.getById(eventId),
    });

    const { data: proof, isLoading: proofLoading } = useQuery<InclusionProof>({
        queryKey: ['proof', eventId],
        queryFn: () => eventsApi.getProof(eventId),
    });

    if (eventLoading) {
        return (
            <main className="min-h-screen bg-black bg-dot-white/[0.2] relative">
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                <div className="container mx-auto px-4 py-8 relative z-10">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
                        <div className="h-64 bg-zinc-800 rounded"></div>
                    </div>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-black bg-dot-white/[0.2] relative">
                <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                <div className="container mx-auto px-4 py-8 relative z-10">
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                        Event not found
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black bg-dot-white/[0.2] relative">
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            <div className="container mx-auto px-4 py-8 relative z-10">
                <Link
                    href="/"
                    className="text-white hover:text-zinc-300 mb-4 inline-block transition-colors"
                >
                    ← Back to Events
                </Link>

                <div className="bg-zinc-900/50 backdrop-blur-lg border border-zinc-800 shadow-xl rounded-2xl p-6 mb-6">
                    <h1 className="text-3xl font-bold mb-4 text-white tracking-tight">Event Details</h1>

                    <div className="space-y-3">
                        <div>
                            <span className="font-semibold text-zinc-400">ID:</span>
                            <span className="ml-2 font-mono text-sm text-white">{event.id}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-400">Type:</span>
                            <span className="ml-2 text-white">{event.type}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-400">Signer:</span>
                            <span className="ml-2 font-mono text-sm text-white">{event.signer}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-400">Proof Status:</span>
                            <span
                                className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${event.proof_status === 'verified'
                                    ? 'bg-white text-black border-white'
                                    : event.proof_status === 'pending'
                                        ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                    }`}
                            >
                                {event.proof_status}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold text-zinc-400">Payload:</span>
                            <pre className="mt-2 bg-black border border-zinc-800 p-4 rounded-lg overflow-x-auto text-sm text-zinc-300">
                                {JSON.stringify(event.payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-lg border border-zinc-800 shadow-xl rounded-2xl p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white tracking-tight">Inclusion Proof</h2>

                    {proofLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                        </div>
                    ) : proof ? (
                        <div className="space-y-3">
                            <div>
                                <span className="font-semibold text-zinc-400">Status:</span>
                                <span
                                    className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${proof.status === 'included'
                                        ? 'bg-white text-black border-white'
                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}
                                >
                                    {proof.status}
                                </span>
                            </div>

                            {proof.status === 'included' && proof.batch_root && (
                                <>
                                    <div>
                                        <span className="font-semibold text-zinc-400">Batch ID:</span>
                                        <span className="ml-2 font-mono text-sm text-white">
                                            {proof.batch_id}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-zinc-400">Batch Root:</span>
                                        <span className="ml-2 font-mono text-sm break-all text-white">
                                            {proof.batch_root}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-zinc-400">Event Index:</span>
                                        <span className="ml-2 text-white">{proof.event_index}</span>
                                    </div>
                                    {proof.merkle_path && (
                                        <div>
                                            <span className="font-semibold text-zinc-400">Merkle Path:</span>
                                            <div className="mt-2 space-y-2">
                                                {proof.merkle_path.siblings.map((sibling, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-black border border-zinc-800 p-3 rounded-lg flex items-center space-x-2"
                                                    >
                                                        <span className="text-sm font-medium text-zinc-500">
                                                            Level {index}:
                                                        </span>
                                                        <span className="font-mono text-xs break-all flex-1 text-zinc-300">
                                                            {sibling}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                                                            {proof.merkle_path?.indices[index] ? 'R' : 'L'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {proof.status === 'pending' && (
                                <div className="bg-zinc-800/50 border border-zinc-700 text-zinc-400 px-4 py-3 rounded-lg">
                                    {proof.reason || 'Event is pending batching'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-zinc-500">No proof data available</div>
                    )}
                </div>
            </div>
        </main>
    );
}
