import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LoginPopup } from "../modal/LoginPopup";
import { useSignupStore } from "../store/auth/useSignupStore"; // Import the new store
import "../style/signup.css";
import { IconAtSymbol, IconLock, IconEyeOpen, IconEyeClosed, IconCheck } from "../components/icons";

export default function SignUp() {
  const navigate = useNavigate();

  // --- GLOBAL STORE ---
  const { 
    isLoading, 
    isOtpSent, 
    popup, 
    clearPopup, 
    sendOtp, 
    verifyAndSignup, 
    resetFlow 
  } = useSignupStore();

  // --- LOCAL FORM STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- REFS FOR ACCESSIBILITY ---
  const passwordInputRef = useRef(null);

  // --- PERFORMANCE: Memoized Validation ---
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
  const handleEmailKeyDown = (e) => {
    // Intercept Enter key to focus password
    if (e.key === 'Enter') {
      e.preventDefault(); 
      passwordInputRef.current?.focus();
    }
  };

  const handleCancel = () => {
    resetFlow();
    setEnteredOtp("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!isOtpSent) {
      await sendOtp(email);
    } else {
      await verifyAndSignup(email, password, enteredOtp, () => {
        handleCancel();
        setTimeout(() => navigate("/login"), 1500);
      });
    }
  };

  return (
    <div className="signup-container">
      <LoginPopup
        message={popup.message}
        type={popup.type}
        onClose={clearPopup}
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

        <form onSubmit={handleSignup} noValidate>
          
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
                onKeyDown={handleEmailKeyDown} // Added KeyDown Listener
                disabled={isOtpSent || isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-2 text-start">
            <label htmlFor="password" className="form-label text-text-dark">Password</label>
            <div className="inputForm pwd-signup-con">
              <IconLock/>
              <input
                ref={passwordInputRef} // Attached Ref Here
                type={showPassword ? "text" : "password"}
                id="password"
                className="input"
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
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
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isOtpSent || isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
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
                  <IconCheck isMet={passwordsMatch} /> Passwords match
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3  focus:ring-1 focus:ring-app-dark focus:outline-none text-center tracking-widest text-lg !font-bold"
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))} // Strips non-digits
                required
                maxLength={6}
                autoFocus // Auto focuses once OTP field appears
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
              type="button"
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