import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ForgotPassword from "../modal/ForgotPassword";
import { LoginPopup } from "../modal/LoginPopup";
import { auth } from "../services/firebase";
import "../style/login.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed } from "../components/icons";



export default function Login() {
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");

  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  // --- VALIDATION LOGIC ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isFormValid = emailRegex.test(loginEmail) && loginPassword.length >= 1;

  const triggerPopup = (msg, type) => {
    setPopupMessage(msg);
    setPopupType(type);
    setTimeout(() => setPopupMessage(""), 3000);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      triggerPopup("Please enter your email.", "error");
      return;
    }
    try {
      setIsResetLoading(true);
      await sendPasswordResetEmail(auth, resetEmail);
      triggerPopup("Reset link sent! Check your email.", "success");
      setShowForgotPopup(false);
      setResetEmail("");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        triggerPopup("❌ This email is not registered.", "error");
      } else {
        triggerPopup("❌ " + error.message, "error");
      }
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoginLoading || !isFormValid) return;

    setIsLoginLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const user = userCredential.user;

      if (!user.emailVerified) {
        triggerPopup("Please verify your email before logging in.", "error");
        await auth.signOut();
        return;
      }

      triggerPopup("Login successful!", "success");
      setTimeout(() => navigate("/main"), 1000);
    } catch (error) {
      console.error(error);
      triggerPopup("Invalid email or password.", "error");
      setLoginPassword("");
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <div className="login-container">
      <LoginPopup
        message={popupMessage}
        type={popupType}
        onClose={() => setPopupMessage("")}
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

        <form onSubmit={handleLogin}>
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
                autoComplete="off"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="login-password" className="form-label text-text-dark">Password</label>
            <div className="inputForm pwd-login-con">
              <IconLock/>
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                className="input text-text-dark"
                placeholder="********"
                required
                autoComplete="off"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
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