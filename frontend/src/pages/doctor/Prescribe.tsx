import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Search, Plus, Trash2, Send, Shield, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { doctorApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import type { Doctor } from '@/types';

// Mock medicines for autocomplete (could be an API later)
const mockMedicines = [
    { id: 'm1', name: 'Metformin 500mg', genericName: 'Metformin Hydrochloride', manufacturer: 'Sun Pharma' },
    { id: 'm2', name: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', manufacturer: 'Cipla' },
    { id: 'm3', name: 'Glimepiride 1mg', genericName: 'Glimepiride', manufacturer: 'Lupin' },
    { id: 'm4', name: 'Telmisartan 40mg', genericName: 'Telmisartan', manufacturer: 'Glenmark' },
    { id: 'm5', name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', manufacturer: 'Abbott' },
    { id: 'm6', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', manufacturer: 'Sun Pharma' },
    { id: 'm7', name: 'Paracetamol 650mg', genericName: 'Paracetamol', manufacturer: 'Dolo' },
];

interface SearchResult {
    id: string;
    full_name: string;
    gov_id: string;
    has_consent: number; // 1 or 0
}

export function DoctorPrescribe() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const doctor = user as Doctor;

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<SearchResult | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [medicines, setMedicines] = useState<{ id: string; name: string; dosage: string; frequency: string; duration: string; quantity: number }[]>([]);
    const [searchMedicine, setSearchMedicine] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2 && doctor?.id) {
                try {
                    const res = await doctorApi.searchPatients(doctor.id, searchTerm);
                    if (res.success) setSearchResults(res.data);
                } catch (err) {
                    console.error('Search failed', err);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, doctor?.id]);

    const addMedicine = (med: typeof mockMedicines[0]) => {
        setMedicines([...medicines, {
            id: med.id + Date.now(), // unique id if added multiple times
            name: med.name,
            dosage: '',
            frequency: '',
            duration: '',
            quantity: 0
        }]);
        setSearchMedicine('');
    };

    const updateMedicine = (id: string, field: string, value: any) => {
        setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const removeMedicine = (id: string) => setMedicines(medicines.filter((m) => m.id !== id));

    const handleIssuePrescription = async () => {
        if (!selectedPatient || !doctor?.id || medicines.length === 0) return;

        setIsSubmitting(true);
        try {
            const res = await doctorApi.issuePrescription(doctor.id, {
                patientId: selectedPatient.id,
                diagnosis,
                medicines: medicines.map(m => ({
                    medicineId: m.id.split('_')[0], // assuming mock id
                    name: m.name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration: m.duration,
                    quantity: m.quantity
                })),
                notes
            });

            if (res.success) {
                // Navigate to success or clear form
                alert('Prescription issued successfully!');
                navigate('/doctor/dashboard'); // Or replace with dedicated success page
            }
        } catch (error: any) {
            console.error('Issue failed', error);
            alert(error.response?.data?.error || 'Failed to issue prescription');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">New Prescription</h1>
                <p className="text-white/60">Create a blockchain-verified digital prescription</p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Patient Search */}
                    <GlassCard className="relative overflow-visible z-20">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" /> Select Patient
                        </h3>
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search patient by name or Govt ID..."
                            icon={<Search className="w-4 h-4" />}
                        />

                        {/* Search Dropdown */}
                        {searchResults.length > 0 && !selectedPatient && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {searchResults.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                                        onClick={() => [setSelectedPatient(p), setSearchTerm(p.full_name), setSearchResults([])]}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{p.full_name}</p>
                                                <p className="text-xs text-white/50">ID: {p.gov_id}</p>
                                            </div>
                                            {p.has_consent ? (
                                                <Badge variant="success">Active Consent</Badge>
                                            ) : (
                                                <Badge variant="danger">No Consent</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedPatient && (
                            <div className="mt-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{selectedPatient.full_name}</p>
                                        <p className="text-xs text-white/50">{selectedPatient.gov_id}</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => { setSelectedPatient(null); setSearchTerm(''); }}>Change</Button>
                            </div>
                        )}
                    </GlassCard>

                    {/* Prescription Details */}
                    {selectedPatient && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <GlassCard>
                                <h3 className="text-lg font-semibold text-white mb-4">Diagnosis</h3>
                                <Input placeholder="Enter diagnosis (e.g., Type 2 Diabetes)..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                                <div className="mt-4">
                                    <label className="text-sm text-white/50 mb-2 block">Clinical Notes (Optional)</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                                        placeholder="Add notes..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    ></textarea>
                                </div>
                            </GlassCard>

                            <GlassCard>
                                <h3 className="text-lg font-semibold text-white mb-4">Medicines</h3>
                                <div className="relative">
                                    <Input
                                        placeholder="Search medicines..."
                                        value={searchMedicine}
                                        onChange={(e) => setSearchMedicine(e.target.value)}
                                        icon={<Search className="w-4 h-4" />}
                                    />
                                    {searchMedicine && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f2e] border border-white/10 rounded-xl z-10 p-2 shadow-xl">
                                            {mockMedicines
                                                .filter((m) => m.name.toLowerCase().includes(searchMedicine.toLowerCase()))
                                                .slice(0, 5)
                                                .map((med) => (
                                                    <div key={med.id} onClick={() => addMedicine(med)} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer flex items-center justify-between">
                                                        <div><p className="text-white">{med.name}</p><p className="text-xs text-white/50">{med.manufacturer}</p></div>
                                                        <Plus className="w-4 h-4 text-primary-400" />
                                                    </div>
                                                ))}
                                            {mockMedicines.filter(m => m.name.toLowerCase().includes(searchMedicine.toLowerCase())).length === 0 && (
                                                <div className="p-2 text-white/50 text-sm">No medicines found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 space-y-3">
                                    {medicines.map((med) => (
                                        <div key={med.id} className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-white font-medium">{med.name}</p>
                                                <button onClick={() => removeMedicine(med.id)} className="p-1 rounded hover:bg-danger-500/20"><Trash2 className="w-4 h-4 text-danger-400" /></button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                <Input
                                                    placeholder="Dosage (500mg)"
                                                    size="sm"
                                                    value={med.dosage}
                                                    onChange={(e) => updateMedicine(med.id, 'dosage', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Freq (1-0-1)"
                                                    size="sm"
                                                    value={med.frequency}
                                                    onChange={(e) => updateMedicine(med.id, 'frequency', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Duration (5d)"
                                                    size="sm"
                                                    value={med.duration}
                                                    onChange={(e) => updateMedicine(med.id, 'duration', e.target.value)}
                                                />
                                                <Input
                                                    placeholder="Qty"
                                                    size="sm"
                                                    type="number"
                                                    value={med.quantity || ''}
                                                    onChange={(e) => updateMedicine(med.id, 'quantity', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {medicines.length === 0 && <p className="text-center text-white/50 py-4 border-2 border-dashed border-white/10 rounded-xl">Add medicines from the search bar above</p>}
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </div>

                <div className="space-y-6">
                    <GlassCard className="border-l-4 border-l-primary-500 sticky top-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Prescription Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">Doctor</span>
                                <span className="text-white max-w-[150px] truncate">{doctor?.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Patient</span>
                                <span className="text-white max-w-[150px] truncate">{selectedPatient?.full_name || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Diagnosis</span>
                                <span className="text-white max-w-[150px] truncate">{diagnosis || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Medicines</span>
                                <span className="text-white">{medicines.length}</span>
                            </div>
                        </div>

                        {!selectedPatient && (
                            <div className="mt-4 p-3 bg-white/5 rounded-lg flex gap-2">
                                <AlertCircle className="w-4 h-4 text-white/40 flex-shrink-0" />
                                <p className="text-xs text-white/50">Select a patient to proceed.</p>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                                <Shield className="w-4 h-4" />
                                <span>Blockchain Immutable Record</span>
                            </div>
                            <Button
                                className="w-full"
                                disabled={!selectedPatient || !diagnosis || medicines.length === 0 || isSubmitting}
                                onClick={handleIssuePrescription}
                                isLoading={isSubmitting}
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? 'Issuing...' : 'Issue Prescription'}
                            </Button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
