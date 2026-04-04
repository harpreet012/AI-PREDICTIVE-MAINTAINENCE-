import { motion, AnimatePresence } from 'framer-motion';

/**
 * ConfirmModal — drop-in replacement for window.confirm()
 * Props:
 *   open     {boolean}  — show/hide
 *   title    {string}   — dialog title
 *   message  {string}   — body text
 *   danger   {boolean}  — red confirm button vs blue
 *   confirmLabel {string}
 *   cancelLabel  {string}
 *   onConfirm {function}
 *   onCancel  {function}
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  danger = true,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onCancel?.()}
        >
          <motion.div
            className="confirm-card"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Icon */}
            <div className={`confirm-icon ${danger ? 'danger' : 'info'}`}>
              {danger ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            <h3 className="confirm-title">{title}</h3>
            <p className="confirm-message">{message}</p>

            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <motion.button
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={onConfirm}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
