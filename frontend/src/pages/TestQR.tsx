import { useState } from 'react';
import { GlassCard } from '../components/shared/GlassCard';
import { QRGenerator } from '../components/shared/QRGenerator';
import { QRScanner } from '../components/shared/QRScanner';
import { Button } from '../components/shared/Button';
import { ArrowRight, QrCode, Scan } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TestQR() {
    // Generator State
    const [jsonInput, setJsonInput] = useState('{\n  "id": "MED-123",\n  "name": "Paracetamol",\n  "batch": "B001"\n}');
    const [generatedData, setGeneratedData] = useState('');

    // Scanner State
    const [scannedData, setScannedData] = useState<string | null>(null);

    const handleGenerate = () => {
        try {
            // Validate JSON
            JSON.parse(jsonInput);
            setGeneratedData(jsonInput);
        } catch (e) {
            alert('Invalid JSON');
        }
    };

    const handleScan = async (data: string) => {
        console.log('Scanned:', data);
        setScannedData(data);
        return true; // Simulate successful verification
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 mb-6"
                    >
                        <QrCode className="w-4 h-4" />
                        <span className="text-sm">Dev Tools</span>
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-6">
                        QR Code Testing
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl mx-auto">
                        Generate and scan QR codes to verify functionality.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Generator Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <GlassCard className="h-full p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-primary-400" />
                                Generator
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">
                                        JSON Data
                                    </label>
                                    <textarea
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        className="w-full h-40 glass-input font-mono text-sm"
                                        placeholder="Enter JSON data..."
                                    />
                                </div>

                                <Button fullWidth onClick={handleGenerate}>
                                    Generate QR
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>

                                {generatedData && (
                                    <div className="mt-8 flex justify-center">
                                        <QRGenerator
                                            data={generatedData}
                                            title="Generated Code"
                                            description="Scan this code to test the scanner"
                                        />
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>

                    {/* Scanner Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <GlassCard className="h-full p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Scan className="w-5 h-5 text-success-400" />
                                Scanner
                            </h2>

                            <div className="space-y-6">
                                <QRScanner
                                    title="Test Scanner"
                                    onScan={handleScan}
                                    placeholder="Use camera or type JSON..."
                                />

                                {scannedData && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10"
                                    >
                                        <h3 className="text-sm font-medium text-white/60 mb-2">Scanned Result:</h3>
                                        <pre className="text-xs font-mono text-success-400 whitespace-pre-wrap break-all">
                                            {scannedData}
                                        </pre>
                                    </motion.div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
