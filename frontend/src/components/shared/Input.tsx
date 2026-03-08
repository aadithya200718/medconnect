import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    error?: string;
    variant?: 'glass' | 'solid';
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    icon?: React.ReactNode; // Alias for leftIcon
    size?: 'sm' | 'md'; // Size variant (renamed to avoid conflict)
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, variant = 'glass', leftIcon, rightIcon, icon, size = 'md', className = '', ...props }, ref) => {
        const resolvedLeftIcon = icon || leftIcon;
        const sizeClasses = size === 'sm' ? 'py-1.5 px-3 text-sm' : 'py-2.5 px-4';

        const inputClasses = clsx(
            variant === 'glass' ? 'glass-input' : 'glass-input-dark',
            sizeClasses,
            resolvedLeftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-danger-500',
            className
        );

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-white/80 mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {resolvedLeftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                            {resolvedLeftIcon}
                        </div>
                    )}
                    <input ref={ref} className={inputClasses} {...props} />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-danger-500">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

// OTP Input for Gov-ID
interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    error?: string;
}

export function GovIDInput({ value, onChange, error }: Omit<OTPInputProps, 'length'>) {
    const formatGovId = (input: string) => {
        // Remove non-digits
        const digits = input.replace(/\D/g, '');
        // Limit to 12 digits
        const limited = digits.slice(0, 12);
        // Format as XXXX-XXXX-XXXX
        const parts = [];
        for (let i = 0; i < limited.length; i += 4) {
            parts.push(limited.slice(i, i + 4));
        }
        return parts.join('-');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatGovId(e.target.value);
        onChange(formatted);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-white/80 mb-2">
                Government ID (12 digits)
            </label>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder="XXXX-XXXX-XXXX"
                className={clsx(
                    'glass-input text-center text-xl tracking-widest font-mono',
                    error && 'border-danger-500'
                )}
                maxLength={14} // 12 digits + 2 hyphens
            />
            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
            <p className="mt-1 text-xs text-white/40">
                Enter your 12-digit Aadhaar number
            </p>
        </div>
    );
}
