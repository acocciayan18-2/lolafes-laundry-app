import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../services/firebase";
import emailjs from "@emailjs/browser";
import { LoginPopup } from "../modal/LoginPopup";
import "../style/signup.css";

// ----------------------------------------------------------------------
// CONSTANTS & ICONS
// ----------------------------------------------------------------------

const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
};

const SIGNUP_ICONS = {
  atSymbol: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.4rem" height="1.4rem" fill="currentColor" className="bi bi-at" viewBox="0 0 16 16">
      <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914" />
    </svg>
  ),
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.3rem" height="1.3rem" fill="currentColor" className="bi bi-lock" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4M4.5 7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7zM8 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3" />
    </svg>
  ),
  eyeOpen: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z" />
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0" />
    </svg>
  ),
  eyeClosed: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-eye-slash" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z" />
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829" />
      <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z" />
    </svg>
  ),
  check: (isMet) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1rem"
      height="1rem"
      viewBox="0 0 16 16"
      fill={isMet ? "#198754" : "#dc3545"} 
    >
      <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0" />
      <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z" />
    </svg>
  ),
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function SignUp() {
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Logic State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [popup, setPopup] = useState({ message: "", type: "info" });

  // Password Criteria
  const [criteria, setCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const triggerPopup = (message, type = "info") => {
    setPopup({ message, type });
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setCriteria({
      length: val.length >= 6,
      uppercase: /[A-Z]/.test(val),
      number: /\d/.test(val),
      special: /[!@#$%^&*()_,.?":{}|<>]/.test(val),
    });
  };

  // Reset all state to cancel signup process
  const handleCancel = () => {
    setIsOtpSent(false);
    setEnteredOtp("");
    setEmail("");
    setPassword("");
    setCriteria({
      length: false,
      uppercase: false,
      number: false,
      special: false,
    });
    setIsLoading(false);
  };

  const fetchAdminEmail = async () => {
    const db = getDatabase();
    const snapshot = await get(ref(db, "admin_information/admin_email_otp"));
    if (snapshot.exists()) return snapshot.val();
    throw new Error("Admin OTP email not found in database.");
  };

  const executeOtpSending = async () => {
    try {
      const adminEmail = await fetchAdminEmail();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        { email: adminEmail, otp },
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      setIsOtpSent(true);
      triggerPopup("OTP sent to admin email.", "success");
    } catch (err) {
      console.error(err);
      triggerPopup("Failed to send OTP (Network/Server Error): " + err.message, "error");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // -------------------------------------------------------
      // STEP 1: If OTP is NOT sent yet, Check Email & Send OTP
      // -------------------------------------------------------
      if (!isOtpSent) {
        
        // 1a. Check for duplicate email (Firebase)
        const methods = await fetchSignInMethodsForEmail(auth, email);
        
        if (methods.length > 0) {
          triggerPopup("This email is already registered. Please log in.", "error");
          setIsLoading(false);
          return; 
        }

        // 1b. If unique, proceed to send OTP
        await executeOtpSending();
        setIsLoading(false);
        return;
      }

      // -------------------------------------------------------
      // STEP 2: Verify OTP
      // -------------------------------------------------------
      if (enteredOtp !== generatedOtp) {
        triggerPopup("Invalid OTP. Please try again.", "error");
        setIsLoading(false);
        return;
      }

      // -------------------------------------------------------
      // STEP 3: Create User & Verify
      // -------------------------------------------------------
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      triggerPopup("Signup successful! Verification email sent.", "success");

      handleCancel(); // Reset form

    } catch (error) {
      console.error("Signup Process Error:", error);
      setIsLoading(false);

      // ✅ Specific Error Handling
      switch (error.code) {
        case "auth/email-already-in-use":
          triggerPopup("Email is already in use.", "error");
          break;
        case "auth/invalid-email":
          triggerPopup("Invalid email address.", "error");
          break;
        case "auth/weak-password":
          triggerPopup("Password is too weak.", "error");
          break;
        case "auth/network-request-failed":
          triggerPopup("Network error. Check connection.", "error");
          break;
        default:
          triggerPopup(error.message, "error");
      }
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
        {/* Logo */}
        <div className="flex justify-center items-center w-full mb-3">
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Logo"
              className="max-w-full max-h-full"
            />
          </div>
        </div>

        <h3 className="text-center text-3xl font-extrabold text-gray-800 mb-1">Create Admin Account</h3>
        <p className="text-center text-gray-600 mb-6">Sign up with a secure password and OTP verification.</p>

        <form onSubmit={handleSignup}>

          {/* Email Field */}
          <div className="mb-3 text-start">
            <label htmlFor="email" className="form-label">
              Admin Email
            </label>
            <div className="inputForm">
              {SIGNUP_ICONS.atSymbol}
              <input
                type="email"
                id="email"
                className="input"
                placeholder="Enter your Email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isOtpSent} // Lock email after OTP sent
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-2 text-start">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="inputForm pwd-signup-con">
              {SIGNUP_ICONS.lock}
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="input"
                placeholder="Enter your password"
                required
                autoComplete="off"
                value={password}
                onChange={handlePasswordChange}
                disabled={isOtpSent} // Lock password field BUT NOT toggle
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                // Removed disabled attribute so it works even if OTP is sent
              >
                {showPassword ? SIGNUP_ICONS.eyeClosed : SIGNUP_ICONS.eyeOpen}
              </button>
            </div>
          </div>

          {/* Password Criteria List */}
          <div className="mb-4">
            {password && (
              <ul className="space-y-1 text-xs">
                <li style={{ color: criteria.length ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
                  {SIGNUP_ICONS.check(criteria.length)} At least 6 characters
                </li>
                <li style={{ color: criteria.uppercase ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
                  {SIGNUP_ICONS.check(criteria.uppercase)} At least 1 uppercase letter
                </li>
                <li style={{ color: criteria.number ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
                  {SIGNUP_ICONS.check(criteria.number)} At least 1 number
                </li>
                <li style={{ color: criteria.special ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
                  {SIGNUP_ICONS.check(criteria.special)} At least 1 special character
                </li>
              </ul>
            )}
          </div>

          {/* OTP Field (Conditionally Rendered) */}
          {isOtpSent && (
            <div className="mb-2 animate-fade-in">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">Enter OTP sent to Admin Email</label>
              <input
                type="text"
                id="otp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-center tracking-widest text-lg"
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                required
                maxLength={6}
              />
            </div>
          )}

          

          {/* Action Button */}
          <button
            type="submit"
            className={`w-full mb-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium py-2 rounded-lg shadow transition-all ${
              !isPasswordValid || isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.01]"
            }`}
            disabled={!isPasswordValid || isLoading}
          >
            {isLoading ? "Processing..." : (isOtpSent ? "Complete Signup" : "Send OTP Verification")}
          </button>

          {/* Cancel Button (Visible only when OTP is sent) */}
          {isOtpSent && (
            <div className="text-center mb-1">
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

        </form>

        {/* Footer Link */}
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 bg-transparent border-none cursor-pointer"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}