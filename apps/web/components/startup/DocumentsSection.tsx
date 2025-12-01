import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, FileText, Clock, CheckCircle, Download } from 'lucide-react';
import { startupsApi, StartupDocument } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

interface DocumentsSectionProps {
    startupId: string;
}

export default function DocumentsSection({ startupId }: DocumentsSectionProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch documents
    const { data: documents = [], isLoading: documentsLoading } = useQuery({
        queryKey: ['documents', startupId],
        queryFn: () => startupsApi.getDocuments(startupId),
        enabled: !!startupId,
    });

    // Upload document mutation
    const uploadDocumentMutation = useMutation({
        mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
            if (!startupId || !user?.id) throw new Error('Missing startup or user ID');

            setUploadProgress(0);

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev === null || prev >= 90) return prev;
                    return prev + 10;
                });
            }, 200);

            try {
                const result = await startupsApi.uploadDocument(startupId, user.id, file, documentType);
                clearInterval(progressInterval);
                setUploadProgress(100);

                // Reset progress after a short delay
                setTimeout(() => setUploadProgress(null), 1000);

                return result;
            } catch (error) {
                clearInterval(progressInterval);
                setUploadProgress(null);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents', startupId] });
        },
    });

    // File upload handlers
    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];

        // Determine document type based on file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        let documentType = 'other';

        if (extension === 'pdf') documentType = 'pitch_deck';
        else if (['doc', 'docx'].includes(extension || '')) documentType = 'business_plan';
        else if (['xls', 'xlsx', 'csv'].includes(extension || '')) documentType = 'financials';

        uploadDocumentMutation.mutate({ file, documentType });
    }, [uploadDocumentMutation]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    }, [handleFileSelect]);

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getDocumentTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            pitch_deck: 'Pitch Deck',
            business_plan: 'Business Plan',
            financials: 'Financials',
            other: 'Document',
        };
        return labels[type] || 'Document';
    };

    return (
        <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Documents</h2>
                <button
                    onClick={handleUploadClick}
                    disabled={uploadDocumentMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-600 text-black rounded-lg transition-colors text-sm font-medium"
                >
                    {uploadDocumentMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Upload
                        </>
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                />
            </div>

            {/* Upload Progress */}
            {uploadProgress !== null && (
                <div className="mb-4 p-4 bg-black/50 rounded-xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-xs">Uploading...</span>
                        <span className="text-white text-xs font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Drag and Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadClick}
                className={`
                    mb-6 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all
                    ${isDragging
                        ? 'border-white bg-zinc-900'
                        : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50'
                    }
                `}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-white' : 'text-zinc-600'}`} />
                    <p className="text-white font-medium mb-1 text-sm">
                        {isDragging ? 'Drop file here' : 'Drag and drop file here'}
                    </p>
                    <p className="text-zinc-500 text-xs">
                        or click to browse
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-2 uppercase tracking-wider">
                        Supported: PDF, DOC, DOCX, XLS, XLSX, CSV
                    </p>
                </div>
            </div>

            {/* Documents List */}
            {documentsLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Loading documents...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="text-zinc-500 text-center py-8 text-sm">
                    No documents uploaded yet
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="p-4 bg-black/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-white mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-white font-medium truncate text-sm">
                                                {getDocumentTypeLabel(doc.document_type)}
                                            </h4>
                                            {!doc.upload_event_id ? (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full">
                                                    <Clock className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-zinc-400 text-[10px] font-medium">Pending ZK Batch</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-white text-black border border-white rounded-full">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">Batched</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-zinc-500 text-xs">
                                            {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await startupsApi.getDocumentDownloadUrl(startupId, doc.id);
                                            // Open presigned URL in new tab to trigger download
                                            window.open(response.url, '_blank');
                                        } catch (error) {
                                            console.error('Failed to download document:', error);
                                            alert('Failed to download document. Please try again.');
                                        }
                                    }}
                                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4 text-zinc-400 hover:text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {uploadDocumentMutation.isError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-xs">
                        Failed to upload document. Please try again.
                    </p>
                </div>
            )}
        </div>
    );
}
