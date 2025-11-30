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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Documents</h2>
                <button
                    onClick={handleUploadClick}
                    disabled={uploadDocumentMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition"
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
                <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white text-sm">Uploading...</span>
                        <span className="text-purple-400 text-sm font-medium">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
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
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
                    }
                `}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <Upload className={`w-12 h-12 mb-3 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
                    <p className="text-white font-medium mb-1">
                        {isDragging ? 'Drop file here' : 'Drag and drop file here'}
                    </p>
                    <p className="text-gray-400 text-sm">
                        or click to browse
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                        Supported: PDF, DOC, DOCX, XLS, XLSX, CSV
                    </p>
                </div>
            </div>

            {/* Documents List */}
            {documentsLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Loading documents...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                    No documents uploaded yet
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.id}
                            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-purple-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-white font-medium truncate">
                                                {getDocumentTypeLabel(doc.document_type)}
                                            </h4>
                                            {!doc.upload_event_id ? (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full">
                                                    <Clock className="w-3 h-3 text-yellow-400" />
                                                    <span className="text-yellow-400 text-xs font-medium">Pending ZK Batch</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded-full">
                                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                                    <span className="text-green-400 text-xs font-medium">Batched</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        // In production, this would download from MinIO via presigned URL
                                        console.log('Download document:', doc.file_key);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4 text-gray-400 hover:text-white" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {uploadDocumentMutation.isError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">
                        Failed to upload document. Please try again.
                    </p>
                </div>
            )}
        </div>
    );
}
