import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, User, Calendar, Eye, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { useAuthStore } from '@/store/auth.store';
import { doctorApi } from '@/services/api';
import type { Doctor } from '@/types';
import { useNavigate } from 'react-router-dom';

export function DoctorPatients() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const doctor = user as Doctor;
    const [patients, setPatients] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPatients();
    }, [doctor]);

    const loadPatients = async () => {
        if (!doctor?.id) return;
        try {
            setLoading(true);
            const res = await doctorApi.getPatients(doctor.id);
            if (res.success) {
                setPatients(res.data);
            }
        } catch (error) {
            console.error('Failed to load patients', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter((p) =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.gov_id?.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">My Patients</h1>
                <p className="text-white/60">View and manage your patient records</p>
            </motion.div>

            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search patients by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={loadPatients}>Refresh</Button>
                    </div>
                </div>
            </GlassCard>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-white/50">Loading patients...</div>
                ) : filteredPatients.length > 0 ? (
                    filteredPatients.map((patient, i) => (
                        <motion.div key={patient.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <GlassCard className="hover:ring-1 hover:ring-primary-500/50 transition-all cursor-pointer">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                            <User className="w-6 h-6 text-primary-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-white">{patient.full_name}</h3>
                                                <Badge variant="success">Consent Active</Badge>
                                            </div>
                                            <p className="text-sm text-white/50">
                                                {patient.gender ? `${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} • ` : ''}
                                                Blood Group: {patient.blood_group}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {patient.chronic_conditions && JSON.parse(patient.chronic_conditions).map((c: string) => (
                                                    <Badge key={c} variant="info" size="sm">{c}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-xs text-white/40 mb-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Consent Expires</span>
                                            </div>
                                            <p className="text-sm text-white/70">
                                                {new Date(patient.expires_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Profile
                                        </Button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))
                ) : (
                    <GlassCard className="text-center py-12">
                        <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No active patients found</h3>
                        <p className="text-white/50 max-w-md mx-auto">
                            Patients must grant you consent before they appear here. Ask them to verify your Gov ID and grant access.
                        </p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
