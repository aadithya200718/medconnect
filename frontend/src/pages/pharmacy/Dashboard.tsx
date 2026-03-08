import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Scan, Clock, TrendingUp, ChevronRight, FileText, CheckCircle, AlertTriangle, Search, QrCode } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/shared/Button';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import type { Pharmacy } from '@/types';
import { pharmacyApi } from '@/services/api';

export function PharmacyDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const pharmacy = user as Pharmacy;

    const [stats, setStats] = useState([
        { label: 'Today\'s Dispenses', value: '0', icon: CheckCircle, color: 'from-success-500 to-success-600', shadow: 'shadow-success-500/30' },
        { label: 'Total Dispensed', value: '0', icon: FileText, color: 'from-primary-500 to-primary-600', shadow: 'shadow-primary-500/30' },
        { label: 'Inventory Items', value: '1,234', icon: Package, color: 'from-info-500 to-info-600', shadow: 'shadow-info-500/30' },
        { label: 'Low Stock Alerts', value: '3', icon: AlertTriangle, color: 'from-warning-500 to-warning-600', shadow: 'shadow-warning-500/30' },
    ]);
    const [recentDispenses, setRecentDispenses] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!pharmacy?.id) return;
            try {
                const res = await pharmacyApi.getHistory(pharmacy.id);
                if (res.success) {
                    const data = res.data;
                    setRecentDispenses(data);

                    // Calculate today's dispenses
                    const today = new Date().toDateString();
                    const todaysCount = data.filter((d: any) => new Date(d.dispensed_at).toDateString() === today).length;

                    setStats(prev => [
                        { ...prev[0], value: todaysCount.toString() },
                        { ...prev[1], value: data.length.toString() },
                        prev[2],
                        prev[3]
                    ]);
                }
            } catch (error) {
                console.error('Failed to load pharmacy dashboard', error);
            }
        };
        loadData();
    }, [pharmacy]);

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
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{pharmacy?.pharmacyName}</h1>
                    <p className="text-white/60 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                        POS System Online • {pharmacy?.address}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => navigate('/pharmacy/dispense')}
                        className="glass-button-primary shadow-lg shadow-primary-500/20 px-8 py-6 h-auto text-lg"
                    >
                        <QrCode className="w-6 h-6 mr-3" />
                        New Dispense
                    </Button>
                </div>
            </motion.div>

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
                <div className="lg:col-span-2 space-y-6">
                    <motion.div variants={item}>
                        <GlassCard>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                                    <p className="text-sm text-white/40">Dispensed prescriptions log</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/pharmacy/history')}>
                                    View All <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {recentDispenses.length > 0 ? recentDispenses.slice(0, 5).map((d) => (
                                    <div key={d.id} className="p-4 rounded-xl bg-white/5 flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-success-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-lg">{d.patient_name || 'Patient'}</p>
                                                <p className="text-sm text-white/50 font-mono">
                                                    RX-{d.prescription_id?.substring(0, 8).toUpperCase()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-white font-medium mb-1">
                                                {new Date(d.dispensed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-500/10 text-success-400">
                                                Verified
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12 flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <Scan className="w-8 h-8 text-white/20" />
                                        </div>
                                        <p className="text-white/60 font-medium">No dispenses today</p>
                                        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/pharmacy/dispense')}>
                                            Start Dispensing
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>

                <div className="space-y-6">
                    <motion.div variants={item}>
                        <GlassCard>
                            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="flex-col h-24 py-2" onClick={() => navigate('/pharmacy/dispense')}>
                                    <Scan className="w-8 h-8 mb-2 text-primary-400" />
                                    <span className="text-sm">Scan QR</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-24 py-2" onClick={() => navigate('/pharmacy/inventory')}>
                                    <Package className="w-8 h-8 mb-2 text-info-400" />
                                    <span className="text-sm">Inventory</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-24 py-2" onClick={() => navigate('/pharmacy/history')}>
                                    <FileText className="w-8 h-8 mb-2 text-warning-400" />
                                    <span className="text-sm">Records</span>
                                </Button>
                                <Button variant="outline" className="flex-col h-24 py-2">
                                    <Clock className="w-8 h-8 mb-2 text-white/60" />
                                    <span className="text-sm">Shift Report</span>
                                </Button>
                            </div>
                        </GlassCard>
                    </motion.div>

                    <motion.div variants={item}>
                        <GlassCard className="bg-warning-500/10 border-warning-500/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-white font-medium mb-1">Low Stock Alert</h3>
                                    <p className="text-xs text-white/60">
                                        3 items have fallen below threshold. Please review inventory to prevent stockouts.
                                    </p>
                                    <Button variant="ghost" size="sm" className="mt-2 text-warning-400 hover:text-warning-300 p-0 h-auto" onClick={() => navigate('/pharmacy/inventory')}>
                                        Review Inventory &rarr;
                                    </Button>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
