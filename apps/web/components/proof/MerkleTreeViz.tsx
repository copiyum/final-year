import { GitCommit } from 'lucide-react';

interface MerkleTreeVizProps {
    batch: any;
}

export default function MerkleTreeViz({ batch }: MerkleTreeVizProps) {
    const events = batch.events || [];

    return (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-6">Merkle Tree Visualization</h2>

            <div className="min-w-[600px] flex flex-col items-center py-8">
                {/* Root Node */}
                <div className="relative flex flex-col items-center z-10">
                    <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center border-4 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                        <GitCommit className="w-8 h-8 text-white" />
                    </div>
                    <div className="mt-2 text-center">
                        <span className="text-purple-400 font-bold text-sm">Batch Root</span>
                        <div className="text-gray-500 text-xs font-mono mt-1">
                            {(batch.batch_root || batch.root_hash) ? `${(batch.batch_root || batch.root_hash).substring(0, 6)}...${(batch.batch_root || batch.root_hash).substring((batch.batch_root || batch.root_hash).length - 4)}` : 'Pending'}
                        </div>
                    </div>
                </div>

                {/* Connecting Lines */}
                <div className="h-16 w-0.5 bg-gradient-to-b from-purple-600 to-gray-600 my-2"></div>

                {/* Leaves Container */}
                <div className="relative w-full flex justify-center gap-8 px-8">
                    {/* Horizontal Connector */}
                    {events.length > 1 && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-gray-600 w-[80%]"></div>
                    )}

                    {/* Leaf Nodes */}
                    {events.map((event: any, index: number) => (
                        <div key={index} className="flex flex-col items-center relative pt-8">
                            {/* Vertical Connector to Leaf */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-gray-600"></div>

                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-600 hover:border-purple-400 hover:bg-purple-900/50 transition cursor-pointer group">
                                <span className="text-gray-400 font-mono text-xs group-hover:text-white">{index}</span>
                            </div>
                            <div className="mt-2 text-center max-w-[100px]">
                                <span className="text-gray-300 text-xs font-medium block truncate">
                                    {event.type || `Event ${index}`}
                                </span>
                                <div className="text-gray-600 text-[10px] font-mono mt-1 truncate w-full">
                                    {event.id ? `${event.id.substring(0, 6)}...` : '...'}
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="text-gray-500 text-sm italic">No events in this batch yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
