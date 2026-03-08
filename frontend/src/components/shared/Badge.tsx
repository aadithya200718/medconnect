import { ReactNode } from 'react';
import clsx from 'clsx';
import { Check, Clock, AlertTriangle, X, Info, Shield } from 'lucide-react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'verified';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md';
    icon?: ReactNode;
    className?: string;
}

const variantConfig = {
    default: {
        classes: 'glass-badge',
        icon: null,
    },
    success: {
        classes: 'glass-badge-success',
        icon: <Check className="w-3 h-3" />,
    },
    warning: {
        classes: 'glass-badge-warning',
        icon: <AlertTriangle className="w-3 h-3" />,
    },
    danger: {
        classes: 'glass-badge-danger',
        icon: <X className="w-3 h-3" />,
    },
    info: {
        classes: 'glass-badge-info',
        icon: <Info className="w-3 h-3" />,
    },
    verified: {
        classes: 'glass-badge-success verified-badge',
        icon: <Shield className="w-3 h-3" />,
    },
};

const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
};

export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    icon,
    className = ''
}: BadgeProps) {
    const config = variantConfig[variant];

    return (
        <span className={clsx(config.classes, sizeClasses[size], className)}>
            {icon || config.icon}
            {children}
        </span>
    );
}

// Status-specific badges
export function StatusBadge({ status }: { status: 'active' | 'dispensed' | 'expired' | 'cancelled' | 'pending' | 'verified' }) {
    const statusConfig = {
        active: { variant: 'success' as const, label: 'Active', icon: <Check className="w-3 h-3" /> },
        dispensed: { variant: 'info' as const, label: 'Dispensed', icon: <Check className="w-3 h-3" /> },
        expired: { variant: 'danger' as const, label: 'Expired', icon: <Clock className="w-3 h-3" /> },
        cancelled: { variant: 'danger' as const, label: 'Cancelled', icon: <X className="w-3 h-3" /> },
        pending: { variant: 'warning' as const, label: 'Pending', icon: <Clock className="w-3 h-3" /> },
        verified: { variant: 'verified' as const, label: 'Verified', icon: <Shield className="w-3 h-3" /> },
    };

    const config = statusConfig[status];

    return (
        <Badge variant={config.variant} icon={config.icon}>
            {config.label}
        </Badge>
    );
}
