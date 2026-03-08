import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Package, Building2, Hash, ExternalLink } from 'lucide-react';
import { Badge } from './Badge';

interface TruthCardProps {
    medicineName: string;
    manufacturer: string;
    batchNumber: string;
    expiryDate: string;
    blockchainHash: string;
    transactionHash?: string;
    isVisible: boolean;
    onClose?: () => void;
}

export function TruthCard({
    medicineName,
    manufacturer,
    batchNumber,
    expiryDate,
    blockchainHash,
    transactionHash,
    isVisible,
    onClose,
}: TruthCardProps) {
    if (!isVisible) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            />

            {/* Truth Card */}
            <motion.div
                className="truth-card truth-card-glow relative w-full max-w-sm bg-gradient-to-br from-success-500/20 to-primary-500/20 rounded-3xl p-6 border border-success-500/30"
                style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                    backdropFilter: 'blur(20px)',
                }}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 200,
                    delay: 0.1
                }}
            >
                {/* Success Animation Circle */}
                <motion.div
                    className="absolute -top-8 left-1/2 -translate-x-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center shadow-lg shadow-success-500/50">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: 'spring' }}
                        >
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </motion.div>
                    </div>
                </motion.div>

                {/* Header */}
                <div className="text-center mt-6 mb-6">
                    <motion.h2
                        className="text-2xl font-bold text-white mb-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        Medicine Verified
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Badge variant="verified" size="md">
                            Blockchain Verified
                        </Badge>
                    </motion.div>
                </div>

                {/* Medicine Details */}
                <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    {/* Medicine Name */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/50">Medicine</p>
                            <p className="text-white font-medium">{medicineName}</p>
                        </div>
                    </div>

                    {/* Manufacturer */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-success-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/50">Manufacturer</p>
                            <p className="text-white font-medium">{manufacturer}</p>
                        </div>
                    </div>

                    {/* Batch & Expiry */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-xs text-white/50 mb-1">Batch No.</p>
                            <p className="text-white font-mono text-sm">{batchNumber}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-xs text-white/50 mb-1">Expiry</p>
                            <p className="text-white font-medium text-sm">{expiryDate}</p>
                        </div>
                    </div>

                    {/* Blockchain Hash */}
                    <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <Hash className="w-3 h-3 text-white/50" />
                            <p className="text-xs text-white/50">Blockchain Hash</p>
                        </div>
                        <p className="text-white/80 font-mono text-xs truncate">{blockchainHash}</p>
                    </div>

                    {/* Transaction Link */}
                    {transactionHash && (
                        <motion.a
                            href={`https://amoy.polygonscan.com/tx/${transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">View on Blockchain</span>
                            <ExternalLink className="w-3 h-3" />
                        </motion.a>
                    )}
                </motion.div>

                {/* Close Button */}
                {onClose && (
                    <motion.button
                        onClick={onClose}
                        className="w-full mt-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Done
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
}
