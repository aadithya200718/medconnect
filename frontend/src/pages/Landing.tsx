import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Shield,
    CheckCircle2,
    Scan,
    Clock,
    Lock,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { GlassCard } from '@/components/shared/GlassCard';

import { useAuthStore } from '@/store/auth.store';

const features = [
    {
        icon: Shield,
        title: 'Gov-ID Authentication',
        description: 'Secure access linked to your government identity',
    },
    {
        icon: Scan,
        title: 'Dual Verification',
        description: 'Patient ID + Medicine QR verification for every dispense',
    },
    {
        icon: Clock,
        title: 'Time-Bound Consent',
        description: 'Control who accesses your data and for how long',
    },
    {
        icon: Lock,
        title: 'Blockchain Security',
        description: 'Immutable records on Polygon blockchain',
    },
];

const stats = [
    { value: '10K+', label: 'Prescriptions Verified' },
    { value: '500+', label: 'Pharmacies Connected' },
    { value: '99.9%', label: 'Uptime' },
    { value: '0', label: 'Counterfeit Medicines' },
];

export function LandingPage() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();

    // If already authenticated, redirect to dashboard

    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(`/${user.role}`);
        }
    }, [isAuthenticated, user, navigate]);

    if (isAuthenticated && user) {
        return null; // Or a loading spinner
    }

    return (
        <div className="min-h-screen overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success-500/20 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <img src="/logo.jpg" alt="MedConnect" className="w-10 h-10 rounded-xl object-contain" />
                    <span className="text-xl font-bold text-white">MedConnect</span>
                </div>
                <Button onClick={() => navigate('/login')}>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                            <Sparkles className="w-4 h-4 text-primary-400" />
                            <span className="text-sm text-white/80">Powered by Blockchain</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            Secure Healthcare
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-success-400">
                                Connected & Verified
                            </span>
                        </h1>

                        <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
                            A unified platform where patient identity, digital prescriptions, and medicine
                            authenticity are verified together before any drug is dispensed.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <Button size="lg" onClick={() => navigate('/register')}>
                                Get Started
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                            <Button variant="outline" size="lg">
                                Learn More
                            </Button>
                        </div>
                    </motion.div>
                </div>

                {/* Stats */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    {stats.map((stat, index) => (
                        <GlassCard key={index} className="text-center" hoverable>
                            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                            <p className="text-sm text-white/50">{stat.label}</p>
                        </GlassCard>
                    ))}
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">Why MedConnect?</h2>
                    <p className="text-white/60 max-w-xl mx-auto">
                        A complete solution for secure healthcare management
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <GlassCard className="h-full" hoverable>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-white/50">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            step: '01',
                            title: 'Patient Grants Consent',
                            description: 'Time-bound access control for doctors and pharmacies',
                            icon: Clock,
                        },
                        {
                            step: '02',
                            title: 'Doctor Issues Prescription',
                            description: 'Digital prescription recorded on blockchain',
                            icon: Shield,
                        },
                        {
                            step: '03',
                            title: 'Pharmacy Dual Verifies',
                            description: 'Patient QR + Medicine QR verification before dispense',
                            icon: CheckCircle2,
                        },
                    ].map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                        >
                            <GlassCard className="relative" hoverable>
                                <span className="absolute top-4 right-4 text-5xl font-bold text-white/5">
                                    {item.step}
                                </span>
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-500/20 to-success-600/20 flex items-center justify-center mb-4">
                                    <item.icon className="w-6 h-6 text-success-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-white/50">{item.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
                <GlassCard className="text-center p-10">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-white/60 mb-6">
                        Join thousands of patients, doctors, and pharmacies already using MedConnect
                    </p>
                    <Button size="lg" onClick={() => navigate('/login')}>
                        Sign In with Phone
                        <Shield className="w-5 h-5" />
                    </Button>
                </GlassCard>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 py-8 mt-20">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">MedConnect © 2026</span>
                    </div>
                    <p className="text-sm text-white/30">
                        Built for Hackathon Demo
                    </p>
                </div>
            </footer>


        </div>
    );
}
