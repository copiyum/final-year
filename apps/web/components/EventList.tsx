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
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Error loading events: {error.message}
            </div>
        );
    }

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Events</h2>
            </div>
            <div className="divide-y divide-gray-200">
                {events && events.length > 0 ? (
                    events.map((event) => (
                        <Link
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="block hover:bg-gray-50 transition-colors"
                        >
                            <div className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {event.type}
                                        </p>
                                        <p className="text-sm text-gray-500 font-mono">
                                            {event.id.substring(0, 16)}...
                                        </p>
                                    </div>
                                    <div className="ml-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.proof_status === 'verified'
                                                    ? 'bg-green-100 text-green-800'
                                                    : event.proof_status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
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
                    <div className="px-6 py-8 text-center text-gray-500">
                        No events found
                    </div>
                )}
            </div>
        </div>
    );
}
