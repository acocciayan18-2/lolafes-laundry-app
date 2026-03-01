import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { useState, useMemo, useCallback } from "react"; // Added useMemo/useCallback
import { Link, useNavigate } from "react-router-dom";
import ForgotPassword from "../modal/ForgotPassword";
import { LoginPopup } from "../modal/LoginPopup";
import { auth } from "../services/firebase";
import "../style/login.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed } from "../components/icons";

export default function Login() {
  const navigate = useNavigate();

  // --- STATE ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [popup, setPopup] = useState({ message: "", type: "" });
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  // --- 1. PERFORMANCE: Memoized Validation ---
  const isFormValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(loginEmail) && loginPassword.length >= 6; // Standard min length
  }, [loginEmail, loginPassword]);

  // --- 2. REUSABLE UI LOGIC ---
  const triggerPopup = useCallback((msg, type) => {
    setPopup({ message: msg, type });
    // Keep it empty after timeout if user hasn't clicked close
    setTimeout(() => setPopup({ message: "", type: "" }), 4000);
  }, []);

  // --- 3. FORGOT PASSWORD LOGIC ---
  const handleForgotPassword = async () => {
    if (!resetEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      triggerPopup("Please enter a valid email address.", "error");
      return;
    }
    
    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      triggerPopup("Reset link sent! Please check your inbox.", "success");
      setShowForgotPopup(false);
      setResetEmail("");
    } catch (error) {
      const errorMap = {
        "auth/user-not-found": "This email is not registered.",
        "auth/invalid-email": "Invalid email format.",
        "auth/too-many-requests": "Too many attempts. Try again later."
      };
      triggerPopup(errorMap[error.code] || "Error: " + error.message, "error");
    } finally {
      setIsResetLoading(false);
    }
  };

  // --- 4. SECURE LOGIN LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoginLoading || !isFormValid) return;

    setIsLoginLoading(true);

    try {
      // Set persistence first
      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const user = userCredential.user;

      // SECURITY: Force email verification
      if (!user.emailVerified) {
        triggerPopup("Access Denied: Please verify your email first.", "error");
        await signOut(auth); // Clear the session
        setIsLoginLoading(false);
        return;
      }

      triggerPopup("Successfully logged in! Redirecting...", "success");
      setTimeout(() => navigate("/main"), 1200);
      
    } catch (error) {
      console.error("Login attempt failed:", error.code);
      
      const errorMap = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/too-many-requests": "Security alert: Multiple failed attempts. Account temporarily locked."
      };

      triggerPopup(errorMap[error.code] || "Invalid email or password.", "error");
      setLoginPassword(""); // Clear sensitive field on failure
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "" })}
      />

      <div className="login-card">
        {/* LOGO */}
        <div className="flex justify-center items-center w-full mb-4">
          <div className="flex justify-center items-center w-16 h-16 bg-app-dark rounded-2xl shadow-lg overflow-hidden">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Lola Fe's Laundry Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>

        <h3 className="text-center text-2xl font-black text-text-dark mb-1 tracking-tight">
          Lola Fe's Laundry Shop
        </h3>
        <p className="text-center text-sm font-medium text-text-dark/60 mb-6 uppercase tracking-wider">Internal Portal</p>

        <form onSubmit={handleLogin} noValidate>
          <div className="mb-4 text-start">
            <label htmlFor="login-email" className="text-xs font-bold uppercase text-text-dark/50 ml-1 mb-1 block">Email Address</label>
            <div className="inputForm relative">
              <IconAtSymbol className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40" />
              <input
                type="email"
                id="login-email"
                className="input pl-10"
                placeholder="juan@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoginLoading}
              />
            </div>
          </div>

          <div className="mb-6 text-start">
            <label htmlFor="login-password" className="text-xs font-bold uppercase text-text-dark/50 ml-1 mb-1 block">Password</label>
            <div className="inputForm pwd-login-con relative">
              <IconLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark/40" />
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="input pl-10 pr-12"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoginLoading}
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
              </button>
            </div>

            <div className="text-end mt-2">
              <button
                type="button"
                onClick={() => setShowForgotPopup(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-transparent border-none transition-colors"
              >
                Reset Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoginLoading || !isFormValid}
            className={`w-full bg-app-dark text-white font-bold h-12 rounded-xl shadow-lg transition-all 
              ${(isLoginLoading || !isFormValid) 
                ? "opacity-30 cursor-not-allowed grayscale" 
                : "hover:bg-black hover:shadow-xl active:scale-[0.97]"
              }`}
          >
            {isLoginLoading ? (
               <div className="flex items-center justify-center gap-2">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 Authenticating...
               </div>
            ) : "Confirm & Login"}
          </button>
        </form>

        <div className="footer-links mt-6 text-center">
          <p className="text-sm font-medium text-text-dark/60">
            First time here?{" "}
            <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-800 no-underline transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>

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