import { create } from "zustand";
import { auth } from "../../services/firebase";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";
import emailjs from "@emailjs/browser";

const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
};

// --- SECURITY UTILITIES ---

/**
 * Generates a cryptographically secure 6-digit OTP.
 * @returns {string} 6-digit numeric string.
 */
const generateSecureOTP = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return ((array[0] % 900000) + 100000).toString(); 
};

/**
 * Hashes the OTP using SHA-256 so the raw value never sits in readable memory.
 * @param {string} otp 
 * @returns {Promise<string>} Hexadecimal hash.
 */
const hashOTP = async (otp) => {
  const msgBuffer = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * @class SignupService
 * @description Encapsulates external service interactions and error parsing.
 */
class SignupService {
  static parseError(error) {
    const errorMap = {
      "auth/email-already-in-use": "This email is already registered.",
      "auth/invalid-email": "The provided email address is invalid.",
      "auth/weak-password": "Password does not meet strict security standards.",
      "auth/network-request-failed": "Network error. Please check your connection.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/operation-not-allowed": "Operation not allowed. Please contact support.",
    };
    return errorMap[error?.code] || error?.message || "An unexpected error occurred.";
  }

  static async getAdminEmail() {
    const db = getDatabase();
    const snapshot = await get(ref(db, "admin_information/admin_email_otp"));
    if (snapshot.exists() && snapshot.val()) return snapshot.val();
    throw new Error("Admin authorization configuration is missing.");
  }

  static isValidEmail(email) {
    if (!email || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
}

export const useSignupStore = create((set, get) => ({
  // --- STATE ---
  isLoading: false,
  isOtpSent: false,
  
  // Security State 
  otpHash: null,
  otpExpiresAt: null,
  otpCooldownUntil: null,
  
  // UI State
  popup: { message: "", type: "info" },
  popupTimeoutId: null, 

  // --- ACTIONS ---

  triggerPopup: (message, type = "info") => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);

    const id = setTimeout(() => {
      set({ popup: { message: "", type: "info" }, popupTimeoutId: null });
    }, 4000);

    set({ popup: { message, type }, popupTimeoutId: id });
  },

  clearPopup: () => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);
    set({ popup: { message: "", type: "info" }, popupTimeoutId: null });
  },

  /**
   * Resets the entire signup flow. Crucial for cleanup on component unmount.
   */
  resetFlow: () => set({ 
    isOtpSent: false, 
    otpHash: null, 
    otpExpiresAt: null, 
    isLoading: false 
  }),

  sendOtp: async (email) => {
    const state = get();
    if (state.isLoading) return false;

    const cleanEmail = email?.trim() || "";

    if (!SignupService.isValidEmail(cleanEmail)) {
      state.triggerPopup("Please enter a valid email address.", "error");
      return false;
    }

    if (state.otpCooldownUntil && Date.now() < state.otpCooldownUntil) {
      const waitTime = Math.ceil((state.otpCooldownUntil - Date.now()) / 1000);
      state.triggerPopup(`Please wait ${waitTime}s before requesting a new OTP.`, "error");
      return false;
    }

    if (!EMAILJS_CONFIG.SERVICE_ID || !EMAILJS_CONFIG.TEMPLATE_ID || !EMAILJS_CONFIG.PUBLIC_KEY) {
      state.triggerPopup("System configuration error. Contact support.", "error");
      return false;
    }

    set({ isLoading: true });

    try {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        if (methods.length > 0) {
          get().triggerPopup("This email is already registered. Please log in.", "error");
          set({ isLoading: false });
          return false;
        }
      } catch (fetchErr) {
        if (fetchErr.code !== 'auth/operation-not-allowed') throw fetchErr;
      }

      const adminEmail = await SignupService.getAdminEmail();
      const otp = generateSecureOTP();
      const hashedOtp = await hashOTP(otp); 

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        { email: adminEmail, otp, user_email: cleanEmail },
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      set({ 
        isOtpSent: true, 
        otpHash: hashedOtp, 
        otpExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes 
        otpCooldownUntil: Date.now() + 60 * 1000,  // 60 seconds
        isLoading: false 
      });
      
      get().triggerPopup("Security code sent to admin email.", "success");
      return true;

    } catch (err) {
      console.error("OTP Error:", err.code || err.message);
      get().triggerPopup(`System Error: ${SignupService.parseError(err)}`, "error");
      set({ isLoading: false });
      return false;
    }
  },

  verifyAndSignup: async (email, password, enteredOtp, onSuccessCallback) => {
    const state = get();
    if (state.isLoading) return false;

    set({ isLoading: true });
    try {
      if (!state.otpExpiresAt || Date.now() > state.otpExpiresAt) {
        get().triggerPopup("OTP has expired. Please request a new one.", "error");
        set({ isLoading: false, isOtpSent: false, otpHash: null });
        return false;
      }

      const hashedInput = await hashOTP(enteredOtp);
      if (hashedInput !== state.otpHash) {
        get().triggerPopup("Invalid OTP. Please check the code and try again.", "error");
        set({ isLoading: false });
        return false;
      }

      const cleanEmail = email.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await sendEmailVerification(userCredential.user);

      get().triggerPopup("Signup successful! Verification email sent.", "success");
      get().resetFlow();
      
      if (typeof onSuccessCallback === 'function') onSuccessCallback();
      return true;

    } catch (error) {
      console.error("Signup Error:", error.code || error.message);
      get().triggerPopup(`${SignupService.parseError(error)}`, "error");
      set({ isLoading: false });
      return false;
    }
  }
}));