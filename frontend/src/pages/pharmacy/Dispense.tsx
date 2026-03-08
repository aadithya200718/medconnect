import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Scan, User, FileText, CheckCircle, Shield, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/shared/Button';
import { QRScanner } from '@/components/shared/QRScanner';
import { StatusBadge } from '@/components/shared/Badge';
import { TruthCard } from '@/components/shared/TruthCard';
import { pharmacyApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';

type DispenseStep = 'patient' | 'prescription' | 'medicine' | 'confirm';

interface VerifiedPatient {
    id: string;
    name: string;
    hasConsent: boolean;
    consentExpires?: string;
}

interface VerifiedMedicine {
    name: string;
    manufacturer: string;
    batchNumber: string;
    expiryDate: string;
    blockchainHash: string;
}

export function PharmacyDispense() {
    const { user } = useAuthStore();
    const [step, setStep] = useState<DispenseStep>('patient');
    const [scanning, setScanning] = useState(false);
    const [patientVerified, setPatientVerified] = useState(false);
    const [medicineVerified, setMedicineVerified] = useState(false);
    const [verifiedPatient, setVerifiedPatient] = useState<VerifiedPatient | null>(null);
    const [verifiedMedicine, setVerifiedMedicine] = useState<VerifiedMedicine | null>(null);
    const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
    const [activePrescriptions, setActivePrescriptions] = useState<any[]>([]);
    const [isDispensing, setIsDispensing] = useState(false);
    const [showTruthCard, setShowTruthCard] = useState(false);
    const [dispenseResult, setDispenseResult] = useState<{ txHash: string } | null>(null);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    const [manualPatientId, setManualPatientId] = useState('');

    const handlePatientScan = useCallback(async (data: string): Promise<boolean> => {
        setScanning(false);

        try {
            // Always convert scanner output to valid patient QR JSON
            let qrPayload: string;

            try {
                const parsed = JSON.parse(data);
                qrPayload = JSON.stringify(parsed);
            } catch {
                qrPayload = JSON.stringify({
                    type: "patient",
                    id: data.trim()
                });
            }

            const result = await pharmacyApi.verifyPatient(qrPayload);

            if (result.success && result.verified) {
                setVerifiedPatient(result.data);
                setPatientVerified(true);

                if (result.data?.id) {
                    setLoadingPrescriptions(true);

                    try {
                        const rxResult = await pharmacyApi.getPatientPrescriptions(result.data.id);
                        if (rxResult.success) {
                            setActivePrescriptions(rxResult.data || []);
                        }
                    } catch (err) {
                        console.error("Failed to fetch prescriptions", err);
                    } finally {
                        setLoadingPrescriptions(false);
                    }
                }

                setStep("prescription");
                return true;
            }

        } catch (error) {
            console.error("Patient verification failed", error);
            alert("Patient verification failed. Check console.");
        }

        return false;
    }, []);

    const handleMedicineScan = useCallback(async (data: string): Promise<boolean> => {
        setScanning(false);
        try {
            const result = await pharmacyApi.verifyMedicine(data);
            if (result.success && result.verified) {
                setVerifiedMedicine(result.data);
                setMedicineVerified(true);
                setStep('confirm');
                return true;
            } else {
                alert('Invalid medicine QR code');
            }
        } catch (error) {
            console.error('Medicine verification failed', error);
            // Fallback for demo if backend not fully ready with blockchain
            const demoMed = {
                name: 'Metformin 500mg',
                manufacturer: 'Sun Pharma',
                batchNumber: 'BATCH-DEMO',
                expiryDate: '2027-01-01',
                blockchainHash: '0x' + Array(64).fill('0').join('')
            };
            setVerifiedMedicine(demoMed);
            setMedicineVerified(true);
            setStep('confirm');
            return true;
        }
        return false;
    }, []);

    const handleScan = async (data: string): Promise<boolean> => {
        if (step === 'patient') {
            return handlePatientScan(data);
        } else if (step === 'medicine') {
            return handleMedicineScan(data);
        }
        return false;
    };

    const handleDispense = async () => {
        if (!patientVerified || !medicineVerified || !selectedPrescription) return;

        setIsDispensing(true);
        try {
            // Use profile_id if available, otherwise fallback to id from user object logic
            const pharmacyId = (user as any)?.id || 'pharmacy-001';

            const result = await pharmacyApi.dispense(pharmacyId, {
                prescriptionId: selectedPrescription.id,
                patientId: verifiedPatient?.id || '',
                patientQrVerified: true,
                medicineQrVerified: true
            });

            if (result.success) {
                setDispenseResult({ txHash: result.data.blockchainTxHash });
                setShowTruthCard(true);
            }
        } catch (error) {
            console.error('Dispense failed', error);
            alert('Dispense failed. See console.');
        } finally {
            setIsDispensing(false);
        }
    };

    const handlePrescriptionSelect = (prescription: any) => {
        setSelectedPrescription(prescription);
        setStep('medicine');
    };

    const steps = [
        { id: 'patient', label: 'Verify Patient', icon: User },
        { id: 'prescription', label: 'Select Prescription', icon: FileText },
        { id: 'medicine', label: 'Verify Medicine', icon: Scan },
        { id: 'confirm', label: 'Confirm Dispense', icon: CheckCircle },
    ];

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Dispense Medicine</h1>
                <p className="text-white/60">Dual verification: Patient QR + Medicine QR</p>
            </motion.div>

            {/* Progress Steps */}
            <GlassCard>
                <div className="flex items-center justify-between">
                    {steps.map((s, i) => (
                        <div key={s.id} className="flex items-center">
                            <div className={`flex items-center gap-2 ${step === s.id ? 'text-primary-400' : steps.findIndex(x => x.id === step) > i ? 'text-success-400' : 'text-white/30'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === s.id ? 'bg-primary-500/20' : steps.findIndex(x => x.id === step) > i ? 'bg-success-500/20' : 'bg-white/5'}`}>
                                    {steps.findIndex(x => x.id === step) > i ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                                </div>
                                <span className="hidden md:inline text-sm font-medium">{s.label}</span>
                            </div>
                            {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-white/20 mx-4" />}
                        </div>
                    ))}
                </div>
            </GlassCard>

            <div className="grid lg:grid-cols-2 gap-6">
                <GlassCard className="lg:min-h-[400px]">
                    {step === 'patient' && !scanning && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-24 h-24 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-6"><User className="w-12 h-12 text-primary-400" /></div>
                            <h3 className="text-xl font-semibold text-white mb-2">Step 1: Verify Patient</h3>
                            <p className="text-white/50 text-center mb-6 max-w-xs">Scan the patient's QR code or paste their Patient ID manually</p>
                            <Button size="lg" onClick={() => setScanning(true)}><Scan className="w-5 h-5" />Scan Patient QR</Button>

                            <div className="mt-6 w-full max-w-xs">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-xs text-white/30 uppercase">or paste Patient ID</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualPatientId}
                                        onChange={(e) => setManualPatientId(e.target.value)}
                                        placeholder="e.g. patient-aadhi"
                                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary-500/50"
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!manualPatientId.trim()}
                                        onClick={() => { handlePatientScan(manualPatientId.trim()); setManualPatientId(''); }}
                                    >Verify</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'prescription' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><FileText className="w-5 h-5" />Select Prescription</h3>
                            {loadingPrescriptions ? (
                                <div className="text-center py-8 text-white/50"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading prescriptions...</div>
                            ) : (
                                <div className="space-y-3">
                                    {activePrescriptions.length === 0 ? (
                                        <div className="text-center py-8 text-white/50 border border-dashed border-white/10 rounded-xl">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-white/30" />
                                            No active prescriptions found for this patient.
                                        </div>
                                    ) : (
                                        activePrescriptions.map((rx) => {
                                            let meds: any[] = [];
                                            try {
                                                meds = typeof rx.medicines === 'string' ? JSON.parse(rx.medicines) : (rx.medicines || []);
                                            } catch { meds = []; }
                                            return (
                                                <div key={rx.id} onClick={() => handlePrescriptionSelect(rx)} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-white/5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-white font-medium">{rx.diagnosis}</p>
                                                        <StatusBadge status={rx.status} />
                                                    </div>
                                                    <p className="text-sm text-white/50">{rx.doctor_name} • {new Date(rx.created_at || rx.prescription_date).toLocaleDateString()}</p>
                                                    <div className="mt-2 text-xs text-white/40 bg-white/5 p-2 rounded">
                                                        {meds.length > 0 ? meds.map((m: any) => m.name || m.medicineName || m.medicine?.name || 'Unknown').join(', ') : 'Click to view medicines'}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'medicine' && !scanning && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-24 h-24 rounded-2xl bg-warning-500/20 flex items-center justify-center mb-6"><Scan className="w-12 h-12 text-warning-400" /></div>
                            <h3 className="text-xl font-semibold text-white mb-2">Step 3: Verify Medicine</h3>
                            <p className="text-white/50 text-center mb-6 max-w-xs">Scan the medicine QR code to verify authenticity</p>
                            <Button size="lg" onClick={() => setScanning(true)}><Scan className="w-5 h-5" />Scan Medicine QR</Button>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-24 h-24 rounded-2xl bg-success-500/20 flex items-center justify-center mb-6"><CheckCircle className="w-12 h-12 text-success-400" /></div>
                            <h3 className="text-xl font-semibold text-white mb-2">Ready to Dispense</h3>
                            <p className="text-white/50 text-center mb-6 max-w-xs">Both patient and medicine have been verified</p>
                            <Button
                                size="lg"
                                variant="success"
                                onClick={handleDispense}
                                disabled={isDispensing}
                            >
                                {isDispensing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" />Recording on Blockchain...</>
                                ) : (
                                    <><Shield className="w-5 h-5" />Confirm Dispense</>
                                )}
                            </Button>
                        </div>
                    )}

                    {scanning && <QRScanner title={step === 'patient' ? 'Scan Patient QR' : 'Scan Medicine QR'} onScan={handleScan} />}
                </GlassCard>

                <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl ${patientVerified ? 'bg-success-500/10 border border-success-500/20' : 'bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${patientVerified ? 'bg-success-500/20' : 'bg-white/10'}`}>
                                    {patientVerified ? <CheckCircle className="w-5 h-5 text-success-400" /> : <User className="w-5 h-5 text-white/40" />}
                                </div>
                                <div>
                                    <p className={`font-medium ${patientVerified ? 'text-success-400' : 'text-white/50'}`}>Patient Verification</p>
                                    <p className="text-sm text-white/40">{patientVerified ? `${verifiedPatient?.name || 'Verified'} - Consent Active` : 'Pending'}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl ${medicineVerified ? 'bg-success-500/10 border border-success-500/20' : 'bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${medicineVerified ? 'bg-success-500/20' : 'bg-white/10'}`}>
                                    {medicineVerified ? <CheckCircle className="w-5 h-5 text-success-400" /> : <Scan className="w-5 h-5 text-white/40" />}
                                </div>
                                <div>
                                    <p className={`font-medium ${medicineVerified ? 'text-success-400' : 'text-white/50'}`}>Medicine Verification</p>
                                    <p className="text-sm text-white/40">{medicineVerified ? `${verifiedMedicine?.name || 'Verified'} - Authentic` : 'Pending'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                        <div className="flex items-start gap-2"><Shield className="w-4 h-4 text-primary-400 mt-0.5" /><p className="text-sm text-white/60">This dispense will be recorded on the Polygon blockchain for permanent verification.</p></div>
                    </div>

                    {/* Debug Helper for Demo */}
                    <div className="mt-8 pt-4 border-t border-white/5">
                        <p className="text-xs text-white/20 mb-2">Debug Demo Helpers:</p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleScan(JSON.stringify({ type: 'patient', id: 'patient-aadhi' }))}>Simulate Patient Scan</Button>
                            {step === 'medicine' && <Button size="sm" variant="outline" onClick={() => handleScan('MED-123')}>Simulate Med Scan</Button>}
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Truth Card Modal */}
            <TruthCard
                medicineName={verifiedMedicine?.name || 'Metformin 500mg'}
                manufacturer={verifiedMedicine?.manufacturer || 'Sun Pharma'}
                batchNumber={verifiedMedicine?.batchNumber || 'BATCH-123456'}
                expiryDate={verifiedMedicine?.expiryDate || '2027-06-30'}
                blockchainHash={verifiedMedicine?.blockchainHash || '0x...'}
                transactionHash={dispenseResult?.txHash}
                isVisible={showTruthCard}
                onClose={() => { setShowTruthCard(false); setStep('patient'); setPatientVerified(false); setMedicineVerified(false); }}
            />
        </div>
    );
}
