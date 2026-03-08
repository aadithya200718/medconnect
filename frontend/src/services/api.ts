import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('medconnect-token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth API
export const authApi = {
    // Login Flow
    login: async (phone: string) => {
        const response = await api.post('/auth/login', { phone });
        return response.data;
    },

    verifyLoginOTP: async (phone: string, otp: string) => {
        const response = await api.post('/auth/verify-login-otp', { phone, otp });
        return response.data;
    },

    // Registration Flow
    register: async (data: { name: string; role: string; phone: string; aadhar_number: string }) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    verifyRegistrationOTP: async (phone: string, otp: string) => {
        const response = await api.post('/auth/verify-registration-otp', { phone, otp });
        return response.data;
    },

    // Legacy / Helper
    requestOTP: async (govId: string) => {
        const response = await api.post('/auth/request-otp', { govId });
        return response.data;
    },

    verifyOTP: async (govId: string, otp: string, role: string) => {
        const response = await api.post('/auth/verify-otp', { govId, otp, role });
        return response.data;
    },

    verifyToken: async () => {
        const response = await api.get('/auth/verify');
        return response.data;
    }
};

// Patient API
export const patientApi = {
    getProfile: async (patientId: string) => {
        const response = await api.get(`/patient/profile/${patientId}`);
        return response.data;
    },

    getPrescriptions: async (patientId: string) => {
        const response = await api.get(`/patient/${patientId}/prescriptions`);
        return response.data;
    },

    getConsents: async (patientId: string) => {
        const response = await api.get(`/patient/${patientId}/consents`);
        return response.data;
    },

    grantConsent: async (patientId: string, data: { grantedToId: string; grantedToType: string; consentTypes: string[]; durationHours?: number }) => {
        const response = await api.post(`/patient/${patientId}/consents`, data);
        return response.data;
    },

    revokeConsent: async (patientId: string, consentId: string) => {
        const response = await api.delete(`/patient/${patientId}/consents/${consentId}`);
        return response.data;
    },

    getQRData: async (patientId: string) => {
        const response = await api.get(`/patient/${patientId}/qr`);
        return response.data;
    },

    searchDoctors: async (query: string) => {
        const response = await api.get('/patient/search/doctors', { params: { q: query } });
        return response.data;
    },

    searchPharmacies: async (query: string) => {
        const response = await api.get('/patient/search/pharmacies', { params: { q: query } });
        return response.data;
    }
};

// Doctor API
export const doctorApi = {
    getPatients: async (doctorId: string) => {
        const response = await api.get(`/doctor/${doctorId}/patients`);
        return response.data;
    },

    getPrescriptions: async (doctorId: string) => {
        const response = await api.get(`/doctor/${doctorId}/prescriptions`);
        return response.data;
    },

    issuePrescription: async (doctorId: string, data: { patientId: string; diagnosis: string; medicines: any[]; notes?: string }) => {
        const response = await api.post(`/doctor/${doctorId}/prescribe`, data);
        return response.data;
    },

    searchPatients: async (doctorId: string, query: string) => {
        const response = await api.get(`/doctor/${doctorId}/search-patients`, { params: { query } });
        return response.data;
    }
};

// Pharmacy API
export const pharmacyApi = {
    getHistory: async (pharmacyId: string) => {
        const response = await api.get(`/pharmacy/${pharmacyId}/history`);
        return response.data;
    },

    verifyPatient: async (qrData: string) => {
        const response = await api.post('/pharmacy/verify-patient', { qrData });
        return response.data;
    },

    verifyMedicine: async (qrData: string) => {
        const response = await api.post('/pharmacy/verify-medicine', { qrData });
        return response.data;
    },

    getPatientPrescriptions: async (patientId: string) => {
        const response = await api.get(`/pharmacy/patient/${patientId}/prescriptions`);
        return response.data;
    },

    dispense: async (pharmacyId: string, data: { prescriptionId: string; patientId: string; patientQrVerified: boolean; medicineQrVerified: boolean }) => {
        const response = await api.post(`/pharmacy/${pharmacyId}/dispense`, data);
        return response.data;
    }
};

// AI API
export const aiApi = {
    analyzePrescription: async (data: {
        medicines: any[];
        patientAllergies?: string[];
        chronicConditions?: string[];
        patientAge?: number;
    }) => {
        const response = await api.post('/ai/analyze-prescription', data);
        return response.data;
    },

    chat: async (message: string, history: Array<{ role: string; content: string }> = []) => {
        const response = await api.post('/ai/chat', { message, history });
        return response.data;
    }
};

export default api;
