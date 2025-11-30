'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';

export default function EventSubmissionForm() {
    const queryClient = useQueryClient();
    const [eventType, setEventType] = useState('');
    const [payload, setPayload] = useState('{}');
    const [signer, setSigner] = useState('');
    const [signature, setSignature] = useState('');

    const mutation = useMutation({
        mutationFn: eventsApi.submit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setEventType('');
            setPayload('{}');
            setSigner('');
            setSignature('');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const parsedPayload = JSON.parse(payload);
            mutation.mutate({
                type: eventType,
                payload: parsedPayload,
                signer,
                signature,
            });
        } catch (error) {
            alert('Invalid JSON payload');
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Submit Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Type
                    </label>
                    <input
                        type="text"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., transfer, credential_issue"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payload (JSON)
                    </label>
                    <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 h-32 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signer
                    </label>
                    <input
                        type="text"
                        value={signer}
                        onChange={(e) => setSigner(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Signer address or ID"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signature
                    </label>
                    <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Signature hash"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    {mutation.isPending ? 'Submitting...' : 'Submit Event'}
                </button>

                {mutation.isError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        Error submitting event: {mutation.error.message}
                    </div>
                )}

                {mutation.isSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        Event submitted successfully!
                    </div>
                )}
            </form>
        </div>
    );
}
