import emailjs from "@emailjs/browser";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { auth } from "../services/firebase";
import "../style/signup.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck } from "../components/icons";

const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
};

export default function SignUp() {
  const navigate = useNavigate();

  // --- STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "info" });
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // --- 1. PERFORMANCE: Memoized Password Criteria ---
  const criteria = useMemo(() => ({
    length: password.length >= 8, // Standardized to 8 for better security
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_,.?":{}|<>]/.test(password),
  }), [password]);

  const passwordsMatch = useMemo(() => 
    password === confirmPassword && confirmPassword !== "", 
  [password, confirmPassword]);

  const isPasswordValid = useMemo(() => 
    Object.values(criteria).every(Boolean) && passwordsMatch, 
  [criteria, passwordsMatch]);

  // --- 2. TIMERS & COOLDOWNS ---
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const triggerPopup = useCallback((message, type = "info") => {
    setPopup({ message, type });
    // Auto-clear success popups, keep error popups longer
    if (type === "success") setTimeout(() => setPopup({ message: "", type: "info" }), 4000);
  }, []);

  const handleCancel = () => {
    setIsOtpSent(false);
    setEnteredOtp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setGeneratedOtp("");
    setIsLoading(false);
  };

  // --- 3. SECURE OTP LOGIC ---
  const executeOtpSending = async () => {
    if (resendTimer > 0) return;
    
    try {
      const db = getDatabase();
      const snapshot = await get(ref(db, "admin_information/admin_email_otp"));
      
      if (!snapshot.exists()) throw new Error("Admin configuration missing.");
      
      const adminEmail = snapshot.val();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store locally (Note: in a high-security env, this would be validated server-side)
      setGeneratedOtp(otp);

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        { email: adminEmail, otp, target_user: email },
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      setIsOtpSent(true);
      setResendTimer(60); // 1-minute cooldown
      triggerPopup("Verification code sent to system admin.", "success");
    } catch (err) {
      triggerPopup(`System Error: ${err.message}`, "error");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (!isOtpSent) {
        // PRE-CHECK: Ensure email isn't already taken before sending OTP
        const methods = await fetchSignInMethodsForEmail(auth, email.trim());
        if (methods.length > 0) {
          triggerPopup("This email is already registered.", "error");
          setIsLoading(false);
          return;
        }
        await executeOtpSending();
        setIsLoading(false);
        return;
      }

      // OTP VERIFICATION
      if (enteredOtp !== generatedOtp) {
        triggerPopup("Invalid verification code.", "error");
        setIsLoading(false);
        return;
      }

      // USER CREATION
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCredential.user);

      triggerPopup("Account created! Please check your email to verify.", "success");
      
      // Delay navigation to let user read the popup
      setTimeout(() => navigate("/login"), 2000);

    } catch (error) {
      const errorMap = {
        "auth/email-already-in-use": "Email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password does not meet security standards.",
        "auth/network-request-failed": "Network error. Please check your connection."
      };
      triggerPopup(errorMap[error.code] || error.message, "error");
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "info" })}
      />

      <div className="signup-card">
        <div className="flex justify-center items-center w-full mb-4">
          <div className="flex justify-center items-center w-16 h-16 bg-app-dark rounded-2xl shadow-lg">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>

        <h3 className="text-center text-2xl font-black text-text-dark mb-1">Create Admin Account</h3>
        <p className="text-center text-sm font-medium text-text-dark/60 mb-6 uppercase tracking-wider">Internal Access Only</p>

        <form onSubmit={handleSignup} noValidate>
          {/* Email */}
          <div className="mb-4 text-start">
            <label htmlFor="email" className="text-xs font-bold uppercase text-text-dark/50 ml-1 mb-1 block">Admin Email</label>
            <div className="inputForm relative">
              <IconAtSymbol className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40" />
              <input
                type="email"
                id="email"
                className="input pl-10"
                placeholder="juan@laundry.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
            </div>
          </div>

          {/* Passwords Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="text-start">
              <label className="text-xs font-bold uppercase text-text-dark/50 ml-1 mb-1 block">Password</label>
              <div className="inputForm relative">
                <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isOtpSent || isLoading}
                />
                <button type="button" className="pwd-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                </button>
              </div>
            </div>

            <div className="text-start">
              <label className="text-xs font-bold uppercase text-text-dark/50 ml-1 mb-1 block">Confirm</label>
              <div className="inputForm relative">
                <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isOtpSent || isLoading}
                />
                <button type="button" className="pwd-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <IconEyeClosed /> : <IconEyeOpen />}
                </button>
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
            <ul className="grid grid-cols-2 gap-y-1 gap-x-4">
              {Object.entries({
                length: "Min 8 chars",
                uppercase: "Uppercase",
                number: "Number",
                special: "Special char",
                match: "Match"
              }).map(([key, label]) => {
                const isMet = key === 'match' ? passwordsMatch : criteria[key];
                return (
                  <li key={key} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight ${isMet ? "text-emerald-600" : "text-slate-400"}`}>
                    <IconCheck isMet={isMet} className="w-3 h-3" /> {label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* OTP Section */}
          {isOtpSent && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="otp" className="text-xs font-bold uppercase text-text-dark/50">Verification Code</label>
                {resendTimer > 0 ? (
                  <span className="text-[10px] font-bold text-slate-400 italic">Resend in {resendTimer}s</span>
                ) : (
                  <button type="button" onClick={executeOtpSending} className="text-[10px] font-bold text-blue-600 hover:underline">Resend Code</button>
                )}
              </div>
              <input
                autoFocus
                type="text"
                id="otp"
                className="w-full h-12 bg-white border-2 border-app-dark rounded-xl text-center text-xl font-black tracking-[0.75em] focus:ring-4 focus:ring-app-dark/10 outline-none transition-all"
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isPasswordValid || isLoading}
            className={`w-full bg-app-dark text-white font-bold h-12 rounded-xl shadow-lg transition-all active:scale-[0.98] ${
              !isPasswordValid || isLoading ? "opacity-30 cursor-not-allowed grayscale" : "hover:bg-black"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : isOtpSent ? "Create Admin Account" : "Request OTP Access"}
          </button>

          {isOtpSent && (
            <button type="button" onClick={handleCancel} className="mt-4 text-xs font-bold text-slate-400 hover:text-text-dark transition-colors uppercase tracking-widest">
              ← Change Details
            </button>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm font-medium text-text-dark/60">
            Internal Access Only • <button onClick={() => navigate("/login")} className="font-bold text-blue-600 hover:text-blue-800">Return to Login</button>
          </p>
        </div>
      </div>
    </div>
  );
}