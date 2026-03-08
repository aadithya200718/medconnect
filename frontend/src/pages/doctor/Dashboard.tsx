import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Clock, ChevronRight, Calendar, CheckCircle, Activity, Search, PlusCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/store/auth.store';
import { doctorApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import type { Doctor } from '@/types';

export function DoctorDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const doctor = user as Doctor;
    const [searchQuery, setSearchQuery] = useState('');

    const [stats, setStats] = useState([
        { label: 'Total Patients', value: '0', icon: Users, color: 'from-primary-500 to-primary-600', shadow: 'shadow-primary-500/30' },
        { label: 'Prescriptions Issued', value: '0', icon: FileText, color: 'from-info-500 to-info-600', shadow: 'shadow-info-500/30' },
        { label: 'Pending Reviews', value: '0', icon: Clock, color: 'from-warning-500 to-warning-600', shadow: 'shadow-warning-500/30' },
        { label: 'Verification Score', value: '100%', icon: CheckCircle, color: 'from-success-500 to-success-600', shadow: 'shadow-success-500/30' },
    ]);
    const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!doctor?.id) return;
            try {
                // Fetch prescriptions
                const res = await doctorApi.getPrescriptions(doctor.id);
                if (res.success) {
                    const rxData = res.data;
                    setRecentPrescriptions(rxData);

                    // Fetch patients count
                    try {
                        const patRes = await doctorApi.getPatients(doctor.id);
                        const patientCount = patRes.success ? patRes.data.length : 0;

                        setStats(prev => [
                            { ...prev[0], value: patientCount.toString() },
                            { ...prev[1], value: rxData.length.toString() },
                            prev[2],
                            prev[3]
                        ]);
                    } catch (err) {
                        // Fallback if getPatients fails or is not implemented
                        setStats(prev => [
                            prev[0],
                            { ...prev[1], value: rxData.length.toString() },
                            prev[2],
                            prev[3]
                        ]);
                    }
                }
            } catch (error) {
                console.error('Failed to load doctor dashboard', error);
            }
        };
        loadData();
    }, [doctor]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/doctor/patients?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            {/* Welcome Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Good day, Dr. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-info-400">{doctor?.fullName?.split(' ')[1] || doctor?.fullName}</span>
                    </h1>
                    <p className="text-white/60">
                        You have <span className="text-primary-400 font-semibold">{stats[0].value} active patients</span> monitored today.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <form onSubmit={handleSearch} className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white/10 transition-all placeholder:text-white/30"
                        />
                    </form>
                    <Button onClick={() => navigate('/doctor/prescribe')} className="glass-button-primary shadow-lg shadow-primary-500/20">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Prescribe
                    </Button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <motion.div key={stat.label} variants={item}>
                        <GlassCard hoverable className="h-full relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <stat.icon className="w-24 h-24 transform rotate-12 -mr-8 -mt-8" />
                            </div>
                            <div className="relative z-10 flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center ${stat.shadow} shadow-lg`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                                {/* Trend indicator visual */}
                                <div className="flex items-center gap-1 text-xs text-success-400 bg-success-500/10 px-2 py-1 rounded-full">
                                    <Activity className="w-3 h-3" />
                                    <span>Live</span>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stat.value}</p>
                                <p className="text-sm text-white/50 font-medium">{stat.label}</p>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div variants={item}>
                        <GlassCard>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Recent Prescriptions</h2>
                                    <p className="text-sm text-white/40">Latest medical records issued</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/prescriptions')}>
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {recentPrescriptions.slice(0, 5).map((rx) => (
                                    <div
                                        key={rx.id}
                                        className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 group"
                                        onClick={() => navigate('/doctor/prescriptions')}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-info-500/20 flex items-center justify-center text-primary-300 font-bold text-lg group-hover:scale-110 transition-transform">
                                                    {rx.patient_name?.charAt(0) || 'P'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold text-lg">{rx.patient_name}</p>
                                                    <p className="text-sm text-white/50">{rx.diagnosis}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={rx.status} />
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-white/40 ml-16">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(rx.created_at || rx.prescription_date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>
                                                    {typeof rx.medicines === 'string'
                                                        ? JSON.parse(rx.medicines).length
                                                        : rx.medicines?.length || 0} Medicines
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-success-500"></div>
                                                <span>Synced</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {recentPrescriptions.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-white/20" />
                                        </div>
                                        <p className="text-white/60 font-medium">No prescriptions issued yet</p>
                                        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/doctor/prescribe')}>
                                            Create First Prescription
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>

                {/* Quick Actions & Tips */}
                <div className="space-y-6">
                    <motion.div variants={item}>
                        <GlassCard>
                            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <Button className="w-full justify-start h-auto py-3" onClick={() => navigate('/doctor/prescribe')}>
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                                        <PlusCircle className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">New Prescription</div>
                                        <div className="text-xs text-white/60">Limitless checks enabled</div>
                                    </div>
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-auto py-3" onClick={() => navigate('/doctor/patients')}>
                                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center mr-3">
                                        <Users className="w-4 h-4 text-primary-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">My Patients</div>
                                        <div className="text-xs text-white/60">View history & status</div>
                                    </div>
                                </Button>
                            </div>
                        </GlassCard>
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassCard className="bg-gradient-to-br from-info-900/30 to-primary-900/20 border-info-500/20 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-info-500/10 rounded-full blur-2xl"></div>
                            <div className="flex items-start gap-3 mb-3 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-info-500/20 flex items-center justify-center">
                                    <AlertCircle className="w-4 h-4 text-info-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">System Update</h3>
                                    <p className="text-xs text-white/50">Today</p>
                                </div>
                            </div>
                            <p className="text-sm text-white/70 relative z-10 leading-relaxed">
                                Drug interaction database has been updated. New safety checks for antibiotics are now live.
                            </p>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
