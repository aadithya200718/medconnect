import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1], // Custom easing curve
            staggerChildren: 0.1,
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.98,
        transition: {
            duration: 0.3,
            ease: 'easeInOut',
        },
    },
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className={`w-full h-full ${className}`}
        >
            {children}
        </motion.div>
    );
}
