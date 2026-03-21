import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { useSignupStore } from "../store/auth/useSignupStore";
import { useSettingsStore } from "../store/settings/useSettingsStore"; // ✨ Added Settings Store
import { SystemPinModal } from "../components/security/SystemPinModal"; // ✨ Added Modal
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck } from "../components/icons";

export default function SignUp() {
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);

  // --- STORE CONNECTIONS ---
  const { 
    isLoading, 
    isOtpSent, 
    popup, 
    clearPopup, 
    triggerPopup, 
    sendOtp, 
    verifyAndSignup, 
    resetFlow 
  } = useSignupStore();

  // --- ✨ GATEKEEPER STATE ---
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const systemConfig = useSettingsStore((state) => state.systemConfig);

  // --- LOCAL FORM STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- LIFECYCLE ---
  useEffect(() => {
    return () => resetFlow();
  }, [resetFlow]);

  // --- ✨ PIN VERIFICATION HANDLER ---
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

  // --- DERIVED STATE (MEMOIZED) ---
  const criteria = useMemo(() => ({
    length: password.length >= 6,
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

  // --- HANDLERS ---
  const handleEmailKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus(); 
    }
  }, []);

  const handleCancel = useCallback(() => {
    resetFlow();
    setEnteredOtp("");
    setPassword("");
    setConfirmPassword("");
  }, [resetFlow]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // ✨ QA FIX 1: Strict Form Validation Barrier
    // Prevent ANY network request if the local criteria are not met.
    if (!isPasswordValid) {
      triggerPopup("Please ensure passwords match and meet all security criteria.", "error");
      return;
    }

    if (!isOtpSent) {
      await sendOtp(email);
    } else {
      // ✨ QA FIX 2: Validate OTP payload before sending to Firebase
      if (enteredOtp.length !== 6) {
        triggerPopup("Please enter the complete 6-digit OTP code.", "error");
        return;
      }

      await verifyAndSignup(email, password, enteredOtp, () => {
        setTimeout(() => navigate("/login"), 1500);
      });
    }
  }, [isLoading, isOtpSent, isPasswordValid, email, password, enteredOtp, sendOtp, verifyAndSignup, navigate, triggerPopup]);

  const handleOtpChange = useCallback((e) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setEnteredOtp(onlyNumbers);
  }, []);

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
          title="Admin Account Setup"
          pin={pinInput}
          setPin={setPinInput}
          error={pinError}
          isProcessing={isVerifying}
        />
      </main>
    );
  }

  // ==========================================
  // ACTUAL SIGNUP UI (Rendered only after auth)
  // ==========================================
  return (
    <div className="flex justify-center items-center w-full min-h-screen p-3 bg-white overflow-y-auto animate-fade-in">
      <LoginPopup message={popup.message} type={popup.type} onClose={clearPopup} />

      <main className="flex flex-col w-full max-w-[350px] p-3 bg-white mt-[-100px]">
        <header className="flex justify-center items-center w-full mb-3 flex-col">
          <div className="flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden mb-2 shadow-sm">
            <img src="/images/lolafeslaundry-logo-transparent.png" alt="Lola Fe's Laundry Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-center text-h1 font-bold text-text-dark mb-1 tracking-tight">Create Admin Account</h1>
          <p className="text-center text-text-dark/70 text-base-text mb-4 ">Sign up to continue</p>
        </header>

        <form onSubmit={handleSubmit} noValidate aria-label="Sign up form">
          
          <div className="mb-3 text-start w-full">
            <label htmlFor="email" className="block text-text-dark/80 text-sm-text mb-1 ">Admin Email</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconAtSymbol className="w-4 h-4" />
              </span>
              <input
                type="email"
                id="email"
                maxLength={254}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text  outline-none focus:ring-0 focus:border-app-dark transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your Email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                disabled={isOtpSent || isLoading}
                aria-invalid={email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              />
            </div>
          </div>

          <div className="mb-3 text-start w-full">
            <label htmlFor="password" className="block text-text-dark/80 text-sm-text mb-1 ">Password</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                ref={passwordInputRef}
                id="password"
                maxLength={128}
                className="w-full pl-10 pr-[40px] py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text  outline-none focus:ring-0 focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute right-3 p-1 rounded hover:bg-slate-100 transition-colors focus:ring-0  outline-none opacity-80 disabled:opacity-50"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={isLoading}
              >
                {showPassword ? <IconEyeClosed className="w-4 h-4 opacity-80" aria-hidden="true" /> : <IconEyeOpen className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="mb-3 text-start w-full">
            <label htmlFor="confirmPassword" className="block text-text-dark/80 text-sm-text mb-1 ">Confirm Password</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                maxLength={128}
                className="w-full pl-10 pr-[40px] py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text  outline-none focus:ring-0 focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute right-3 p-1 rounded hover:bg-slate-100 transition-colors focus:ring-0 outline-none opacity-80 disabled:opacity-50"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
                disabled={isLoading}
              >
                {showConfirmPassword ? <IconEyeClosed className="w-4 h-4" aria-hidden="true" /> : <IconEyeOpen className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>      

          <div aria-live="polite" aria-atomic="true">
            {confirmPassword && (
              <ul className="space-y-1 text-micro mb-1">
                <li className={`flex items-center gap-1  ${passwordsMatch ? "text-emerald-600" : "text-rose-600"}`}>
                  <IconCheck isMet={passwordsMatch} /> Password match
                </li>
              </ul>
            )}
            
            {password && (
              <ul className="space-y-1 text-micro mb-4">
                {[
                  { key: "length", text: "At least 6 characters" },
                  { key: "uppercase", text: "At least 1 uppercase letter" },
                  { key: "number", text: "At least 1 number" },
                  { key: "special", text: "At least 1 special character" },
                ].map(({ key, text }) => (
                  <li key={key} className={`flex items-center gap-1  ${criteria[key] ? "text-emerald-600" : "text-rose-600"}`}>
                    <IconCheck isMet={criteria[key]} /> {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isOtpSent && (
            <div className="mb-3 animate-fade-in" role="region" aria-label="OTP Verification">
              <label htmlFor="otp" className="block text-sm-text  text-text-dark mb-2">
                Enter the OTP sent to the admin email.
              </label>
              <input
                type="text"
                inputMode="numeric" 
                pattern="[0-9]*"  
                id="otp"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-0 focus:border-app-dark outline-none text-center tracking-widest text-lg font-medium  transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="000000"
                value={enteredOtp}
                onChange={handleOtpChange}
                required
                maxLength={6}
                disabled={isLoading}
                aria-required="true"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isPasswordValid || isLoading}
            className={`w-full mb-2 bg-app-dark text-white  text-sm-text px-4 py-3 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-app-dark/30 ${
              (!isPasswordValid || isLoading) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 shadow-md active:scale-95"
            }`}
          >
            {isLoading ? "Processing..." : (isOtpSent ? "Complete Signup" : "Send OTP Verification")}
          </button>

          {isOtpSent && (
            <div className="text-center mb-1">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="text-micro text-text-dark/70  hover:text-text-dark focus:text-text-dark transition-colors outline-none rounded  disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        <footer className="mt-4 text-center flex gap-3 justify-center border-t border-slate-100 pt-5">
          <p className="text-micro text-text-dark/70 ">
            Already have an account?{" "}
            <Link
              to={isLoading ? "#" : "/login"}
              className={`text-micro text-blue-600  no-underline rounded focus:outline-none focus:ring-0  ${isLoading ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:text-blue-800"}`}
            >
              Login
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}