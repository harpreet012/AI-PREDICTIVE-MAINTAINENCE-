import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25, ease: 'easeOut' } }
};

export default function PageTransition({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
