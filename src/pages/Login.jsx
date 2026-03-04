import { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ForgotPassword from "../modal/ForgotPassword";
import { LoginPopup } from "../modal/LoginPopup";
import { useLoginStore } from "../store/auth/useLoginStore"; // Import the new store
import "../style/login.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed } from "../components/icons";

export default function Login() {
  const navigate = useNavigate();

  // --- GLOBAL STORE ---
  const { 
    isLoginLoading, 
    isResetLoading, 
    popup, 
    clearPopup, 
    loginUser, 
    resetPassword 
  } = useLoginStore();

  // --- LOCAL UI STATE ---
  // We keep typed input local to prevent the whole app from re-rendering on every keystroke
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // --- REFS FOR ACCESSIBILITY ---
  const passwordInputRef = useRef(null);

  // --- VALIDATION ---
  const isFormValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(loginEmail.trim()) && loginPassword.length >= 6;
  }, [loginEmail, loginPassword]);

  // --- HANDLERS ---
  const handleEmailKeyDown = (e) => {
    // Intercept the "Enter" key to focus password instead of submitting
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoginLoading || !isFormValid) return;

    // Call the store. If login fails, it returns false so we can clear the password securely.
    const isSuccess = await loginUser(loginEmail, loginPassword, navigate);
    if (!isSuccess) {
      setLoginPassword(""); 
    }
  };

  const handleForgotPassword = () => {
    resetPassword(resetEmail, () => {
      // Callback executes only on success
      setShowForgotPopup(false);
      setResetEmail("");
    });
  };

  return (
    <div className="login-container">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={clearPopup}
      />

      <div className="login-card">
        <div className="flex justify-center items-center w-full">
          <div className="mb-3 flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Lola Fe's Laundry Logo"
              className="max-w-full max-h-full w-12 h-12"
            />
          </div>
        </div>

        <h3 className="text-center text-3xl font-extrabold text-text-dark mb-1">
          Welcome to Lola Fe's Laundry&nbsp;Shop
        </h3>
        <p className="text-center !text-text-dark/70">Log in to continue</p>

        <form onSubmit={handleLogin} noValidate>
          <div className="mb-3 text-start">
            <label htmlFor="login-email" className="form-label text-text-dark">Email</label>
            <div className="inputForm mb-3 text-start">
              <IconAtSymbol/>
              <input
                type="email"
                id="login-email"
                className="input text-text-dark"
                placeholder="Enter your Email"
                required
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown} // Added KeyDown Listener
                disabled={isLoginLoading}
              />
            </div>
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="login-password" className="form-label text-text-dark">Password</label>
            <div className="inputForm pwd-login-con">
              <IconLock/>
              <input
                ref={passwordInputRef} // Attached the Ref here
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="input text-text-dark"
                placeholder="********"
                required
                autoComplete="current-password"
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
                className="text-xs text-blue-600 hover:text-blue-800 bg-transparent border-none cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoginLoading || !isFormValid}
            className={`w-full bg-app-dark text-white font-medium px-4 py-2 rounded-lg shadow cursor-pointer transition-opacity ${
              (isLoginLoading || !isFormValid) ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 shadow-md active:scale-95"
            }`}
          >
            {isLoginLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="footer-links mt-3 d-flex gap-3">
          <p className="text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-sm text-blue-600 hover:text-blue-800 no-underline">
              Sign up
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