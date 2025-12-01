import { GitCommit } from 'lucide-react';

interface MerkleTreeVizProps {
    batch: any;
}

export default function MerkleTreeViz({ batch }: MerkleTreeVizProps) {
    const events = batch.events || [];

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm mb-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Merkle Tree Visualization</h2>

            <div className="min-w-[600px] flex flex-col items-center py-8">
                {/* Root Node */}
                <div className="relative flex flex-col items-center z-10">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <GitCommit className="w-8 h-8 text-black" />
                    </div>
                    <div className="mt-2 text-center">
                        <span className="text-white font-bold text-sm">Batch Root</span>
                        <div className="text-zinc-500 text-xs font-mono mt-1">
                            {(batch.batch_root || batch.root_hash) ? `${(batch.batch_root || batch.root_hash).substring(0, 6)}...${(batch.batch_root || batch.root_hash).substring((batch.batch_root || batch.root_hash).length - 4)}` : 'Pending'}
                        </div>
                    </div>
                </div>

                {/* Connecting Lines */}
                <div className="h-16 w-0.5 bg-gradient-to-b from-white to-zinc-800 my-2"></div>

                {/* Leaves Container */}
                <div className="relative w-full flex justify-center gap-8 px-8">
                    {/* Horizontal Connector */}
                    {events.length > 1 && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 bg-zinc-800 w-[80%]"></div>
                    )}

                    {/* Leaf Nodes */}
                    {events.map((event: any, index: number) => (
                        <div key={index} className="flex flex-col items-center relative pt-8">
                            {/* Vertical Connector to Leaf */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-0.5 bg-zinc-800"></div>

                            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-zinc-800 hover:border-white hover:bg-zinc-900 transition-colors cursor-pointer group">
                                <span className="text-zinc-500 font-mono text-xs group-hover:text-white">{index}</span>
                            </div>
                            <div className="mt-2 text-center max-w-[100px]">
                                <span className="text-zinc-300 text-xs font-medium block truncate">
                                    {event.type || `Event ${index}`}
                                </span>
                                <div className="text-zinc-600 text-[10px] font-mono mt-1 truncate w-full">
                                    {event.id ? `${event.id.substring(0, 6)}...` : '...'}
                                </div>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="text-zinc-500 text-sm italic">No events in this batch yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
