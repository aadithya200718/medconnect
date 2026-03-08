import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Phone, Lock } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAuthStore } from '@/store/auth.store';
import { PageTransition } from '@/components/shared/PageTransition';

export function Login() {
    const navigate = useNavigate();
    const { requestLoginOTP, verifyLoginOTP, isLoading } = useAuthStore();

    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!phone || phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        const success = await requestLoginOTP(phone);
        if (success) {
            setStep('otp');
        } else {
            setError('Failed to send OTP. Please check your phone number.');
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!otp || otp.length < 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        const success = await verifyLoginOTP(phone, otp);
        if (success) {
            const user = useAuthStore.getState().user;
            if (user) {
                navigate(`/${user.role}`);
            }
        } else {
            setError('Invalid OTP. Please try again.');
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Effects */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success-500/20 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md relative z-10"
                >
                    <GlassCard className="p-8">
                        <div className="text-center mb-8">
                            <img src="/logo.jpg" alt="MedConnect" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg shadow-primary-500/20 object-contain" />
                            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                            <p className="text-white/60">Secure access to your healthcare dashboard</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 'phone' ? (
                                <motion.form
                                    key="phone-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSendOTP}
                                    className="space-y-4"
                                >
                                    <Input
                                        label="Phone Number"
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        icon={<Phone className="w-5 h-5" />}
                                        required
                                    />

                                    {error && (
                                        <p className="text-red-400 text-sm">{error}</p>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Sending OTP...
                                            </>
                                        ) : (
                                            <>
                                                Send OTP
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-sm text-white/40 mt-4">
                                        Don't have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => navigate('/register')}
                                            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                                        >
                                            Register here
                                        </button>
                                    </p>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="otp-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onSubmit={handleVerifyOTP}
                                    className="space-y-4"
                                >
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-white/60">
                                            Enter the 6-digit code sent to
                                            <br />
                                            <span className="text-white font-medium">{phone}</span>
                                        </p>
                                    </div>

                                    <Input
                                        label="OTP Code"
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        icon={<Lock className="w-5 h-5" />}
                                        maxLength={6}
                                        required
                                        className="text-center letter-spacing-widest text-lg"
                                    />

                                    {error && (
                                        <p className="text-red-400 text-sm text-center">{error}</p>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                Verify & Login
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setStep('phone')}
                                        className="w-full text-sm text-white/40 hover:text-white/60 transition-colors mt-2"
                                    >
                                        Change Phone Number
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </motion.div>
            </div>
        </PageTransition>
    );
}
