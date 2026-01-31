import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Button, ButtonProps } from 'antd';

// Motion Wrapper for Ant Design Button
interface MotionButtonProps extends ButtonProps {
    motionProps?: HTMLMotionProps<'div'>;
}

export const MotionButton = forwardRef<HTMLDivElement, MotionButtonProps>(
    ({ motionProps, style, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'inline-block', width: props.block ? '100%' : 'auto' }}
                {...motionProps}
            >
                <Button {...props} style={{ ...style, width: '100%', height: '100%' }} />
            </motion.div>
        );
    }
);

MotionButton.displayName = 'MotionButton';

// Motion Wrapper for Cards/Panels
interface MotionCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    noHoverLift?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
    ({ children, className, style, noHoverLift, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={!noHoverLift ? { y: -5, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' } : undefined}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={className}
                style={style}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

MotionCard.displayName = 'MotionCard';

// Container for staggering children animations
interface MotionContainerProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    delayChildren?: number;
    staggerChildren?: number;
}

export const MotionContainer = forwardRef<HTMLDivElement, MotionContainerProps>(
    ({ children, delayChildren = 0.1, staggerChildren = 0.1, ...props }, ref) => {
        const containerVariants = {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: staggerChildren,
                    delayChildren: delayChildren,
                },
            },
        };

        return (
            <motion.div
                ref={ref}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

MotionContainer.displayName = 'MotionContainer';

// Item for staggered lists
export const MotionItem = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
    ({ children, ...props }, ref) => {
        const itemVariants = {
            hidden: { opacity: 0, y: 20 },
            show: {
                opacity: 1,
                y: 0,
                transition: {
                    type: 'spring',
                    stiffness: 260,
                    damping: 20
                }
            },
        };

        return (
            <motion.div ref={ref} variants={itemVariants} {...props}>
                {children}
            </motion.div>
        );
    }
);

MotionItem.displayName = 'MotionItem';
