import { useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, ShieldCheck, ShieldX, Package, Building2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/shared/Button';
import { QRScanner } from '@/components/shared/QRScanner';

interface ScanResult {
    isVerified: boolean;
    data: { name?: string; manufacturer?: string; batchNumber?: string; expiryDate?: string; blockchainHash?: string };
}

export function PatientScan() {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = async (_data: string): Promise<boolean> => {
        setIsProcessing(true);
        setIsScanning(false);
        await new Promise((r) => setTimeout(r, 1500));
        setScanResult({
            isVerified: true,
            data: { name: 'Metformin 500mg', manufacturer: 'Sun Pharma', batchNumber: 'BATCH-2026-001', expiryDate: '2027-06-15', blockchainHash: '0xabc123def456...' },
        });
        setIsProcessing(false);
        return true;
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-white mb-2">Verify Medicine</h1>
                <p className="text-white/60">Scan medicine QR code to verify authenticity</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6">
                <GlassCard className="lg:min-h-[400px]">
                    {!isScanning && !scanResult && !isProcessing && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-24 h-24 rounded-2xl bg-primary-500/20 flex items-center justify-center mb-6">
                                <Scan className="w-12 h-12 text-primary-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Ready to Scan</h3>
                            <Button size="lg" onClick={() => setIsScanning(true)}><Scan className="w-5 h-5" />Start Scanning</Button>
                        </div>
                    )}
                    {isScanning && <QRScanner title="Scan Medicine QR" onScan={handleScan} />}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-16 h-16 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin mb-6" />
                            <h3 className="text-xl font-semibold text-white mb-2">Verifying...</h3>
                        </div>
                    )}
                    {scanResult && (
                        <div className="flex flex-col items-center justify-center h-full py-8">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${scanResult.isVerified ? 'bg-success-500/20' : 'bg-danger-500/20'}`}>
                                {scanResult.isVerified ? <ShieldCheck className="w-10 h-10 text-success-400" /> : <ShieldX className="w-10 h-10 text-danger-400" />}
                            </motion.div>
                            <h3 className={`text-2xl font-bold mb-2 ${scanResult.isVerified ? 'text-success-400' : 'text-danger-400'}`}>
                                {scanResult.isVerified ? 'Verified Authentic' : 'Verification Failed'}
                            </h3>
                            <Button variant="outline" onClick={() => setScanResult(null)}>Scan Another</Button>
                        </div>
                    )}
                </GlassCard>

                <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4">Medicine Details</h3>
                    {scanResult?.isVerified ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5"><Package className="w-5 h-5 text-primary-400" /><p className="text-white font-medium">{scanResult.data.name}</p></div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5"><Building2 className="w-5 h-5 text-primary-400" /><p className="text-white">{scanResult.data.manufacturer}</p></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5"><p className="text-xs text-white/40 mb-1">Batch</p><p className="text-white font-mono text-sm">{scanResult.data.batchNumber}</p></div>
                                <div className="p-4 rounded-xl bg-white/5"><p className="text-xs text-white/40 mb-1">Expiry</p><p className="text-white">{scanResult.data.expiryDate}</p></div>
                            </div>
                            <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20">
                                <p className="text-xs text-success-400 font-mono break-all">{scanResult.data.blockchainHash}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/50 text-center py-8">Scan a medicine QR code to see details</p>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
