import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'light' | 'solid';
    hoverable?: boolean;
    clickable?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
};

const variantClasses = {
    default: 'glass-card',
    light: 'glass-card-light',
    solid: 'glass-card-solid',
};

export function GlassCard({
    children,
    className = '',
    variant = 'default',
    hoverable = false,
    clickable = false,
    padding = 'md',
    onClick,
}: GlassCardProps) {
    const baseClasses = clsx(
        variantClasses[variant],
        paddingClasses[padding],
        hoverable && 'transition-all duration-300 hover:scale-[1.02] hover:shadow-xl',
        clickable && 'cursor-pointer',
        className
    );

    return (
        <motion.div
            className={baseClasses}
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={hoverable ? { y: -5 } : undefined}
            whileTap={clickable ? { scale: 0.98 } : undefined}
        >
            {children}
        </motion.div>
    );
}

// Stat Card Variant
interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({ title, value, icon, trend, className = '' }: StatCardProps) {
    return (
        <GlassCard className={clsx('flex items-center gap-4', className)} hoverable>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center text-primary-400">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm text-white/60">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {trend && (
                        <span className={clsx(
                            'text-xs font-medium',
                            trend.isPositive ? 'text-success-500' : 'text-danger-500'
                        )}>
                            {trend.isPositive ? '+' : ''}{trend.value}%
                        </span>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
