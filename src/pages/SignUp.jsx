import emailjs from "@emailjs/browser";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { auth } from "../services/firebase";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck } from "../components/icons";

// ----------------------------------------------------------------------
// CONSTANTS & CONFIGURATION
// ----------------------------------------------------------------------

const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function SignUp() {
  const navigate = useNavigate();
  const passwordInputRef = useRef(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [popup, setPopup] = useState({ message: "", type: "info" });

  // Logic State
  const [generatedOtp, setGeneratedOtp] = useState("");
  
  // Derived State: Evaluated on every render securely without useEffect loops
  const criteria = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_,.?":{}|<>]/.test(password),
  };

  const passwordsMatch = password === confirmPassword && confirmPassword !== "";
  const isPasswordValid = Object.values(criteria).every(Boolean) && passwordsMatch;

  // --- HANDLERS ---

  const triggerPopup = useCallback((message, type = "info") => {
    setPopup({ message, type });
  }, []);

  const handleClosePopup = useCallback(() => {
    setPopup({ message: "", type: "info" });
  }, []);

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus(); 
    }
  };

  const handleCancel = () => {
    setIsOtpSent(false);
    setEnteredOtp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setGeneratedOtp("");
    setIsLoading(false);
  };

  // --- SECURE OTP LOGIC ---

  const generateSecureOTP = () => {
    // Cryptographically secure random number generation (prevents Math.random predictability)
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return ((array[0] % 900000) + 100000).toString(); // Ensures exact 6 digits
  };

  const fetchAdminEmail = async () => {
    const db = getDatabase();
    const snapshot = await get(ref(db, "admin_information/admin_email_otp"));
    if (snapshot.exists() && snapshot.val()) return snapshot.val();
    throw new Error("Admin authorization configuration is missing.");
  };

  const executeOtpSending = async (sanitizedEmail) => {
    if (!EMAILJS_CONFIG.SERVICE_ID || !EMAILJS_CONFIG.TEMPLATE_ID || !EMAILJS_CONFIG.PUBLIC_KEY) {
      throw new Error("Email service configuration is missing.");
    }

    const adminEmail = await fetchAdminEmail();
    const otp = generateSecureOTP();
    setGeneratedOtp(otp);

    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      { email: adminEmail, otp, user_email: sanitizedEmail },
      EMAILJS_CONFIG.PUBLIC_KEY
    );

    setIsOtpSent(true);
    triggerPopup("Security code sent to admin email.", "success");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submission
    
    const sanitizedEmail = email.trim();
    
    // Client-side pre-validation to save API calls
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      triggerPopup("Please enter a valid email address.", "error");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Send OTP if not sent
      if (!isOtpSent) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, sanitizedEmail);
          if (methods.length > 0) {
            triggerPopup("This email is already registered. Please log in.", "error");
            setIsLoading(false);
            return;
          }
        } catch (fetchErr) {
          // Firebase Identity Platform "Email Enumeration Protection" restricts this call.
          // If it fails for that reason, we proceed assuming email is clear to maintain security flow.
          if (fetchErr.code !== 'auth/operation-not-allowed') {
            throw fetchErr;
          }
        }

        await executeOtpSending(sanitizedEmail);
        setIsLoading(false);
        return;
      }

      // Step 2: Verify OTP securely (Constant-time comparison is ideal backend, but simple check front-end)
      if (enteredOtp !== generatedOtp) {
        triggerPopup("Invalid OTP. Please check the code and try again.", "error");
        setIsLoading(false);
        return;
      }

      // Step 3: Create User
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      await sendEmailVerification(userCredential.user);

      triggerPopup("Signup successful! Verification email sent.", "success");
      handleCancel(); // Reset form

    } catch (error) {
      console.error("Signup Process Error:", error);
      setIsLoading(false);

      const errorMessages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "The provided email address is invalid.",
        "auth/weak-password": "The password provided is too weak.",
        "auth/network-request-failed": "Network error. Please check your connection.",
        "auth/too-many-requests": "Too many attempts. Please try again later."
      };

      triggerPopup(errorMessages[error.code] || error.message || "An unexpected error occurred.", "error");
    }
  };

  // --- RENDER ---

  return (
    <div className="flex justify-center items-center w-full min-h-screen p-3 bg-white overflow-y-auto">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={handleClosePopup}
      />

      <div className="flex flex-col w-full max-w-[350px] p-3 bg-white mt-[-100px]">
        <div className="flex justify-center items-center w-full mb-3">
          <div className="flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Lola Fe's Laundry Logo"
              className="max-w-full max-h-full w-12 h-12"
            />
          </div>
        </div>

        <h3 className="text-center text-h1 font-bold text-text-dark mb-2">Create Admin Account</h3>
        <p className="text-center text-text-dark/70 text-base-text mb-4">Sign up to continue</p>

        <form onSubmit={handleSignup} noValidate>
          
          <div className="mb-3 text-start w-full">
            <label htmlFor="email" className="block text-text-dark text-sm-text mb-1">Admin Email</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark">
                <IconAtSymbol className="w-4 h-4" />
              </span>
              <input
                onKeyDown={handleEmailKeyDown}  
                enterKeyHint="next"
                type="email"
                id="email"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:ring-app-dark focus:border-app-dark transition-all disabled:opacity-50 disabled:bg-slate-50"
                placeholder="Enter your Email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
            </div>
          </div>

          <div className="mb-3 text-start w-full">
            <label htmlFor="password" className="block text-text-dark text-sm-text mb-1">Password</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                ref={passwordInputRef}
                id="password"
                className="w-full pl-10 pr-[40px] py-2.5 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:ring-app-dark focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50"
                placeholder="Enter your password"
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute top-1/2 right-[10px] -translate-y-1/2 flex items-center justify-center w-4 h-4 p-0 bg-transparent border-none cursor-pointer text-text-dark/50 hover:text-text-dark transition-colors disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                disabled={isLoading}
              >
                {showPassword ? <IconEyeClosed className="w-4 h-4" /> : <IconEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mb-3 text-start w-full">
            <label htmlFor="confirmPassword" className="block text-text-dark text-sm-text mb-1">Confirm Password</label>
            <div className="relative flex items-center w-full">
              <span className="absolute left-3 text-text-dark">
                <IconLock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className="w-full pl-10 pr-[40px] py-2.5 border border-slate-300 rounded-lg text-text-dark text-sm-text outline-none focus:ring-0 focus:ring-app-dark focus:border-app-dark transition-all box-border disabled:opacity-50 disabled:bg-slate-50"
                placeholder="Re-enter your password"
                required
                autoComplete="off"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  return false;
                }}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                className="absolute top-1/2 right-[10px] -translate-y-1/2 flex items-center justify-center w-4 h-4 p-0 bg-transparent border-none cursor-pointer text-text-dark/50 hover:text-text-dark transition-colors disabled:opacity-50"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
                disabled={isLoading}
              >
                {showConfirmPassword ? <IconEyeClosed className="w-4 h-4" /> : <IconEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>      

          <div className="mb-1">
            {confirmPassword && (
              <ul className="space-y-1 text-micro">
                <li className={`flex items-center gap-1 ${passwordsMatch ? "text-emerald-600" : "text-rose-600"}`}>
                  <IconCheck isMet={passwordsMatch} /> Password match
                </li>
              </ul>
            )}
          </div>

          <div className="mb-4">
            {password && (
              <ul className="space-y-1 text-micro">
                {[
                  { key: "length", text: "At least 6 characters" },
                  { key: "uppercase", text: "At least 1 uppercase letter" },
                  { key: "number", text: "At least 1 number" },
                  { key: "special", text: "At least 1 special character" },
                ].map(({ key, text }) => (
                  <li key={key} className={`flex items-center gap-1 ${criteria[key] ? "text-emerald-600" : "text-rose-600"}`}>
                    <IconCheck isMet={criteria[key]} /> {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isOtpSent && (
            <div className="mb-3 animate-fade-in">
              <label htmlFor="otp" className="block text-sm-text font-normal text-text-dark mb-2">
                Enter the OTP sent to the admin email.
              </label>
              <input
                type="text"
                inputMode="numeric" 
                pattern="[0-9]*"  
                id="otp"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-0 focus:ring-app-dark focus:border-app-dark outline-none text-center tracking-widest text-lg font-bold transition-all disabled:opacity-50 disabled:bg-slate-50"
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/\D/g, "");
                  setEnteredOtp(onlyNumbers);
                }}
                required
                maxLength={6}
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isPasswordValid || isLoading}
            className={`w-full mb-2 bg-app-dark text-white font-medium text-sm-text px-4 py-3 rounded-lg cursor-pointer transition-opacity ${
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
                className="text-micro text-text-dark/70 font-normal hover:text-text-dark bg-transparent border-none cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        <div className="mt-1 text-center flex gap-3 justify-center">
          <p className="text-micro text-text-dark/70">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              disabled={isLoading}
              className="text-micro text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer font-medium p-0 disabled:opacity-50"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}