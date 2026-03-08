import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, User, Calendar, Pill } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Input } from '@/components/shared/Input';
import { StatusBadge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { doctorApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import type { Doctor } from '@/types';

export function DoctorPrescriptions() {
    const { user } = useAuthStore();
    const doctor = user as Doctor;
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!doctor?.id) return;
            try {
                const res = await doctorApi.getPrescriptions(doctor.id);
                if (res.success) {
                    // Map API data to the UI structure
                    const mapped = res.data.map((rx: any) => ({
                        id: rx.id,
                        patientName: rx.patient_name || 'Unknown Patient',
                        diagnosis: rx.diagnosis || 'General Checkup',
                        status: rx.status || 'active',
                        date: new Date(rx.prescription_date || rx.created_at).toISOString().split('T')[0],
                        medicines: (typeof rx.medicines === 'string' ? JSON.parse(rx.medicines) : rx.medicines)?.length || 0
                    }));
                    setPrescriptions(mapped);
                }
            } catch (error) {
                console.error('Failed to fetch prescriptions:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPrescriptions();
    }, [doctor?.id]);

    const filteredPrescriptions = prescriptions.filter((rx) => {
        const matchesSearch = rx.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || rx.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">My Prescriptions</h1>
                <p className="text-white/60">View all prescriptions you've issued</p>
            </motion.div>

            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1"><Input placeholder="Search prescriptions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<Search className="w-4 h-4" />} /></div>
                    <div className="flex gap-2">
                        {['all', 'active', 'dispensed', 'expired'].map((status) => (
                            <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <div className="space-y-4">
                {isLoading && (
                    <div className="text-center py-8 text-white/50">Loading prescriptions...</div>
                )}
                {!isLoading && filteredPrescriptions.map((rx, i) => (
                    <motion.div key={rx.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <GlassCard className="hover:ring-1 hover:ring-primary-500/50 transition-all cursor-pointer">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-primary-400" /></div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1"><h3 className="text-lg font-semibold text-white">{rx.diagnosis}</h3><StatusBadge status={rx.status} /></div>
                                        <div className="flex items-center gap-2 text-sm text-white/50"><User className="w-4 h-4" /><span>{rx.patientName}</span></div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{rx.date}</span></div>
                                            <div className="flex items-center gap-1"><Pill className="w-3 h-3" /><span>{rx.medicines} medicines</span></div>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">View Details</Button>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
                {!isLoading && filteredPrescriptions.length === 0 && (
                    <GlassCard className="text-center py-12"><FileText className="w-12 h-12 text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No prescriptions found</h3></GlassCard>
                )}
            </div>
        </div>
    );
}
