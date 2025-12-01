import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X } from 'lucide-react';
import { startupsApi, Startup } from '@/lib/api';

interface ProfileSectionProps {
    startup: Startup;
}

export default function ProfileSection({ startup }: ProfileSectionProps) {
    const queryClient = useQueryClient();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Startup>>({});

    // Update startup mutation
    const updateStartupMutation = useMutation({
        mutationFn: (data: Partial<Startup>) => {
            if (!startup?.id) throw new Error('No startup ID');
            return startupsApi.update(startup.id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['startup', 'me'] });
            setIsEditingProfile(false);
            setEditForm({});
        },
    });

    // Initialize edit form when entering edit mode
    const handleEditClick = () => {
        if (startup) {
            setEditForm({
                name: startup.name,
                description: startup.description,
                sector: startup.sector,
                team_size: startup.team_size,
                funding_ask: startup.funding_ask,
            });
        }
        setIsEditingProfile(true);
    };

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        setEditForm({});
    };

    const handleSaveProfile = () => {
        updateStartupMutation.mutate(editForm);
    };

    return (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white tracking-tight">Profile</h3>
                    {!isEditingProfile ? (
                        <button
                            onClick={handleEditClick}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit Profile"
                        >
                            <Edit2 className="w-4 h-4 text-zinc-400 hover:text-white" />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveProfile}
                                disabled={updateStartupMutation.isPending}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                title="Save Changes"
                            >
                                <Save className="w-4 h-4 text-white" />
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={updateStartupMutation.isPending}
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                title="Cancel"
                            >
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </div>
                    )}
                </div>

                {!isEditingProfile ? (
                    /* Display Mode */
                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="text-zinc-500 block mb-1 text-xs uppercase tracking-wider">Startup Name</span>
                            <p className="text-white font-medium">{startup.name}</p>
                        </div>
                        <div>
                            <span className="text-zinc-500 block mb-1 text-xs uppercase tracking-wider">Description</span>
                            <p className="text-zinc-300 leading-relaxed">
                                {startup.description || 'No description provided'}
                            </p>
                        </div>
                        <div>
                            <span className="text-zinc-500 block mb-1 text-xs uppercase tracking-wider">Sector</span>
                            <p className="text-white font-medium">{startup.sector || 'Not set'}</p>
                        </div>
                        <div>
                            <span className="text-zinc-500 block mb-1 text-xs uppercase tracking-wider">Team Size</span>
                            <p className="text-white font-medium">
                                {startup.team_size || 0} {startup.team_size === 1 ? 'person' : 'people'}
                            </p>
                        </div>
                        <div>
                            <span className="text-zinc-500 block mb-1 text-xs uppercase tracking-wider">Funding Ask</span>
                            <p className="text-white font-medium">
                                {startup.funding_ask
                                    ? `$${startup.funding_ask.toLocaleString()}`
                                    : 'Not set'}
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Edit Mode */
                    <div className="space-y-4">
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-2">Startup Name</label>
                            <input
                                type="text"
                                value={editForm.name || ''}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                placeholder="Acme Inc"
                            />
                        </div>
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-2">Description</label>
                            <textarea
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                placeholder="What does your startup do?"
                            />
                        </div>
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-2">Sector</label>
                            <input
                                type="text"
                                value={editForm.sector || ''}
                                onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                placeholder="SaaS, FinTech, etc."
                            />
                        </div>
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-2">Team Size</label>
                            <input
                                type="number"
                                value={editForm.team_size || ''}
                                onChange={(e) => setEditForm({ ...editForm, team_size: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                placeholder="5"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-2">Funding Ask ($)</label>
                            <input
                                type="number"
                                value={editForm.funding_ask || ''}
                                onChange={(e) => setEditForm({ ...editForm, funding_ask: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                                placeholder="500000"
                                min="0"
                                step="1000"
                            />
                        </div>
                        {updateStartupMutation.isError && (
                            <div className="text-red-400 text-xs">
                                Failed to update profile. Please try again.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Card */}
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
                <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Stats</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-400 text-sm">ZK Proofs</span>
                            <span className="text-white font-bold">1</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width: '33%' }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-zinc-400 text-sm">Investor Views</span>
                            <span className="text-white font-bold">24</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
