import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, Calendar, CheckCircle, Package } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Input } from '@/components/shared/Input';
import { Badge } from '@/components/shared/Badge';

const mockHistory = [
    { id: 'h1', patientName: 'Harish Kumar', prescription: 'Diabetes Management', medicines: ['Metformin 500mg', 'Glimepiride 1mg'], date: '2026-02-01', time: '10:30 AM', verified: true },
    { id: 'h2', patientName: 'Sneha Reddy', prescription: 'BP Control', medicines: ['Amlodipine 5mg'], date: '2026-02-01', time: '09:15 AM', verified: true },
    { id: 'h3', patientName: 'Amit Patel', prescription: 'Allergies', medicines: ['Cetirizine 10mg'], date: '2026-01-31', time: '04:45 PM', verified: true },
    { id: 'h4', patientName: 'Priya Singh', prescription: 'Pain Management', medicines: ['Paracetamol 500mg', 'Ibuprofen 400mg'], date: '2026-01-31', time: '02:20 PM', verified: true },
];

export function PharmacyHistory() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('all');

    const filteredHistory = mockHistory.filter((item) =>
        item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.prescription.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Dispense History</h1>
                <p className="text-white/60">View all past medicine dispenses</p>
            </motion.div>

            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1"><Input placeholder="Search by patient or prescription..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<Search className="w-4 h-4" />} /></div>
                    <div className="flex gap-2">
                        {['all', 'today', 'week', 'month'].map((filter) => (
                            <button key={filter} onClick={() => setDateFilter(filter)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter === filter ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                                {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <div className="space-y-4">
                {filteredHistory.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <GlassCard>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-success-500/20 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-6 h-6 text-success-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-white">{item.patientName}</h3>
                                            {item.verified && <Badge variant="verified">Verified</Badge>}
                                        </div>
                                        <p className="text-sm text-white/50">{item.prescription}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {item.medicines.map((med) => (<Badge key={med} variant="default" size="sm"><Package className="w-3 h-3" />{med}</Badge>))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-xs text-white/40 mb-1 justify-end"><Calendar className="w-3 h-3" /><span>{item.date}</span></div>
                                    <p className="text-sm text-white/70">{item.time}</p>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}

                {filteredHistory.length === 0 && (
                    <GlassCard className="text-center py-12"><History className="w-12 h-12 text-white/20 mx-auto mb-4" /><h3 className="text-lg font-semibold text-white mb-2">No records found</h3></GlassCard>
                )}
            </div>
        </div>
    );
}
