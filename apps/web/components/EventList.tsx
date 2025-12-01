'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsApi, Event } from '@/lib/api';
import Link from 'next/link';

export default function EventList() {
    const { data: events, isLoading, error } = useQuery<Event[]>({
        queryKey: ['events'],
        queryFn: eventsApi.list,
    });

    if (isLoading) {
        return (
            <div className="bg-zinc-900/50 backdrop-blur-lg border border-zinc-800 shadow-sm rounded-2xl p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                Error loading events: {error.message}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg border border-zinc-800 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-black/20 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-white tracking-tight">Events</h2>
            </div>
            <div className="divide-y divide-zinc-800">
                {events && events.length > 0 ? (
                    events.map((event) => (
                        <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="block hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                            {event.type}
                                        </p>
                                        <p className="text-sm text-zinc-500 font-mono">
                                            {event.id.substring(0, 16)}...
                                        </p>
                                    </div>
                                    <div className="ml-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${event.proof_status === 'verified'
                                                ? 'bg-white text-black border-white'
                                                : event.proof_status === 'pending'
                                                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                                }`}
                                        >
                                            {event.proof_status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="px-6 py-8 text-center text-zinc-500">
                        No events found
                    </div>
                )}
            </div>
        </div>
    );
}
