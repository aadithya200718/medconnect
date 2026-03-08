import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Heart, AlertTriangle, Droplet, Edit2, Check, X, Plus } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { QRGenerator } from '@/components/shared/QRGenerator';
import { useAuthStore } from '@/store/auth.store';
import type { Patient } from '@/types';

export function PatientProfile() {
    const { user } = useAuthStore();
    const patient = user as Patient;

    // Editable state
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [fullName, setFullName] = useState(patient?.fullName || '');
    const [dob, setDob] = useState(patient?.dob || '');
    const [gender, setGender] = useState(patient?.gender || '');
    const [bloodGroup, setBloodGroup] = useState(patient?.bloodGroup || '');
    const [allergies, setAllergies] = useState<string[]>(patient?.allergies || []);
    const [newAllergy, setNewAllergy] = useState('');
    const [chronicConditions, setChronicConditions] = useState<string[]>(patient?.chronicConditions || []);
    const [newCondition, setNewCondition] = useState('');

    const handleSave = (section: string) => {
        // In production, this would call an API to save
        console.log(`Saving ${section}:`, { fullName, dob, gender, bloodGroup, allergies, chronicConditions });
        setEditingSection(null);
    };

    const addAllergy = () => {
        if (newAllergy.trim()) {
            setAllergies([...allergies, newAllergy.trim()]);
            setNewAllergy('');
        }
    };

    const removeAllergy = (index: number) => {
        setAllergies(allergies.filter((_, i) => i !== index));
    };

    const addCondition = () => {
        if (newCondition.trim()) {
            setChronicConditions([...chronicConditions, newCondition.trim()]);
            setNewCondition('');
        }
    };

    const removeCondition = (index: number) => {
        setChronicConditions(chronicConditions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Health Profile</h1>
                <p className="text-white/60">Manage your personal and medical information</p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
                <GlassCard className="lg:col-span-1">
                    <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{fullName || patient?.fullName}</h2>
                        <p className="text-white/50 mb-4">Patient ID: {patient?.id}</p>
                        <Badge variant="verified"><Shield className="w-3 h-3" /> Verified</Badge>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-white/50">Gov-ID</span><span className="text-white font-mono">{patient?.govId?.slice(0, 4)}****{patient?.govId?.slice(-4)}</span></div>
                            <div className="flex justify-between"><span className="text-white/50">Wallet</span><span className="text-white font-mono text-xs truncate max-w-[150px]">{patient?.walletAddress || 'Not connected'}</span></div>
                        </div>
                    </div>

                    {/* Consent Request QR Code */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <QRGenerator
                            data={JSON.stringify({
                                type: 'consent_request',
                                patientId: patient?.id,
                            })}
                            title="Consent QR"
                            description="Doctor scans this code to send you a consent request"
                            size={160}
                        />
                    </div>
                </GlassCard>

                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                            {editingSection === 'personal' ? (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}><X className="w-4 h-4" /> Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={() => handleSave('personal')}><Check className="w-4 h-4" /> Save</Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => setEditingSection('personal')}><Edit2 className="w-4 h-4" /> Edit</Button>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-xs text-white/40 mb-1">Full Name</p>
                                {editingSection === 'personal' ? (
                                    <input className="w-full bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                ) : (
                                    <p className="text-white">{fullName || patient?.fullName}</p>
                                )}
                            </div>
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-xs text-white/40 mb-1">Date of Birth</p>
                                {editingSection === 'personal' ? (
                                    <input type="date" className="w-full bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500" value={dob} onChange={(e) => setDob(e.target.value)} />
                                ) : (
                                    <p className="text-white">{dob || patient?.dob}</p>
                                )}
                            </div>
                            <div className="p-4 rounded-xl bg-white/5">
                                <p className="text-xs text-white/40 mb-1">Gender</p>
                                {editingSection === 'personal' ? (
                                    <select className="w-full bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                ) : (
                                    <p className="text-white capitalize">{gender || patient?.gender}</p>
                                )}
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 flex items-center gap-2">
                                <Droplet className="w-4 h-4 text-danger-400" />
                                <div className="flex-1">
                                    <p className="text-xs text-white/40 mb-1">Blood Group</p>
                                    {editingSection === 'personal' ? (
                                        <select className="w-full bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                                            <option value="">Select</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                        </select>
                                    ) : (
                                        <p className="text-white">{bloodGroup || patient?.bloodGroup}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Allergies */}
                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning-400" />Allergies</h3>
                            {editingSection === 'allergies' ? (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}><X className="w-4 h-4" /> Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={() => handleSave('allergies')}><Check className="w-4 h-4" /> Save</Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => setEditingSection('allergies')}><Edit2 className="w-4 h-4" /> Edit</Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {allergies.length > 0
                                ? allergies.map((allergy, i) => (
                                    <Badge key={i} variant="danger">
                                        {allergy}
                                        {editingSection === 'allergies' && (
                                            <button onClick={() => removeAllergy(i)} className="ml-1 hover:text-white"><X className="w-3 h-3 inline" /></button>
                                        )}
                                    </Badge>
                                ))
                                : <p className="text-white/50">No known allergies</p>
                            }
                        </div>
                        {editingSection === 'allergies' && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    className="flex-1 bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Add allergy..."
                                    value={newAllergy}
                                    onChange={(e) => setNewAllergy(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
                                />
                                <Button variant="ghost" size="sm" onClick={addAllergy}><Plus className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </GlassCard>

                    {/* Chronic Conditions */}
                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Heart className="w-5 h-5 text-danger-400" />Chronic Conditions</h3>
                            {editingSection === 'conditions' ? (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}><X className="w-4 h-4" /> Cancel</Button>
                                    <Button variant="primary" size="sm" onClick={() => handleSave('conditions')}><Check className="w-4 h-4" /> Save</Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => setEditingSection('conditions')}><Edit2 className="w-4 h-4" /> Edit</Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {chronicConditions.length > 0
                                ? chronicConditions.map((condition, i) => (
                                    <Badge key={i} variant="warning">
                                        {condition}
                                        {editingSection === 'conditions' && (
                                            <button onClick={() => removeCondition(i)} className="ml-1 hover:text-white"><X className="w-3 h-3 inline" /></button>
                                        )}
                                    </Badge>
                                ))
                                : <p className="text-white/50">No chronic conditions</p>
                            }
                        </div>
                        {editingSection === 'conditions' && (
                            <div className="mt-3 flex gap-2">
                                <input
                                    className="flex-1 bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Add condition..."
                                    value={newCondition}
                                    onChange={(e) => setNewCondition(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addCondition()}
                                />
                                <Button variant="ghost" size="sm" onClick={addCondition}><Plus className="w-4 h-4" /></Button>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
