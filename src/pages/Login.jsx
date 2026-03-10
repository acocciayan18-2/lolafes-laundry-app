import { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ForgotPassword from "../modal/ForgotPassword";
import { LoginPopup } from "../modal/LoginPopup";
import { useLoginStore } from "../store/auth/useLoginStore"; 
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconClose } from "../components/icons";
// ✨ NEW: Import the content and a simple modal for the policy
import { TERMS_AND_POLICY } from '../constants/termsContent';

export default function Login() {
  const navigate = useNavigate();

  const { 
    isLoginLoading, 
    isResetLoading, 
    popup, 
    clearPopup, 
    loginUser, 
    resetPassword 
  } = useLoginStore();
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  
  // ✨ NEW: State to show policy overlay on login page
  const [showTermsModal, setShowTermsModal] = useState(false);

  const passwordInputRef = useRef(null);

  const isFormValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(loginEmail.trim()) && loginPassword.length >= 6;
  }, [loginEmail, loginPassword]);

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoginLoading || !isFormValid) return;

    const sanitizedEmail = loginEmail.trim();

    try {
      const isSuccess = await loginUser(sanitizedEmail, loginPassword, navigate);
      if (!isSuccess) setLoginPassword(""); 
    } catch (error) {
      console.error("Login process interrupted:", error);
      setLoginPassword(""); 
    }
  };

  const handleForgotPassword = () => {
    const sanitizedResetEmail = resetEmail.trim();
    if (!sanitizedResetEmail) return;

    resetPassword(sanitizedResetEmail, () => {
      setShowForgotPopup(false);
      setResetEmail("");
    });
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen p-3 bg-white overflow-y-auto">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={clearPopup}
      />

      <div className="flex flex-col w-full max-w-[350px] p-3 bg-white mt-[-100px]">
        
        <div className="flex justify-center items-center w-full">
          <div className="mb-3 flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Lola Fe's Laundry Logo"
              className="max-w-full max-h-full w-12 h-12"
            />
          </div>
        </div>

        <h3 className="text-center text-h1 font-bold text-text-dark mb-2">
          Welcome to Lola Fe's Laundry&nbsp;Shop
        </h3>
        
        <p className="text-center text-base-text text-text-dark/70 mb-4">
          Log in to continue
        </p>

        <form onSubmit={handleLogin} noValidate>
          {/* Email Input */}
          <div className="mb-3 text-start">
            <label htmlFor="login-email" className="block text-text-dark text-sm-text mb-1">Email</label>
            <div className="relative flex items-center w-full mb-3 text-start">
              <span className="absolute left-3 text-text-dark">
                <IconAtSymbol className="w-4 h-4" />
              </span>
              <input
                type="email"
                id="login-email"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:ring-app-dark focus:border-app-dark transition-all disabled:opacity-50 disabled:bg-slate-50"
                placeholder="Enter your Email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                disabled={isLoginLoading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-3 text-start">
            <label htmlFor="login-password" className="block text-text-dark text-sm-text mb-1">Password</label>
            <div className="relative w-full flex items-center">
              <span className="absolute left-3 text-text-dark">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                ref={passwordInputRef} 
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="w-full pl-10 pr-[40px] py-2.5 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:ring-app-dark focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoginLoading}
              />
              <button
                type="button"
                className="absolute top-1/2 right-[10px] -translate-y-1/2 flex items-center justify-center w-4 h-4 p-0 bg-transparent border-none cursor-pointer text-text-dark/70 hover:text-text-dark transition-colors disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={isLoginLoading}
              >
                {showPassword ? <IconEyeClosed className="w-4 h-4" /> : <IconEyeOpen className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-end mt-1">
              <button
                type="button"
                onClick={() => setShowForgotPopup(true)}
                disabled={isLoginLoading}
                className="text-nano text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer disabled:opacity-50 font-medium"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoginLoading || !isFormValid}
            className={`w-full bg-app-dark text-white font-medium text-sm-text px-4 py-3 rounded-lg shadow cursor-pointer transition-all ${
              (isLoginLoading || !isFormValid) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 shadow-md active:scale-95"
            }`}
          >
            {isLoginLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        {/* --- ✨ NEW: TERMS & POLICY TEXT --- */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-text-dark/50 leading-relaxed max-w-[280px] mx-auto">
            By logging in or creating an account, you agree to our{" "}
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-blue-600 font-bold hover:underline focus:outline-none"
            >
              Terms of Service and Privacy Policy
            </button>
          </p>
        </div>

        <div className="mt-2 flex gap-3 justify-center border-t border-slate-100 pt-4">
          <p className="text-micro text-text-dark/70">
            Don't have an account?{" "}
            <Link 
              to={isLoginLoading ? "#" : "/signup"} 
              className={`text-micro text-blue-600 font-bold no-underline ${isLoginLoading ? "opacity-50 cursor-not-allowed" : "hover:text-blue-800"}`}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* --- ✨ NEW: POLICY OVERLAY MODAL --- */}
     {showTermsModal && (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm animate-fade-in">
    <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
      
      {/* HEADER SECTION */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-base-text font-bold text-text-dark leading-none">
            Terms & Privacy Policy
          </h2>
          {/* ✨ FIXED: Render the string directly instead of mapping it */}
          <p className="text-[10px] text-text-dark/40 uppercase mt-1.5 font-medium">
            Last Updated: {TERMS_AND_POLICY.lastUpdated}
          </p>
        </div>
        
        <button 
          onClick={() => setShowTermsModal(false)} 
          className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
        >
          <IconClose className="w-4 h-4 text-text-dark/40" />
        </button>
      </div>

      {/* CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-left">
        {TERMS_AND_POLICY.sections.map(s => (
          <div key={s.id}>
            <h4 className="text-[11px] font-bold text-text-dark uppercase mb-1 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-app-dark" />
              {s.title}
            </h4>
            <p className="text-micro text-text-dark/70 leading-relaxed pl-3 border-l border-slate-100">
              {s.content}
            </p>
          </div>
        ))}
      </div>

      {/* FOOTER ACTION */}
      <div className="p-4 bg-white border-t border-slate-50">
        <button 
          onClick={() => setShowTermsModal(false)}
          className="w-full py-2.5 bg-app-dark text-white rounded-xl  text-micro hover:opacity-90 transition-all active:scale-[0.98]"
        >
          I understand
        </button>
      </div>
    </div>
  </div>
)}

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