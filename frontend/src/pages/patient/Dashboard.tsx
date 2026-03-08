import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Shield, Activity, ChevronRight, Pill, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/store/auth.store';
import { patientApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import type { Patient } from '@/types';
import AIChatBot from '@/components/shared/AIChatBot';

export function PatientDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const patient = user as Patient;
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [activeConsents, setActiveConsents] = useState<any[]>([]);
    const [stats, setStats] = useState([
        { label: 'Active Prescriptions', value: '0', icon: FileText, color: 'from-primary-500 to-primary-600', shadow: 'shadow-primary-500/30' },
        { label: 'Active Consents', value: '0', icon: Clock, color: 'from-warning-500 to-warning-600', shadow: 'shadow-warning-500/30' },
        { label: 'Verified Records', value: '0', icon: Shield, color: 'from-success-500 to-success-600', shadow: 'shadow-success-500/30' },
        { label: 'Health Score', value: '98%', icon: Activity, color: 'from-info-500 to-info-600', shadow: 'shadow-info-500/30' },
    ]);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (!patient?.id) return;

            try {
                const [rxRes, consentRes] = await Promise.all([
                    patientApi.getPrescriptions(patient.id),
                    patientApi.getConsents(patient.id)
                ]);

                if (rxRes.success) {
                    setPrescriptions(rxRes.data);
                }
                if (consentRes.success) {
                    const active = consentRes.data.filter((c: any) => c.is_active);
                    setActiveConsents(active);

                    setStats(prev => [
                        { ...prev[0], value: rxRes.data.filter((r: any) => r.status === 'active').length.toString() },
                        { ...prev[1], value: active.length.toString() },
                        { ...prev[2], value: (rxRes.data.length + active.length).toString() },
                        prev[3]
                    ]);
                }
            } catch (error) {
                console.error('Failed to load dashboard data', error);
            }
        };
        loadDashboardData();
    }, [patient]);

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
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-info-400">{patient?.fullName?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-white/60">
                        Your health snapshot for today. All systems normal.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="glass-button" onClick={() => navigate('/patient/profile')}>
                        <Activity className="w-4 h-4 mr-2" />
                        My Profile
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
                {/* Main Content Area - 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Actions */}
                    <motion.div variants={item}>
                        <GlassCard className="p-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
                                <button onClick={() => navigate('/patient/scan')} className="p-4 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-3 text-center group">
                                    <div className="w-12 h-12 rounded-full bg-primary-500/10 group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
                                        <Shield className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white/80 group-hover:text-white">Verify Medicine</span>
                                </button>
                                <button onClick={() => navigate('/patient/consents')} className="p-4 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-3 text-center group">
                                    <div className="w-12 h-12 rounded-full bg-warning-500/10 group-hover:bg-warning-500/20 flex items-center justify-center transition-colors">
                                        <Clock className="w-6 h-6 text-warning-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white/80 group-hover:text-white">Manage Access</span>
                                </button>
                                <button onClick={() => navigate('/patient/prescriptions')} className="p-4 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-3 text-center group">
                                    <div className="w-12 h-12 rounded-full bg-info-500/10 group-hover:bg-info-500/20 flex items-center justify-center transition-colors">
                                        <FileText className="w-6 h-6 text-info-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white/80 group-hover:text-white">My Records</span>
                                </button>
                                <button onClick={() => navigate('/patient/profile')} className="p-4 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-3 text-center group">
                                    <div className="w-12 h-12 rounded-full bg-success-500/10 group-hover:bg-success-500/20 flex items-center justify-center transition-colors">
                                        <Activity className="w-6 h-6 text-success-400" />
                                    </div>
                                    <span className="text-sm font-medium text-white/80 group-hover:text-white">Health Profile</span>
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>

                    {/* Recent Prescriptions */}
                    <motion.div variants={item}>
                        <GlassCard>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                                    <p className="text-sm text-white/40">Your latest medical updates</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/patient/prescriptions')}>
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {prescriptions.slice(0, 3).map((rx) => (
                                    <div
                                        key={rx.id}
                                        className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                                        onClick={() => navigate('/patient/prescriptions')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Pill className="w-6 h-6 text-primary-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-white font-semibold text-lg">{rx.diagnosis}</p>
                                                    <StatusBadge status={rx.status} />
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-white/50">
                                                    <span className="flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        {rx.doctor_name || 'Unknown Doctor'}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(rx.created_at || rx.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                                {prescriptions.length === 0 && (
                                    <div className="text-center py-12 flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <FileText className="w-8 h-8 text-white/20" />
                                        </div>
                                        <p className="text-white/60 font-medium">No recent prescriptions</p>
                                        <p className="text-sm text-white/40 mt-1 max-w-xs">Prescriptions issued by your doctor will appear here automatically.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>

                {/* Sidebar Area - 1/3 width */}
                <div className="space-y-6">
                    {/* Active Consents */}
                    <motion.div variants={item}>
                        <GlassCard className="h-full">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">Active Access</h2>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/patient/consents')}>
                                    Manage
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {activeConsents.slice(0, 4).map((consent) => (
                                    <div
                                        key={consent.id}
                                        className="p-3 rounded-lg bg-white/5 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-warning-500/20 flex items-center justify-center">
                                                <Clock className="w-5 h-5 text-warning-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">{consent.granted_to_name}</p>
                                                <p className="text-xs text-white/40 capitalize">{consent.granted_to_type}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-500/10 text-success-400">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {activeConsents.length === 0 && (
                                    <p className="text-white/40 text-center py-8 text-sm">No active data sharing consents.</p>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>

                    {/* Security Notice */}
                    <motion.div variants={item}>
                        <GlassCard className="bg-gradient-to-br from-success-500/10 to-transparent border-success-500/20">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-success-500/20 flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-5 h-5 text-success-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Blockchain Secured</h3>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Your medical records are cryptographically secured on the Polygon network. You have full control over who accesses your data.
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
            {/* AI Health Assistant Chatbot */}
            <AIChatBot />
        </motion.div>
    );
}
