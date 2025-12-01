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
        <div className="bg-zinc-900/50 backdrop-blur-lg border border-zinc-800 shadow-sm rounded-2xl p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-white tracking-tight">Submit Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                        Event Type
                    </label>
                    <input
                        type="text"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-600"
                        placeholder="e.g., transfer, credential_issue"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                        Payload (JSON)
                    </label>
                    <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 h-32 font-mono text-sm text-zinc-300 focus:outline-none focus:border-white transition-colors"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                        Signer
                    </label>
                    <input
                        type="text"
                        value={signer}
                        onChange={(e) => setSigner(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-600"
                        placeholder="Signer address or ID"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                        Signature
                    </label>
                    <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-600"
                        placeholder="Signature hash"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    {mutation.isPending ? 'Submitting...' : 'Submit Event'}
                </button>

                {mutation.isError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                        Error submitting event: {mutation.error.message}
                    </div>
                )}

                {mutation.isSuccess && (
                    <div className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-lg">
                        Event submitted successfully!
                    </div>
                )}
            </form>
        </div>
    );
}
