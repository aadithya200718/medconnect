import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Check, X, AlertTriangle, Camera } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import clsx from 'clsx';

interface QRScannerProps {
    title: string;
    placeholder?: string;
    expectedPattern?: RegExp;
    onScan: (value: string) => Promise<boolean>;
    onVerified?: (value: string) => void;
    className?: string;
}

type ScanStatus = 'idle' | 'scanning' | 'verifying' | 'verified' | 'failed';

export function QRScanner({
    title,
    placeholder = 'Enter QR code value...',
    expectedPattern,
    onScan,
    onVerified,
    className = '',
}: QRScannerProps) {
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const regionId = 'qr-reader-region';

    useEffect(() => {
        return () => {
            if (scannerRef.current && isCameraActive) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isCameraActive]);

    const startCamera = async () => {
        try {
            setErrorMessage('');
            setIsCameraActive(true);

            // Wait for DOM
            await new Promise(r => setTimeout(r, 100));

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(regionId);
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    handleScan(decodedText);
                },
                (_errorMessage) => {
                    // Ignore transient errors
                }
            );
        } catch (err) {
            console.error(err);
            setErrorMessage('Camera access failed. Please use manual entry.');
            setIsCameraActive(false);
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current && isCameraActive) {
            try {
                await scannerRef.current.stop();
                setIsCameraActive(false);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleScan = async (value: string) => {
        if (!value.trim() || status === 'verifying' || status === 'verified') return;

        // Stop camera on success if active
        if (isCameraActive) {
            await stopCamera();
        }

        setInputValue(value);
        setStatus('verifying');
        setErrorMessage('');

        try {
            // Validate pattern if provided
            if (expectedPattern && !expectedPattern.test(value)) {
                setStatus('failed');
                setErrorMessage('Invalid QR code format');
                return;
            }

            const isValid = await onScan(value);

            if (isValid) {
                setStatus('verified');
                onVerified?.(value);
            } else {
                setStatus('failed');
                setErrorMessage('Verification failed');
            }
        } catch {
            setStatus('failed');
            setErrorMessage('Scan error occurred');
        }
    };

    const handleReset = () => {
        setInputValue('');
        setStatus('idle');
        setErrorMessage('');
        setIsCameraActive(false);
    };

    return (
        <GlassCard className={clsx('relative overflow-hidden', className)} padding="lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{title}</h3>

                {status === 'verified' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success-500/20 text-success-500 text-sm">
                        <Check className="w-4 h-4" />
                        <span>Verified</span>
                    </div>
                )}
            </div>

            {/* Camera Region */}
            <AnimatePresence>
                {isCameraActive && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 relative rounded-xl overflow-hidden bg-black aspect-square"
                    >
                        <div id={regionId} className="w-full h-full" />
                        <button
                            onClick={stopCamera}
                            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manual Input */}
            {!isCameraActive && status !== 'verified' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholder}
                                className={clsx(
                                    'glass-input font-mono text-center',
                                    status === 'failed' && 'border-danger-500 bg-danger-500/10'
                                )}
                                onKeyDown={(e) => e.key === 'Enter' && handleScan(inputValue)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            onClick={startCamera}
                            className="flex items-center justify-center gap-2"
                        >
                            <Camera className="w-4 h-4" />
                            Scan Camera
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleScan(inputValue)}
                            disabled={!inputValue}
                            isLoading={status === 'verifying'}
                        >
                            Verify Code
                        </Button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-danger-500/10 text-danger-500 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{errorMessage}</span>
                </div>
            )}

            {/* Success Actions */}
            {status === 'verified' && (
                <div className="mt-4">
                    <Button variant="outline" fullWidth onClick={handleReset}>
                        <Scan className="w-4 h-4 mr-2" />
                        Scan Another
                    </Button>
                </div>
            )}

            {status === 'failed' && !isCameraActive && (
                <div className="mt-4">
                    <Button variant="outline" fullWidth onClick={handleReset}>
                        Reset
                    </Button>
                </div>
            )}
        </GlassCard>
    );
}

// Dual Scan Status Component
interface DualScanStatusProps {
    patientVerified: boolean;
    medicineVerified: boolean;
}

export function DualScanStatus({ patientVerified, medicineVerified }: DualScanStatusProps) {
    return (
        <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center gap-2">
                <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    patientVerified
                        ? 'bg-success-500 shadow-lg shadow-success-500/50'
                        : 'bg-white/10 border-2 border-dashed border-white/30'
                )}>
                    {patientVerified ? (
                        <Check className="w-6 h-6 text-white" />
                    ) : (
                        <span className="text-white/30 text-xl">1</span>
                    )}
                </div>
                <span className={clsx(
                    'text-sm font-medium',
                    patientVerified ? 'text-success-500' : 'text-white/50'
                )}>
                    Patient ID
                </span>
            </div>

            {/* Connector Line */}
            <div className={clsx(
                'w-16 h-0.5 transition-colors duration-300',
                patientVerified && medicineVerified ? 'bg-success-500' : 'bg-white/20'
            )} />

            <div className="flex flex-col items-center gap-2">
                <div className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    medicineVerified
                        ? 'bg-success-500 shadow-lg shadow-success-500/50'
                        : 'bg-white/10 border-2 border-dashed border-white/30'
                )}>
                    {medicineVerified ? (
                        <Check className="w-6 h-6 text-white" />
                    ) : (
                        <span className="text-white/30 text-xl">2</span>
                    )}
                </div>
                <span className={clsx(
                    'text-sm font-medium',
                    medicineVerified ? 'text-success-500' : 'text-white/50'
                )}>
                    Medicine QR
                </span>
            </div>
        </div>
    );
}
