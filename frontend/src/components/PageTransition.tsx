import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.99
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Cubic bezier for smooth entrance
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.99,
    transition: {
      duration: 0.3,
      ease: "easeIn"
    }
  }
};

const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ children }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    );
  }
);

PageTransition.displayName = 'PageTransition';

export default PageTransition;
