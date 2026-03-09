
import { motion } from 'framer-motion';
import { IconClose } from '../components/icons';
import Button from '../components/ui/Button';

const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword({
  resetEmail,
  setResetEmail,
  resetLoading,
  handleForgotPassword,
  setShowForgotPopup,
}) {
  
  const isInputValid = EMAIL_VALIDATION_REGEX.test(resetEmail);

  const handleClose = () => {
    if (resetLoading) return;
    setShowForgotPopup(false);
    setResetEmail("");
  };

  return (
    <div className="fixed inset-0 bg-app-dark/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white max-w-sm w-full text-center"
      >
        {/* ✨ TOP RIGHT CLOSE BUTTON */}
        <button
          onClick={handleClose}
          disabled={resetLoading}
          className="absolute top-5 right-5 p-2 rounded-full text-text-dark/20 hover:text-text-dark/50 transition-all disabled:opacity-0"
          aria-label="Close"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* ✨ ICON: Centered Minimalist Style */}
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="text-text-dark" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
          </svg>
        </div>

        {/* ✨ HEADER & SUBTEXT */}
        <h3 className="text-h3 font-bold text-text-dark ">Reset Password</h3>
        <p className="text-sm-text font-normal text-text-dark/70 mt-2 mb-8 px-2">
          Only fully registered admin accounts will receive a password reset link via email.
        </p>

        {/* EMAIL INPUT FIELD */}
        <div className="mb-8 text-left">
          <label htmlFor="email" className="block text-micro font-medium text-text-dark/70 mb-3 ">
            Admin Email Address
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-text-dark">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914" />
              </svg>
            </span>
            <input
              type="email"
              id="email"
              disabled={resetLoading}
              className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm-text font-normal focus:outline-none focus:border-app-dark focus:bg-white transition-all"
              placeholder="Enter registered email"
              autoComplete="off"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
        </div>

        {/* ✨ ACTION BUTTONS */}
        <div className="flex gap-3 w-full">
          <Button
            variant="primary"
            className="flex-[2] order-1"
            onClick={handleForgotPassword}
            disabled={!isInputValid}
            isLoading={resetLoading}
          >
            {resetLoading ? "Sending..." : "Send Reset Link"}
          </Button>

          <Button
            variant="secondary"
            className="flex-1 order-2"
            onClick={handleClose}
            disabled={resetLoading}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}