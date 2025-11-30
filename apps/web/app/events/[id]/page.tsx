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
            <main className="min-h-screen bg-gray-100">
                <div className="container mx-auto px-4 py-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </main>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-gray-100">
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        Event not found
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                <Link
                    href="/"
                    className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
                >
                    ← Back to Events
                </Link>

                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold mb-4">Event Details</h1>

                    <div className="space-y-3">
                        <div>
                            <span className="font-semibold">ID:</span>
                            <span className="ml-2 font-mono text-sm">{event.id}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Type:</span>
                            <span className="ml-2">{event.type}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Signer:</span>
                            <span className="ml-2 font-mono text-sm">{event.signer}</span>
                        </div>
                        <div>
                            <span className="font-semibold">Proof Status:</span>
                            <span
                                className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.proof_status === 'verified'
                                    ? 'bg-green-100 text-green-800'
                                    : event.proof_status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                            >
                                {event.proof_status}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold">Payload:</span>
                            <pre className="mt-2 bg-gray-50 p-4 rounded overflow-x-auto text-sm">
                                {JSON.stringify(event.payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">Inclusion Proof</h2>

                    {proofLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    ) : proof ? (
                        <div className="space-y-3">
                            <div>
                                <span className="font-semibold">Status:</span>
                                <span
                                    className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${proof.status === 'included'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                >
                                    {proof.status}
                                </span>
                            </div>

                            {proof.status === 'included' && proof.batch_root && (
                                <>
                                    <div>
                                        <span className="font-semibold">Batch ID:</span>
                                        <span className="ml-2 font-mono text-sm">
                                            {proof.batch_id}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Batch Root:</span>
                                        <span className="ml-2 font-mono text-sm break-all">
                                            {proof.batch_root}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">Event Index:</span>
                                        <span className="ml-2">{proof.event_index}</span>
                                    </div>
                                    {proof.merkle_path && (
                                        <div>
                                            <span className="font-semibold">Merkle Path:</span>
                                            <div className="mt-2 space-y-2">
                                                {proof.merkle_path.siblings.map((sibling, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-gray-50 p-3 rounded flex items-center space-x-2"
                                                    >
                                                        <span className="text-sm font-medium text-gray-600">
                                                            Level {index}:
                                                        </span>
                                                        <span className="font-mono text-xs break-all flex-1">
                                                            {sibling}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
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
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                                    {proof.reason || 'Event is pending batching'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500">No proof data available</div>
                    )}
                </div>
            </div>
        </main>
    );
}
