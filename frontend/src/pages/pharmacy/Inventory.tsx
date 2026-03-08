import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Input } from '@/components/shared/Input';
import { Badge } from '@/components/shared/Badge';

const mockInventory = [
    { id: 'i1', name: 'Metformin 500mg', manufacturer: 'Sun Pharma', stock: 250, expiry: '2027-06-15', status: 'good' },
    { id: 'i2', name: 'Amlodipine 5mg', manufacturer: 'Cipla', stock: 45, expiry: '2026-08-20', status: 'low' },
    { id: 'i3', name: 'Glimepiride 1mg', manufacturer: 'Lupin', stock: 180, expiry: '2027-03-10', status: 'good' },
    { id: 'i4', name: 'Paracetamol 500mg', manufacturer: 'Dr. Reddy', stock: 12, expiry: '2026-04-01', status: 'critical' },
    { id: 'i5', name: 'Omeprazole 20mg', manufacturer: 'Torrent', stock: 320, expiry: '2027-12-25', status: 'good' },
];

export function PharmacyInventory() {
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<string>('all');

    const filteredInventory = mockInventory.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStock = stockFilter === 'all' || item.status === stockFilter;
        return matchesSearch && matchesStock;
    });

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Inventory</h1>
                <p className="text-white/60">Manage medicine stock and track expiry</p>
            </motion.div>

            <div className="grid grid-cols-3 gap-4">
                <GlassCard className="text-center"><p className="text-2xl font-bold text-white">{mockInventory.length}</p><p className="text-sm text-white/50">Total Items</p></GlassCard>
                <GlassCard className="text-center border-l-4 border-l-warning-500"><p className="text-2xl font-bold text-warning-400">{mockInventory.filter(i => i.status === 'low').length}</p><p className="text-sm text-white/50">Low Stock</p></GlassCard>
                <GlassCard className="text-center border-l-4 border-l-danger-500"><p className="text-2xl font-bold text-danger-400">{mockInventory.filter(i => i.status === 'critical').length}</p><p className="text-sm text-white/50">Critical</p></GlassCard>
            </div>

            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1"><Input placeholder="Search medicines..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<Search className="w-4 h-4" />} /></div>
                    <div className="flex gap-2">
                        {['all', 'good', 'low', 'critical'].map((status) => (
                            <button key={status} onClick={() => setStockFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stockFilter === status ? 'bg-primary-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <div className="space-y-3">
                {filteredInventory.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <GlassCard>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.status === 'critical' ? 'bg-danger-500/20' : item.status === 'low' ? 'bg-warning-500/20' : 'bg-primary-500/20'}`}>
                                        <Package className={`w-6 h-6 ${item.status === 'critical' ? 'text-danger-400' : item.status === 'low' ? 'text-warning-400' : 'text-primary-400'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                        <p className="text-sm text-white/50">{item.manufacturer}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center"><p className={`text-lg font-bold ${item.status === 'critical' ? 'text-danger-400' : item.status === 'low' ? 'text-warning-400' : 'text-white'}`}>{item.stock}</p><p className="text-xs text-white/40">In Stock</p></div>
                                    <div className="text-right"><div className="flex items-center gap-1 text-xs text-white/40 mb-1"><Calendar className="w-3 h-3" /><span>Expiry</span></div><p className="text-sm text-white/70">{item.expiry}</p></div>
                                    <Badge variant={item.status === 'critical' ? 'danger' : item.status === 'low' ? 'warning' : 'success'}>{item.status === 'critical' ? 'Critical' : item.status === 'low' ? 'Low Stock' : 'In Stock'}</Badge>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
