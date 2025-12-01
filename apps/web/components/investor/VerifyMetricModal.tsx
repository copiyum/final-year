import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Shield, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { verificationApi } from '@/lib/api';

interface VerifyMetricModalProps {
    startupId: string;
    startupName: string;
    onClose: () => void;
}

export default function VerifyMetricModal({ startupId, startupName, onClose }: VerifyMetricModalProps) {
    const queryClient = useQueryClient();
    const [metricType, setMetricType] = useState('');
    const [threshold, setThreshold] = useState('');

    // Fetch available metrics for this startup
    const { data: availableMetrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['startup', 'available-metrics', startupId],
        queryFn: () => verificationApi.getAvailableMetrics(startupId),
        enabled: !!startupId,
    });

    // Set default metric when data loads
    useEffect(() => {
        if (availableMetrics?.metrics?.length && !metricType) {
            setMetricType(availableMetrics.metrics[0].name);
        }
    }, [availableMetrics, metricType]);

    const requestMutation = useMutation({
        mutationFn: () => verificationApi.requestVerification(startupId, metricType, parseFloat(threshold)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investor', 'verification-requests'] });
            onClose();
        },
    });

    const selectedMetric = availableMetrics?.metrics?.find(m => m.name === metricType);
    const hasMetrics = availableMetrics?.metrics && availableMetrics.metrics.length > 0;

    const formatThresholdDisplay = () => {
        if (!threshold) return '';
        const num = parseFloat(threshold);
        if (isNaN(num)) return threshold;
        const lowerType = metricType.toLowerCase();
        if (lowerType.includes('growth') || lowerType.includes('rate') || lowerType.includes('%')) return `${num}%`;
        return num.toLocaleString();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Request ZK Verification</h2>
                            <p className="text-zinc-400 text-sm">{startupName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {loadingMetrics ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                        <p className="text-zinc-400 text-sm mt-2">Loading available metrics...</p>
                    </div>
                ) : !hasMetrics ? (
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">This startup hasn't added any metrics yet.</p>
                        <p className="text-zinc-500 text-xs mt-1">Check back later once they've added verifiable data.</p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                                What do you want to verify?
                            </label>
                            <select
                                value={metricType}
                                onChange={(e) => setMetricType(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-white transition-colors"
                            >
                                {availableMetrics?.metrics?.map(metric => (
                                    <option key={metric.id} value={metric.name} className="bg-black">
                                        {metric.name} {metric.has_verified_proof && '✓'}
                                    </option>
                                ))}
                            </select>
                            {selectedMetric?.has_verified_proof && (
                                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    This metric has a verified ZK proof
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                                Minimum threshold to prove
                            </label>
                            <input
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                placeholder="Enter minimum value"
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                min="0"
                            />
                            <p className="text-zinc-500 text-xs mt-1">
                                The startup will prove their {metricType.toLowerCase()} exceeds this value
                            </p>
                        </div>

                        {threshold && (
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                                <p className="text-zinc-300 text-sm">
                                    <strong>You're asking:</strong> "Prove that {metricType.toLowerCase()} is greater than {formatThresholdDisplay()}"
                                </p>
                                <p className="text-zinc-500 text-xs mt-2">
                                    The startup's actual value will remain private. You'll only see if it passes or fails.
                                </p>
                            </div>
                        )}

                        {requestMutation.isError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-sm">
                                    {(requestMutation.error as any)?.response?.data?.message || 'Failed to send request'}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => requestMutation.mutate()}
                                disabled={!threshold || !metricType || requestMutation.isPending}
                                className="flex-1 py-3 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black rounded-lg font-semibold transition-colors"
                            >
                                {requestMutation.isPending ? 'Sending...' : 'Send Verification Request'}
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
