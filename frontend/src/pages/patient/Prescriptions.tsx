import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, Pill, User, ExternalLink, Search } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/Badge';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';
import { QRGenerator } from '@/components/shared/QRGenerator';
import { useAuthStore } from '@/store/auth.store';
import { patientApi } from '@/services/api';

export function PatientPrescriptions() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);
                const res = await patientApi.getPrescriptions(user.id);
                if (res.success) {
                    setPrescriptions(res.data || []);
                }
            } catch (error) {
                console.error("Error fetching prescriptions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, [user?.id]);

    const filteredPrescriptions = prescriptions.filter((rx) => {
        const docName = rx.doctor_name || rx.doctor?.fullName || '';
        const diagnosis = rx.diagnosis || '';
        const matchesSearch =
            diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
            docName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getMedicines = (rx: any) => {
        try {
            return typeof rx.medicines === 'string' ? JSON.parse(rx.medicines) : (rx.medicines || []);
        } catch {
            return [];
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-white mb-2">My Prescriptions</h1>
                <p className="text-white/60">View and manage your digital prescriptions</p>
            </motion.div>

            {/* Filters */}
            <GlassCard>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search prescriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'active', 'dispensed', 'expired'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </GlassCard>

            {/* Prescriptions List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-white/60">Loading prescriptions...</div>
                ) : filteredPrescriptions.map((rx, index) => (
                    <motion.div
                        key={rx.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <GlassCard
                            className="cursor-pointer transition-all hover:ring-1 hover:ring-primary-500/50"
                            onClick={() => setSelectedPrescription(rx)}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-primary-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-white">{rx.diagnosis}</h3>
                                            <StatusBadge status={rx.status} />
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white/50 mb-2">
                                            <User className="w-4 h-4" />
                                            <span>{rx.doctor_name || rx.doctor?.fullName}</span>
                                            <span className="text-white/30">•</span>
                                            <span>{rx.hospital || rx.doctor?.hospital}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-white/40">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Issued: {formatDate(rx.prescription_date || rx.prescriptionDate || rx.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Pill className="w-3 h-3" />
                                                <span>{getMedicines(rx).length} medicines</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    View Details
                                    <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}

                {!loading && filteredPrescriptions.length === 0 && (
                    <GlassCard className="text-center py-12">
                        <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No prescriptions found</h3>
                        <p className="text-white/50">Try adjusting your search or filters</p>
                    </GlassCard>
                )}
            </div>

            {/* Prescription Detail Modal */}
            <Modal
                isOpen={!!selectedPrescription}
                onClose={() => setSelectedPrescription(null)}
                title="Prescription Details"
                size="lg"
            >
                {selectedPrescription && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">
                                    {selectedPrescription.diagnosis}
                                </h3>
                                <p className="text-white/50">
                                    Prescribed by {selectedPrescription.doctor_name || selectedPrescription.doctor?.fullName}
                                </p>
                            </div>
                            <StatusBadge status={selectedPrescription.status} />
                        </div>

                        {/* Prescription Info */}
                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5">
                            <div>
                                <p className="text-xs text-white/40 mb-1">Prescription Date</p>
                                <p className="text-white">{formatDate(selectedPrescription.prescription_date || selectedPrescription.prescriptionDate || selectedPrescription.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-white/40 mb-1">Valid Until</p>
                                <p className="text-white">{formatDate(selectedPrescription.valid_until || selectedPrescription.validUntil)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-white/40 mb-1">Doctor</p>
                                <p className="text-white">{selectedPrescription.doctor_name || selectedPrescription.doctor?.fullName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-white/40 mb-1">Hospital</p>
                                <p className="text-white">{selectedPrescription.hospital || selectedPrescription.doctor?.hospital}</p>
                            </div>
                        </div>

                        {/* Medicines */}
                        <div>
                            <h4 className="text-lg font-semibold text-white mb-3">Prescribed Medicines</h4>
                            <div className="space-y-3">
                                {getMedicines(selectedPrescription).map((med: any, i: number) => (
                                    <div
                                        key={med.id || med.medicine?.id || i}
                                        className="p-4 rounded-xl bg-white/5"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center flex-shrink-0">
                                                <Pill className="w-5 h-5 text-success-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-white">{med.medicine?.name || med.name || med.medicineName}</p>
                                                <p className="text-sm text-white/50">{med.medicine?.genericName || med.genericName}</p>
                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                    <div>
                                                        <span className="text-white/40">Dosage:</span>
                                                        <span className="text-white ml-1">{med.dosage}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/40">Frequency:</span>
                                                        <span className="text-white ml-1">{med.frequency}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/40">Duration:</span>
                                                        <span className="text-white ml-1">{med.duration}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-white/40">Quantity:</span>
                                                        <span className="text-white ml-1">{med.quantity}</span>
                                                    </div>
                                                </div>
                                                {med.instructions && (
                                                    <p className="mt-2 text-sm text-warning-400 italic">
                                                        ⚠️ {med.instructions}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Blockchain Verification */}
                        <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <ExternalLink className="w-4 h-4 text-success-400" />
                                <span className="text-success-400 font-medium">Blockchain Verified</span>
                            </div>
                            <p className="text-xs text-white/50 font-mono break-all">
                                {selectedPrescription.blockchain_hash || selectedPrescription.blockchainHash}
                            </p>
                        </div>

                        {/* Prescription Verification QR Code */}
                        <QRGenerator
                            data={JSON.stringify({
                                type: 'prescription_verify',
                                prescriptionId: selectedPrescription.id,
                                hash: selectedPrescription.blockchain_hash || selectedPrescription.blockchainHash,
                            })}
                            title="Pharmacy Verification QR"
                            description="Pharmacist scans this code to verify the prescription before dispensing"
                            size={180}
                        />

                        {selectedPrescription.notes && (
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-sm text-white/40 mb-1">Doctor's Notes</p>
                                <p className="text-white">{selectedPrescription.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
