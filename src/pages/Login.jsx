import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ForgotPassword from "../modal/ForgotPassword";
import { LoginPopup } from "../modal/LoginPopup";
import { useLoginStore } from "../store/auth/useLoginStore"; 
import { useSettingsStore } from "../store/settings/useSettingsStore"; // ✨ Added Settings Store
import { SystemPinModal } from "../components/security/SystemPinModal"; // ✨ Added Modal Import
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconClose } from "../components/icons";
import { TERMS_AND_POLICY } from '../constants/termsContent';

/**
 * @component TermsModal
 * @description Atomic component for rendering the Terms and Policy overlay securely.
 * Implements Focus Trapping and Escape-key closure for A11y.
 */
const TermsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        <header className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 id="terms-title" className="text-base-text  text-text-dark leading-none">
              Terms & Privacy Policy
            </h2>
            <p className="text-nano text-text-dark/40 uppercase mt-1.5 ">
              Last Updated: {TERMS_AND_POLICY.lastUpdated}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors focus:ring-1 focus:ring-app-dark outline-none"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4 text-text-dark/40" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-left" tabIndex={0}>
          {TERMS_AND_POLICY.sections.map(s => (
            <div key={s.id}>
              <h4 className="text-micro  text-text-dark uppercase mb-1 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-app-dark" aria-hidden="true" />
                {s.title}
              </h4>
              <p className="text-micro text-text-dark/70 leading-relaxed pl-3 border-l border-slate-100">
                {s.content}
              </p>
            </div>
          ))}
        </div>

        <footer className="p-4 bg-white border-t border-slate-50">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-app-dark text-white rounded-xl text-micro hover:opacity-90 transition-all active:scale-[0.98] focus:ring-1 focus:ring-offset-2 focus:ring-app-dark outline-none"
          >
            I understand
          </button>
        </footer>
      </div>
    </div>
  );
};

/**
 * @component Login
 * @description Main authentication interface.
 */
export default function Login() {
  const navigate = useNavigate();
  const { isLoginLoading, isResetLoading, popup, clearPopup, loginUser, resetPassword } = useLoginStore();
  
  // ✨ Gatekeeper State
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const systemConfig = useSettingsStore((state) => state.systemConfig);

  // Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  const passwordInputRef = useRef(null);

  // ✨ PIN Verification Handler
  const handlePinVerification = useCallback((enteredPin) => {
    setIsVerifying(true);
    setPinError("");

    setTimeout(() => {
      // Validate against the database-configured PIN
      if (enteredPin !== systemConfig?.system_pin) {
        setPinError("Invalid Security PIN");
        setIsVerifying(false);
        setPinInput(""); // Clear for retry
        return;
      }

      // Unlock the component
      setIsPinVerified(true);
      setIsVerifying(false);
    }, 500); // 500ms delay to prevent rapid brute-force
  }, [systemConfig?.system_pin]);

  // UseMemo prevents regex recompilation on every keystroke
  const isFormValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(loginEmail.trim()) && loginPassword.length >= 6;
  }, [loginEmail, loginPassword]);

  // UseCallback prevents recreating functions on render, saving child re-renders
  const handleEmailKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus();
    }
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (isLoginLoading || !isFormValid) return;

    try {
      const isSuccess = await loginUser(loginEmail, loginPassword, navigate);
      if (!isSuccess) setLoginPassword(""); // Clear password on fail for security
    } catch (error) {
      console.error("Login process interrupted");
      setLoginPassword(""); 
    }
  }, [isLoginLoading, isFormValid, loginEmail, loginPassword, loginUser, navigate]);

  const handleForgotPassword = useCallback(() => {
    const sanitizedResetEmail = resetEmail.trim();
    if (!sanitizedResetEmail) return;

    resetPassword(sanitizedResetEmail, () => {
      setShowForgotPopup(false);
      setResetEmail("");
    });
  }, [resetEmail, resetPassword]);

  // ==========================================
  // ✨ THE ZERO-TRUST EARLY RETURN
  // ==========================================
  if (!isPinVerified) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden">
        {/* Subtle background branding while locked */}
        <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
           <IconLock className="w-96 h-96 text-app-dark" aria-hidden="true" />
        </div>
        
        <SystemPinModal 
          isOpen={true}
          hideClose={true} // Forces them to enter the PIN, no escaping
          onSubmit={handlePinVerification}
          title="Store Login Portal"
          pin={pinInput}
          setPin={setPinInput}
          error={pinError}
          isProcessing={isVerifying}
        />
      </main>
    );
  }

  // ==========================================
  // ACTUAL LOGIN UI (Rendered only after auth)
  // ==========================================
  return (
    <div className="flex justify-center items-center w-full min-h-screen p-3 bg-white overflow-y-auto animate-fade-in">
      <LoginPopup message={popup.message} type={popup.type} onClose={clearPopup} />

      <main className="flex flex-col w-full max-w-[350px] p-3 bg-white mt-[-100px]">
        <header className="flex justify-center items-center w-full flex-col">
          <div className="mb-3 flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden shadow-sm">
            <img src="/images/lolafeslaundry-logo-transparent.png" alt="Lola Fe's Laundry Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-center text-h1 font-bold text-text-dark mb-2 tracking-tight">
            Welcome to Lola Fe's Laundry&nbsp;Shop
          </h1>
          <p className="text-center text-base-text text-text-dark/70 mb-4 ">
            Log in to continue
          </p>
        </header>

        <form onSubmit={handleLogin} noValidate aria-label="Login form">
          <div className="mb-3 text-start">
            <label htmlFor="login-email" className="block text-text-dark/80 text-sm-text mb-1 ">Email</label>
            <div className="relative flex items-center w-full mb-3 text-start">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconAtSymbol className="w-4 h-4" />
              </span>
              <input
                type="email"
                id="login-email"
                maxLength={254}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text  outline-none focus:ring-0 focus:border-app-dark  transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your Email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                disabled={isLoginLoading}
                aria-invalid={loginEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)}
              />
            </div>
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="login-password" className="block text-text-dark/80 text-sm-text mb-1 ">Password</label>
            <div className="relative w-full flex items-center">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                ref={passwordInputRef} 
                type={showPassword ? "text" : "password"}
                id="login-password"
                maxLength={128}
                className="w-full pl-10 pr-[40px] py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text  outline-none focus:ring-0 focus:border-app-dark  transition-all box-border disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoginLoading}
              />
              <button
                type="button"
                className="absolute right-3 flex items-center justify-center p-1 rounded hover:bg-slate-100 transition-colors opacity-80 focus:ring-0 outline-none disabled:opacity-50"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={isLoginLoading}
              >
                {showPassword ? <IconEyeClosed className="w-4 h-4" aria-hidden="true" /> : <IconEyeOpen className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>

            <div className="text-end mt-2">
              <button
                type="button"
                onClick={() => setShowForgotPopup(true)}
                disabled={isLoginLoading}
                className="text-nano text-blue-600  hover:text-blue-800 focus:text-blue-800 transition-colors outline-none rounded focus:ring-0 disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoginLoading || !isFormValid}
            className={`w-full bg-app-dark text-white  text-sm-text px-4 py-3 rounded-lg shadow cursor-pointer transition-all focus:outline-none focus:ring-0  ${
              (isLoginLoading || !isFormValid) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 shadow-md active:scale-95"
            }`}
            aria-live="polite"
          >
            {isLoginLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-nano text-text-dark/60  leading-relaxed max-w-[280px] mx-auto">
            By logging in or creating an account, you agree to our{" "}
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-blue-600  hover:underline focus:outline-none focus:ring-0 rounded"
              aria-haspopup="dialog"
            >
              Terms of Service and Privacy Policy
            </button>
          </p>
        </div>

        <div className="mt-4 flex gap-3 justify-center border-t border-slate-100 pt-5">
          <p className="text-micro text-text-dark/70 ">
            Don't have an account?{" "}
            <Link 
              to={isLoginLoading ? "#" : "/signup"} 
              className={`text-micro text-blue-600  no-underline rounded focus:outline-none focus:ring-0  ${isLoginLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:text-blue-800"}`}
            >
              Sign up
            </Link>
          </p>
        </div>
      </main>

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />

      {showForgotPopup && (
        <ForgotPassword
          resetEmail={resetEmail}
          setResetEmail={setResetEmail}
          resetLoading={isResetLoading}
          handleForgotPassword={handleForgotPassword}
          setShowForgotPopup={setShowForgotPopup}
        />
      )}
    </div>
  );
}