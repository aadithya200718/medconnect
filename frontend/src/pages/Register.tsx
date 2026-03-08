import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Phone, Lock, User, FileText, Briefcase } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAuthStore } from '@/store/auth.store';
import { PageTransition } from '@/components/shared/PageTransition';

export function Register() {
    const navigate = useNavigate();
    const { registerUser, verifyRegistrationOTP, isLoading } = useAuthStore();

    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [formData, setFormData] = useState({
        name: '',
        role: 'patient',
        phone: '',
        aadhar_number: ''
    });
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.phone || !formData.aadhar_number) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.phone.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        const success = await registerUser(formData);
        if (success) {
            setStep('otp');
        } else {
            setError('Registration failed. Phone or Aadhaar may already be registered.');
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!otp || otp.length < 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        const success = await verifyRegistrationOTP(formData.phone, otp);
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

                <div className="w-full max-w-md relative z-10">
                    <GlassCard className="p-8">
                        <div className="text-center mb-8">
                            <img src="/logo.jpg" alt="MedConnect" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg shadow-primary-500/20 object-contain" />
                            <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                            <p className="text-white/60">Join the secure healthcare network</p>
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 'details' ? (
                                <motion.form
                                    key="details-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleRegister}
                                    className="space-y-4"
                                >
                                    <Input
                                        label="Full Name"
                                        name="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        icon={<User className="w-5 h-5" />}
                                        required
                                    />

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80 ml-1">Role</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <select
                                                name="role"
                                                value={formData.role}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none"
                                            >
                                                <option value="patient" className="bg-slate-900">Patient</option>
                                                <option value="doctor" className="bg-slate-900">Doctor</option>
                                                <option value="pharmacy" className="bg-slate-900">Pharmacy</option>
                                            </select>
                                        </div>
                                    </div>

                                    <Input
                                        label="Phone Number"
                                        name="phone"
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        icon={<Phone className="w-5 h-5" />}
                                        required
                                    />

                                    <Input
                                        label="Aadhaar / License Number"
                                        name="aadhar_number"
                                        placeholder="12-digit Aadhaar ID"
                                        value={formData.aadhar_number}
                                        onChange={handleChange}
                                        icon={<FileText className="w-5 h-5" />}
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
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Verify & Register
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-sm text-white/40 mt-4">
                                        Already have an account?{' '}
                                        <button
                                            type="button"
                                            onClick={() => navigate('/login')}
                                            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
                                        >
                                            Login here
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
                                            <span className="text-white font-medium">{formData.phone}</span>
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
                                                Complete Registration
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => setStep('details')}
                                        className="w-full text-sm text-white/40 hover:text-white/60 transition-colors mt-2"
                                    >
                                        Change Phone Number
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </div>
            </div>
        </PageTransition>
    );
}
