import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

// Create axios instance with interceptor for JWT
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Startup service API - now routes through API Gateway
export const startupApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

startupApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export interface Event {
    id: string;
    type: string;
    payload: any;
    signer: string;
    signature: string;
    proof_status: string;
    created_at: string;
}

export interface InclusionProof {
    status: 'included' | 'pending';
    batch_id?: string;
    batch_root?: string;
    merkle_path?: {
        siblings: string[];
        indices: boolean[];
    };
    event_index?: number;
    reason?: string;
}

export interface User {
    id: string;
    email: string;
    role: 'founder' | 'investor';
    created_at: string;
}

export interface Startup {
    id: string;
    founder_id: string;
    name: string;
    description: string;
    sector: string;
    team_size: number;
    funding_ask: number;
    created_at: string;
    updated_at: string;
    access_status?: 'granted' | 'pending' | 'none';
}

export interface StartupMetric {
    id: string;
    startup_id: string;
    metric_name: string;
    metric_value_encrypted: string;
    proof_batch_id?: string;
    proof_status: 'pending' | 'verified' | 'failed';
    created_at: string;
}

export interface StartupDocument {
    id: string;
    startup_id: string;
    document_type: string;
    file_key: string;
    file_size: number;
    upload_event_id?: string;
    created_at: string;
}

export const eventsApi = {
    submit: async (event: Partial<Event>) => {
        const response = await api.post('/events', event);
        return response.data;
    },

    list: async () => {
        const response = await api.get('/events');
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/events/${id}`);
        return response.data;
    },

    getProof: async (id: string): Promise<InclusionProof> => {
        const response = await api.get(`/events/${id}/proof`);
        return response.data;
    },
};

export const startupsApi = {
    // Get current user's startup profile
    getMyStartup: async (): Promise<Startup | null> => {
        // Get user from localStorage to pass userId and role
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return null;

        const user = JSON.parse(userData) as User;
        const response = await startupApi.get('/startups', {
            params: {
                userId: user.id,
                userRole: user.role
            }
        });

        // Return first startup or null
        const startups = response.data;
        return startups.length > 0 ? startups[0] : null;
    },

    // Get startup by ID
    getById: async (id: string): Promise<Startup> => {
        const response = await startupApi.get(`/startups/${id}`);
        return response.data;
    },

    // Create startup profile
    create: async (data: Partial<Startup>): Promise<Startup> => {
        const response = await startupApi.post('/startups', data);
        return response.data;
    },

    // Update startup profile
    update: async (id: string, data: Partial<Startup>): Promise<Startup> => {
        const response = await startupApi.put(`/startups/${id}`, data);
        return response.data;
    },

    // Get startup metrics
    getMetrics: async (startupId: string): Promise<StartupMetric[]> => {
        const response = await startupApi.get(`/startups/${startupId}/metrics`);
        return response.data;
    },

    // Get startup documents
    getDocuments: async (startupId: string): Promise<StartupDocument[]> => {
        const response = await startupApi.get(`/startups/${startupId}/documents`);
        return response.data;
    },

    // Upload document
    uploadDocument: async (startupId: string, founderId: string, file: File, documentType: string): Promise<StartupDocument> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        formData.append('founderId', founderId);

        const response = await startupApi.post(`/startups/${startupId}/documents`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Add metric
    addMetric: async (startupId: string, data: { metric_name: string; metric_value: number; threshold?: number }): Promise<StartupMetric> => {
        // Get user from localStorage to pass founderId
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');

        const user = JSON.parse(userData) as User;
        const response = await startupApi.post(`/startups/${startupId}/metrics`, {
            ...data,
            founderId: user.id,
        });
        return response.data;
    },

    // Get verification status
    getVerificationStatus: async (startupId: string): Promise<{ verified: boolean; pending: number }> => {
        const response = await startupApi.get(`/startups/${startupId}/metrics/verify`);
        return response.data;
    },

    // Get access requests
    getAccessRequests: async (startupId: string): Promise<any[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        const response = await startupApi.get(`/startups/${startupId}/access/requests`, {
            params: { founderId: user.id }
        });
        return response.data;
    },

    // Grant access
    grantAccess: async (startupId: string, investorId: string): Promise<void> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        await startupApi.post(`/startups/${startupId}/access/grant`, { founderId: user.id, investorId });
    },

    // Revoke access
    revokeAccess: async (startupId: string, investorId: string): Promise<void> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        await startupApi.post(`/startups/${startupId}/access/revoke`, { founderId: user.id, investorId });
    },

    // Get document download URL (presigned)
    getDocumentDownloadUrl: async (startupId: string, documentId: string): Promise<{ url: string }> => {
        const response = await startupApi.get(`/startups/${startupId}/documents/${documentId}/download`);
        return response.data;
    },
};

// Investor service API - now routes through API Gateway
export const investorApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

investorApi.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export const investorsApi = {
    // Express interest
    expressInterest: async (startupId: string): Promise<void> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        await investorApi.post('/investor/interests', { investorId: user.id, startupId });
    },

    // Get my interests
    getInterests: async (): Promise<any[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        const response = await investorApi.get('/investor/interests', { params: { investorId: user.id } });
        return response.data;
    },

    // Make commitment
    makeCommitment: async (startupId: string, amount: number, terms: any): Promise<void> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        await investorApi.post('/investor/commitments', { investorId: user.id, startupId, amount, terms });
    },

    // Get my commitments
    getCommitments: async (): Promise<any[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        const response = await investorApi.get('/investor/commitments', { params: { investorId: user.id } });
        return response.data;
    },

    // Request access
    requestAccess: async (startupId: string): Promise<void> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        await investorApi.post('/investor/access/request', { investorId: user.id, startupId });
    },

    // Browse startups
    getStartups: async (): Promise<Startup[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        const response = await investorApi.get('/investor/startups', { params: { investorId: user.id } });
        return response.data;
    },

    // Get my access requests
    getAccessRequests: async (): Promise<any[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        try {
            const response = await investorApi.get('/investor/access/requests', { params: { investorId: user.id } });
            return response.data;
        } catch (e) {
            return [];
        }
    }
};

export const batchesApi = {
    getBatch: async (batchId: string): Promise<any> => {
        const response = await api.get(`/verify/batch/${batchId}`);
        return response.data;
    },

    // Get batch proof details
    getBatchProof: async (batchId: string): Promise<any> => {
        const response = await api.get(`/batches/${batchId}/proof`);
        return response.data;
    },
};

export const proofsApi = {
    // Retry proof generation for a metric
    retryMetricProof: async (startupId: string, metricId: string): Promise<any> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        const response = await startupApi.post(`/startups/${startupId}/metrics/${metricId}/retry-proof`, {
            founderId: user.id
        });
        return response.data;
    },

    // Get proof status for a metric
    getMetricProofStatus: async (metricId: string): Promise<any> => {
        const response = await api.get(`/proofs/metric/${metricId}`);
        return response.data;
    },

    // Get inclusion proof for an event
    getInclusionProof: async (eventId: string): Promise<InclusionProof> => {
        const response = await api.get(`/events/${eventId}/proof`);
        return response.data;
    },
};

// ==================== METRIC VERIFICATION REQUESTS ====================

export interface MetricVerificationRequest {
    id: string;
    investor_id: string;
    startup_id: string;
    metric_type: string;
    threshold: number;
    status: 'pending' | 'approved' | 'rejected' | 'verified' | 'failed';
    proof_result?: boolean;
    proof_batch_id?: string;
    rejection_reason?: string;
    startup_name?: string;
    investor_email?: string;
    created_at: string;
    responded_at?: string;
    verified_at?: string;
}

export interface StartupAvailableMetrics {
    startup_id: string;
    startup_name: string;
    metrics: Array<{
        id: string;
        name: string;
        has_verified_proof: boolean;
    }>;
}

export const verificationApi = {
    // Get available metrics for a startup (what investors can verify)
    getAvailableMetrics: async (startupId: string): Promise<StartupAvailableMetrics> => {
        const response = await investorApi.get(`/investor/startups/${startupId}/available-metrics`);
        return response.data;
    },

    // Investor: Request metric verification
    requestVerification: async (startupId: string, metricType: string, threshold: number): Promise<MetricVerificationRequest> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        const response = await investorApi.post('/investor/verify-metric', {
            investorId: user.id,
            startupId,
            metricType,
            threshold
        });
        return response.data;
    },

    // Investor: Get my verification requests
    getMyRequests: async (): Promise<MetricVerificationRequest[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        const response = await investorApi.get('/investor/verification-requests', {
            params: { investorId: user.id }
        });
        return response.data;
    },

    // Founder: Get verification requests for my startup
    getStartupRequests: async (startupId: string): Promise<MetricVerificationRequest[]> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) return [];
        const user = JSON.parse(userData);
        const response = await startupApi.get(`/startups/${startupId}/verification-requests`, {
            params: { founderId: user.id }
        });
        return response.data;
    },

    // Founder: Approve verification request
    approveRequest: async (startupId: string, requestId: string): Promise<any> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        const response = await startupApi.post(`/startups/${startupId}/verification-requests/${requestId}/approve`, {
            founderId: user.id
        });
        return response.data;
    },

    // Founder: Reject verification request
    rejectRequest: async (startupId: string, requestId: string, reason?: string): Promise<any> => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (!userData) throw new Error('User not authenticated');
        const user = JSON.parse(userData);
        const response = await startupApi.post(`/startups/${startupId}/verification-requests/${requestId}/reject`, {
            founderId: user.id,
            reason
        });
        return response.data;
    },
};
