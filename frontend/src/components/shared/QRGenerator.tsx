import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from './GlassCard';
import clsx from 'clsx';

interface QRGeneratorProps {
    data: string;
    title?: string;
    description?: string;
    size?: number;
    className?: string;
}

export function QRGenerator({
    data,
    title,
    description,
    size = 200,
    className
}: QRGeneratorProps) {
    return (
        <GlassCard className={clsx('flex flex-col items-center p-6', className)}>
            {title && (
                <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            )}

            <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG
                    value={data}
                    size={size}
                    level="H"
                    includeMargin={false}
                />
            </div>

            {description && (
                <p className="mt-4 text-sm text-white/60 text-center max-w-[250px]">
                    {description}
                </p>
            )}

            <p className="mt-2 text-xs font-mono text-white/40 break-all max-w-[250px] text-center">
                {data}
            </p>
        </GlassCard>
    );
}
