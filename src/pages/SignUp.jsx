import emailjs from "@emailjs/browser";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { auth } from "../services/firebase";
import "../style/signup.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck } from "../components/icons";

// ----------------------------------------------------------------------
// CONSTANTS & ICONS
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
  
  // Password Criteria State
  const [criteria, setCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  // Derived State
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";
  const isPasswordValid = Object.values(criteria).every(Boolean) && passwordsMatch;

  // --- HANDLERS ---

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

  const handleCancel = () => {
    setIsOtpSent(false);
    setEnteredOtp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setCriteria({ length: false, uppercase: false, number: false, special: false });
    setIsLoading(false);
  };

  // --- FIREBASE & OTP LOGIC ---

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
      triggerPopup(`Failed to send OTP: ${err.message}`, "error");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Send OTP if not sent
      if (!isOtpSent) {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          triggerPopup("This email is already registered. Please log in.", "error");
          setIsLoading(false);
          return;
        }
        await executeOtpSending();
        setIsLoading(false);
        return;
      }

      // Step 2: Verify OTP
      if (enteredOtp !== generatedOtp) {
        triggerPopup("Invalid OTP. Please try again.", "error");
        setIsLoading(false);
        return;
      }

      // Step 3: Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      triggerPopup("Signup successful! Verification email sent.", "success");
      handleCancel(); // Reset form

    } catch (error) {
      console.error("Signup Process Error:", error);
      setIsLoading(false);

      const errorMessages = {
        "auth/email-already-in-use": "Email is already in use.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password is too weak.",
        "auth/network-request-failed": "Network error. Check connection.",
      };

      triggerPopup(errorMessages[error.code] || error.message, "error");
    }
  };

  // --- RENDER ---

  return (
    <div className="signup-container">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "info" })}
      />

      <div className="signup-card">
        {/* Logo */}
        <div className="flex justify-center items-center w-full">
          <div className="mb-3 flex justify-center items-center w-14 h-14 bg-app-dark rounded-xl overflow-hidden">
            <img
              src="/images/lolafeslaundry-logo-transparent.png"
              alt="Lola Fe's Laundry Logo"
              className="max-w-full max-h-full w-12 h-12"
            />
          </div>
        </div>

        <h3 className="text-center text-3xl font-extrabold text-gray-800 mb-1">Create Admin Account</h3>
        <p className="text-center !text-text-dark/70 mb-6">Sign up with a secure password and OTP verification.</p>

        <form onSubmit={handleSignup}>
          
          {/* Email Field */}
          <div className="mb-3 text-start">
            <label htmlFor="email" className="form-label text-text-dark">Admin Email</label>
            <div className="inputForm">
              <IconAtSymbol/>
              <input
                type="email"
                id="email"
                className="input"
                placeholder="Enter your Email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isOtpSent}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-2 text-start">
            <label htmlFor="password" className="form-label text-text-dark">Password</label>
            <div className="inputForm pwd-signup-con">
              <IconLock/>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="input"
                placeholder="Enter your password"
                required
                autoComplete="off"
                value={password}
                onChange={handlePasswordChange}
                disabled={isOtpSent}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IconEyeClosed /> : <IconEyeOpen />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="mb-2 text-start">
            <label htmlFor="confirmPassword" className="form-label text-text-dark">Confirm Password</label>
            <div className="inputForm pwd-signup-con">
              <IconLock/>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                className="input"
                placeholder="Re-enter your password"
                required
                autoComplete="off"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isOtpSent}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <IconEyeClosed /> : <IconEyeOpen />}
              </button>
            </div>
          </div>

          {/* Matching Indicator */}
          <div className="mb-4">
            {confirmPassword && (
              <ul className="space-y-1 text-xs">
                <li style={{ color: passwordsMatch ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
                  {passwordsMatch ? <IconCheck isMet={true} /> : <IconCheck isMet={false} />} Passwords match
                </li>
              </ul>
            )}
          </div>

          {/* Password Criteria List */}
          <div className="mb-4">
            {password && (
              <ul className="space-y-1 text-xs">
  {[
    { key: "length", text: "At least 6 characters" },
    { key: "uppercase", text: "At least 1 uppercase letter" },
    { key: "number", text: "At least 1 number" },
    { key: "special", text: "At least 1 special character" },
  ].map(({ key, text }) => (
    <li key={key} style={{ color: criteria[key] ? "#198754" : "#dc3545" }} className="flex items-center gap-1">
      <IconCheck isMet={criteria[key]} /> {text}
    </li>
  ))}
</ul>
            )}
          </div>

          {/* OTP Field */}
          {isOtpSent && (
            <div className="mb-2 animate-fade-in">
              <label htmlFor="otp" className="block text-sm font-normal text-text-dark mb-3">
                Enter the OTP sent to the registered admin email.
              </label>
              <input
                type="text"
                id="otp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-1 focus:ring-app-dark focus:outline-none text-center tracking-widest text-lg !font-bold"
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                required
                maxLength={6}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full mb-2 bg-app-dark text-white font-medium py-2 rounded-lg shadow transition-all ${
              !isPasswordValid || isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-app-dark/95"
            }`}
            disabled={!isPasswordValid || isLoading}
          >
            {isLoading ? "Processing..." : (isOtpSent ? "Complete Signup" : "Send OTP Verification")}
          </button>

          {/* Cancel Button */}
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

        {/* Footer */}
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