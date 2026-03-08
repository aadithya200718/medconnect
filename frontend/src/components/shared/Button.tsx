import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children?: ReactNode;
    variant?: 'primary' | 'success' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

const variantClasses = {
    primary: 'glass-button',
    success: 'glass-button-success',
    danger: 'glass-button-danger',
    outline: 'glass-button-outline',
    ghost: 'bg-transparent hover:bg-white/10 text-white border-none',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    return (
        <motion.button
            className={clsx(
                variantClasses[variant],
                sizeClasses[size],
                fullWidth && 'w-full',
                'font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2',
                className
            )}
            disabled={disabled || isLoading}
            whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : leftIcon ? (
                <span className="w-4 h-4">{leftIcon}</span>
            ) : null}
            {children}
            {rightIcon && !isLoading && <span className="w-4 h-4">{rightIcon}</span>}
        </motion.button>
    );
}

