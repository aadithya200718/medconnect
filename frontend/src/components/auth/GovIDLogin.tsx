import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Stethoscope, Building2, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { GovIDInput } from '../shared/Input';
import { Button } from '../shared/Button';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types';
import clsx from 'clsx';

interface GovIDLoginProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const roleConfig = {
    patient: {
        label: 'Patient',
        icon: User,
        description: 'Access your medical records & prescriptions',
        gradient: 'from-primary-500 to-primary-600',
    },
    doctor: {
        label: 'Doctor',
        icon: Stethoscope,
        description: 'Manage patients & issue prescriptions',
        gradient: 'from-success-500 to-success-600',
    },
    pharmacy: {
        label: 'Pharmacy',
        icon: Building2,
        description: 'Verify & dispense prescriptions',
        gradient: 'from-warning-500 to-warning-600',
    },
};

export function GovIDLogin({ isOpen, onClose, onSuccess }: GovIDLoginProps) {
    const [step, setStep] = useState<'role' | 'govid' | 'otp'>('role');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [govId, setGovId] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');

    const { requestOTP, verifyOTP, isLoading } = useAuthStore();

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
        setStep('govid');
        setError('');
    };

    const handleRequestOTP = async () => {
        if (!selectedRole || !govId) return;

        setError('');
        const success = await requestOTP(govId, selectedRole);

        if (success) {
            setStep('otp');
        } else {
            setError('Invalid Government ID. Please enter a valid 12-digit ID.');
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp) return;

        setError('');
        const success = await verifyOTP(otp);

        if (success) {
            onSuccess?.();
            onClose();
            resetState();
        } else {
            setError('Invalid or expired OTP. Please try again.');
        }
    };

    const handleBack = () => {
        if (step === 'otp') {
            setStep('govid');
            setOtp('');
        } else {
            setStep('role');
            setGovId('');
        }
        setError('');
    };

    const resetState = () => {
        setStep('role');
        setSelectedRole(null);
        setGovId('');
        setOtp('');
        setError('');
    };

    const handleClose = () => {
        onClose();
        setTimeout(resetState, 300);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="md">
            {/* Logo & Header */}
            <div className="text-center mb-6">
                <motion.div
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold text-white mb-1">MedConnect</h1>
                <p className="text-white/60 text-sm">Secure Healthcare Access Portal</p>
            </div>

            {/* Step 1: Role Selection */}
            {step === 'role' && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                >
                    <p className="text-center text-white/70 mb-4">
                        Select your role to continue
                    </p>

                    <div className="space-y-3">
                        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
                            const config = roleConfig[role];
                            const Icon = config.icon;

                            return (
                                <motion.button
                                    key={role}
                                    onClick={() => handleRoleSelect(role)}
                                    className="w-full p-4 rounded-xl glass-card hover:bg-white/10 transition-all duration-300 flex items-center gap-4 text-left group"
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className={clsx(
                                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-110',
                                        config.gradient
                                    )}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold">{config.label}</p>
                                        <p className="text-white/50 text-sm">{config.description}</p>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Step 2: Gov-ID Input */}
            {step === 'govid' && selectedRole && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    {/* Selected Role Badge */}
                    <div className="flex justify-center mb-6">
                        <div className={clsx(
                            'px-4 py-2 rounded-full flex items-center gap-2 bg-gradient-to-r text-white',
                            roleConfig[selectedRole].gradient
                        )}>
                            {(() => {
                                const Icon = roleConfig[selectedRole].icon;
                                return <Icon className="w-4 h-4" />;
                            })()}
                            <span className="font-medium">{roleConfig[selectedRole].label}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <GovIDInput
                            value={govId}
                            onChange={setGovId}
                            error={error}
                        />

                        {error && (
                            <motion.div
                                className="flex items-center gap-2 p-3 rounded-lg bg-danger-500/10 text-danger-400"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        <Button
                            fullWidth
                            onClick={handleRequestOTP}
                            isLoading={isLoading}
                            disabled={govId.replace(/-/g, '').length !== 12}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending OTP...
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Get OTP
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            fullWidth
                            onClick={handleBack}
                            disabled={isLoading}
                        >
                            ← Back to Role Selection
                        </Button>
                    </div>

                    {/* Demo Hint */}
                    <div className="mt-4 p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
                        <p className="text-xs text-primary-300 text-center">
                            <strong>Demo Mode:</strong> Enter any 12-digit number
                            <br />
                            Example: 1234-5678-9012
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Step 3: OTP Verification */}
            {step === 'otp' && selectedRole && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    {/* OTP Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center">
                            <KeyRound className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    <p className="text-center text-white/70 mb-6">
                        Enter the 6-digit OTP sent to your registered device
                    </p>

                    <div className="space-y-4">
                        {/* OTP Input */}
                        <div>
                            <label className="block text-sm text-white/60 mb-2">One-Time Password</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder:text-white/30 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                placeholder="• • • • • •"
                            />
                        </div>

                        {error && (
                            <motion.div
                                className="flex items-center gap-2 p-3 rounded-lg bg-danger-500/10 text-danger-400"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        <Button
                            fullWidth
                            onClick={handleVerifyOTP}
                            isLoading={isLoading}
                            disabled={otp.length !== 6}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Verify & Sign In
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            fullWidth
                            onClick={handleBack}
                            disabled={isLoading}
                        >
                            ← Back
                        </Button>
                    </div>

                    {/* Demo Hint */}
                    <div className="mt-4 p-3 rounded-lg bg-success-500/10 border border-success-500/20">
                        <p className="text-xs text-success-300 text-center">
                            <strong>Demo Mode:</strong> Check the backend console for OTP
                            <br />
                            Or enter any 6 digits: 123456
                        </p>
                    </div>
                </motion.div>
            )}
        </Modal>
    );
}
