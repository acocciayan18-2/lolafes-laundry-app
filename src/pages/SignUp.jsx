import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { useSignupStore } from "../store/auth/useSignupStore";
import { useSettingsStore } from "../store/settings/useSettingsStore"; 
import { SystemPinModal } from "../components/security/SystemPinModal"; 
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck, IconUsers } from "../components/icons";

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

  // --- GATEKEEPER STATE ---
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const systemConfig = useSettingsStore((state) => state.systemConfig);

  // --- LOCAL FORM STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("STAFF"); // ✨ Added Role State (Default to STAFF)
  const [enteredOtp, setEnteredOtp] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- LIFECYCLE ---
  useEffect(() => {
    return () => resetFlow();
  }, [resetFlow]);

  // --- PIN VERIFICATION HANDLER ---
  const handlePinVerification = useCallback((enteredPin) => {
    setIsVerifying(true);
    setPinError("");

    setTimeout(() => {
      if (enteredPin !== systemConfig?.signup_pin) {
        setPinError("Invalid PIN. Admin access required.");
        setIsVerifying(false);
        setPinInput(""); 
        return;
      }

      setIsPinVerified(true);
      setIsVerifying(false);
    }, 500); 
  }, [systemConfig?.signup_pin]); 

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
    setRole("STAFF");
  }, [resetFlow]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!isPasswordValid) {
      triggerPopup("Please ensure passwords match and meet all security criteria.", "error");
      return;
    }

    if (!isOtpSent) {
      await sendOtp(email);
    } else {
      if (enteredOtp.length !== 6) {
        triggerPopup("Please enter the complete 6-digit OTP code.", "error");
        return;
      }

      // ✨ Updated to include 'role' in the signup call
      await verifyAndSignup(email, password, enteredOtp, role, () => {
        setTimeout(() => navigate("/login"), 1500);
      });
    }
  }, [isLoading, isOtpSent, isPasswordValid, email, password, enteredOtp, role, sendOtp, verifyAndSignup, navigate, triggerPopup]);

  const handleOtpChange = useCallback((e) => {
    const onlyNumbers = e.target.value.replace(/\D/g, "");
    setEnteredOtp(onlyNumbers);
  }, []);

  if (!isPinVerified) {
    return (
      <main className="min-h-screen bg-app-light flex items-center justify-center relative overflow-hidden">
        
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="absolute top-6 left-6 z-[120] flex items-center gap-2 text-micro  text-text-dark/80    px-4 py-2 rounded-xl  transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark active:scale-95"
          aria-label="Return to login page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Login
        </button>

        <SystemPinModal 
          isOpen={true}
          hideClose={true} 
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

  return (
    <div className="flex justify-center items-center w-full min-h-screen p-3 bg-app-light overflow-y-auto animate-fade-in">
      <LoginPopup message={popup.message} type={popup.type} onClose={clearPopup} />

      <main className="flex flex-col w-full max-w-[350px] p-3 bg-app-light">
        <header className="flex justify-center items-center w-full mb-3 flex-col">
          <div className="flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden mb-2 shadow-sm">
            <img src="/images/lolafeslaundry-logo-transparent.png" alt="Logo" className="w-12 h-12 object-contain" />
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
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:border-app-dark transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                disabled={isOtpSent || isLoading}
              />
            </div>
          </div>

          {/* ✨ Added Role Selection Dropdown */}
          <div className="mb-3 text-start w-full">
            <label htmlFor="role" className="block text-text-dark/80 text-sm-text mb-1 ">Account Role</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark" aria-hidden="true">
                <IconUsers className="w-4 h-4" />
              </span>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isOtpSent || isLoading}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:border-app-dark transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm bg-white appearance-none cursor-pointer"
              >
                <option value="STAFF">Staff</option>
                <option value="OWNER">Owner</option>
              </select>
              {/* Custom Chevron for select */}
              <div className="absolute right-3 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
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
                className="w-full pl-10 pr-[40px] py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Enter your password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute right-3 p-1 rounded hover:bg-slate-100 transition-colors focus:ring-0 outline-none opacity-80 disabled:opacity-50"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showPassword ? <IconEyeClosed className="w-4 h-4 opacity-80" /> : <IconEyeOpen className="w-4 h-4" />}
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
                className="w-full pl-10 pr-[40px] py-3 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="Re-enter your password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute right-3 p-1 rounded hover:bg-slate-100 transition-colors focus:ring-0 outline-none opacity-80 disabled:opacity-50"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <IconEyeClosed className="w-4 h-4" /> : <IconEyeOpen className="w-4 h-4" />}
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
            <div className="mb-3 animate-fade-in" role="region">
              <label htmlFor="otp" className="block text-sm-text text-text-dark mb-2">
                Enter the OTP sent to the admin email.
              </label>
              <input
                type="text"
                inputMode="numeric" 
                pattern="[0-9]*"  
                id="otp"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-0 focus:border-app-dark outline-none text-center tracking-widest text-lg font-medium transition-all disabled:opacity-50 disabled:bg-slate-50 shadow-sm"
                placeholder="000000"
                value={enteredOtp}
                onChange={handleOtpChange}
                required
                maxLength={6}
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isPasswordValid || isLoading}
            className={`w-full mb-2 bg-app-dark text-white text-sm-text px-4 py-3 rounded-lg cursor-pointer transition-all ${
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
                className="text-micro text-text-dark/70 hover:text-text-dark transition-colors outline-none"
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
              className={`text-micro text-blue-600 no-underline ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:text-blue-800"}`}
            >
              Login
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}