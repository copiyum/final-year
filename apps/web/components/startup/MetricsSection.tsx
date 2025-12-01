import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, X, Loader2, CheckCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { startupsApi, StartupMetric, proofsApi } from '@/lib/api';

interface MetricsSectionProps {
    startupId: string;
}

export default function MetricsSection({ startupId }: MetricsSectionProps) {
    const queryClient = useQueryClient();
    const [showMetricForm, setShowMetricForm] = useState(false);
    const [metricForm, setMetricForm] = useState({
        metric_name: '',
        metric_value: '',
        threshold: '',
    });

    // Fetch metrics
    const { data: metrics = [], isLoading: metricsLoading } = useQuery({
        queryKey: ['metrics', startupId],
        queryFn: () => startupsApi.getMetrics(startupId),
        enabled: !!startupId,
    });

    // Add metric mutation
    const addMetricMutation = useMutation({
        mutationFn: async (data: { metric_name: string; metric_value: number; threshold?: number }) => {
            if (!startupId) throw new Error('No startup ID');
            return startupsApi.addMetric(startupId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics', startupId] });
            setShowMetricForm(false);
            setMetricForm({ metric_name: '', metric_value: '', threshold: '' });
        },
    });

    const handleAddMetric = () => {
        const value = parseFloat(metricForm.metric_value);
        const threshold = metricForm.threshold ? parseFloat(metricForm.threshold) : undefined;

        if (!metricForm.metric_name || isNaN(value)) {
            return;
        }

        addMetricMutation.mutate({
            metric_name: metricForm.metric_name,
            metric_value: value,
            threshold,
        });
    };

    const handleCancelMetricForm = () => {
        setShowMetricForm(false);
        setMetricForm({ metric_name: '', metric_value: '', threshold: '' });
    };

    // Retry proof mutation
    const retryProofMutation = useMutation({
        mutationFn: async (metricId: string) => {
            return proofsApi.retryMetricProof(startupId, metricId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics', startupId] });
        },
    });

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight">ZK-Verified Metrics</h2>
                <button
                    onClick={() => setShowMetricForm(!showMetricForm)}
                    disabled={addMetricMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg transition-colors text-sm font-medium"
                >
                    {showMetricForm ? (
                        <>
                            <X className="w-4 h-4" />
                            Cancel
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            Add Metric
                        </>
                    )}
                </button>
            </div>

            {/* Metric Input Form */}
            {showMetricForm && (
                <div className="mb-6 p-4 bg-black/50 rounded-xl border border-zinc-800">
                    <h3 className="text-white font-semibold mb-4 text-sm">Add New Metric</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2">
                                Metric Name
                            </label>
                            <input
                                type="text"
                                value={metricForm.metric_name}
                                onChange={(e) => setMetricForm({ ...metricForm, metric_name: e.target.value })}
                                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors text-sm"
                                placeholder="e.g., Monthly Active Users, Revenue"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Actual Value (Private)
                                </label>
                                <input
                                    type="number"
                                    value={metricForm.metric_value}
                                    onChange={(e) => setMetricForm({ ...metricForm, metric_value: e.target.value })}
                                    className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors text-sm"
                                    placeholder="127000"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-2">
                                    Threshold to Prove (Optional)
                                </label>
                                <input
                                    type="number"
                                    value={metricForm.threshold}
                                    onChange={(e) => setMetricForm({ ...metricForm, threshold: e.target.value })}
                                    className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors text-sm"
                                    placeholder="100000"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAddMetric}
                                disabled={addMetricMutation.isPending || !metricForm.metric_name || !metricForm.metric_value}
                                className="flex-1 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg font-semibold transition-colors text-sm"
                            >
                                {addMetricMutation.isPending ? 'Adding...' : 'Add Metric'}
                            </button>
                            <button
                                onClick={handleCancelMetricForm}
                                disabled={addMetricMutation.isPending}
                                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 text-white rounded-lg transition-colors text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                        {addMetricMutation.isError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-xs">
                                    Failed to add metric. Please try again.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Metrics List */}
            {metricsLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading metrics...</p>
                </div>
            ) : metrics.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No metrics added yet. Add your first metric to start proving your traction!
                </div>
            ) : (
                <div className="space-y-4">
                    {metrics.map((metric) => (
                        <div key={metric.id} className="p-4 bg-black/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                    <span className="text-white font-semibold">{metric.metric_name}</span>
                                </div>
                                {metric.proof_status === 'verified' ? (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white text-black border border-white rounded-full">
                                        <CheckCircle className="w-3 h-3" />
                                        <span className="text-xs font-bold">ZK Verified</span>
                                    </div>
                                ) : metric.proof_status === 'failed' ? (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                                        <X className="w-3 h-3 text-red-400" />
                                        <span className="text-red-400 text-xs font-medium">Failed</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full">
                                        <Clock className="w-3 h-3 text-zinc-400" />
                                        <span className="text-zinc-400 text-xs font-medium">Pending</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-zinc-400 text-sm mb-3">
                                {metric.proof_status === 'verified'
                                    ? `Proved: ${metric.metric_name} exceeds threshold (actual value hidden)`
                                    : `Metric submitted, awaiting ZK proof generation`
                                }
                            </p>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="text-zinc-500">
                                    Added: {new Date(metric.created_at).toLocaleDateString()}
                                </span>
                                {metric.proof_status === 'verified' && metric.proof_batch_id && (
                                    <a
                                        href={`/proof/${metric.proof_batch_id}`}
                                        className="flex items-center gap-1 text-white hover:text-zinc-300 transition-colors"
                                    >
                                        View Proof
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {metric.proof_status === 'failed' && (
                                    <button
                                        onClick={() => retryProofMutation.mutate(metric.id)}
                                        disabled={retryProofMutation.isPending}
                                        className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 transition disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${retryProofMutation.isPending ? 'animate-spin' : ''}`} />
                                        Retry Proof
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
