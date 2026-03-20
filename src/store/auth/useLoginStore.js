import { create } from "zustand";
import { auth } from "../../services/firebase";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

/**
 * @namespace AuthHelper
 * @description Encapsulated security and validation utilities for authentication.
 */
const AuthHelper = {
  /**
   * Safely maps Firebase auth errors to user-friendly, non-exposing messages.
   * O(1) lookup complexity.
   * @param {Object} error - The Firebase error object.
   * @returns {string} Sanitized error message.
   */
  parseError(error) {
    const errorMap = {
      "auth/invalid-email": "The provided email address is invalid.",
      "auth/user-disabled": "This account has been suspended. Please contact support.",
      "auth/invalid-credential": "Invalid email or password combination.",
      "auth/too-many-requests": "Access temporarily locked due to too many failed attempts. Try again later.",
      "auth/network-request-failed": "Network connection error. Please check your internet and try again.",
    };
    return errorMap[error?.code] || "An unexpected error occurred during authentication.";
  },

  /**
   * Strictly validates email format to prevent malformed payload injections.
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    if (!email || email.length > 254) return false; // RFC 5321 length limit
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }
};

export const useLoginStore = create((set, get) => ({
  // --- STATE ---
  isLoginLoading: false,
  isResetLoading: false,
  popup: { message: "", type: "" },
  popupTimeoutId: null,

  // --- ACTIONS ---
  
  /**
   * Triggers a global notification popup with auto-dismissal.
   * @param {string} message - The text to display.
   * @param {'success'|'error'|'info'} type - The severity type.
   */
  triggerPopup: (message, type) => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);

    const id = setTimeout(() => {
      set({ popup: { message: "", type: "" }, popupTimeoutId: null });
    }, 4000);

    set({ popup: { message, type }, popupTimeoutId: id });
  },

  /**
   * Manually clears the active popup and its timeout.
   */
  clearPopup: () => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);
    set({ popup: { message: "", type: "" }, popupTimeoutId: null });
  },

  /**
   * Authenticates the user securely with Firebase.
   * @param {string} email 
   * @param {string} password 
   * @param {Function} navigate - React Router navigation function
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  loginUser: async (email, password, navigate) => {
    const state = get();
    if (state.isLoginLoading) return false;

    const cleanEmail = email?.trim() || "";

    if (!AuthHelper.isValidEmail(cleanEmail) || !password) {
      state.triggerPopup("Please provide a valid email and password.", "error");
      return false;
    }

    set({ isLoginLoading: true });
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        get().triggerPopup("Access Denied: Please verify your email first.", "error");
        await signOut(auth); 
        return false; 
      }

      get().triggerPopup("Login successful!", "success");
      
      setTimeout(() => {
        navigate("/main");
        set({ isLoginLoading: false }); 
      }, 500);
      
      return true;

    } catch (error) {
      console.error("Auth Error:", error.code); // Log code, not full object for security
      get().triggerPopup(AuthHelper.parseError(error), "error");
      return false;
    } finally {
      // Ensure loading state resets if navigation doesn't occur
      if (!auth.currentUser?.emailVerified) {
        set({ isLoginLoading: false });
      }
    }
  },

  /**
   * Sends a secure password reset link.
   * @param {string} email 
   * @param {Function} onSuccessCallback 
   */
  resetPassword: async (email, onSuccessCallback) => {
    const state = get();
    if (state.isResetLoading) return;

    const cleanEmail = email?.trim() || "";

    if (!AuthHelper.isValidEmail(cleanEmail)) {
      state.triggerPopup("Please enter a valid email address.", "error");
      return;
    }

    set({ isResetLoading: true });
    
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      get().triggerPopup("Reset link sent! Check your email inbox.", "success");
      if (typeof onSuccessCallback === 'function') onSuccessCallback();
    } catch (error) {
      get().triggerPopup(AuthHelper.parseError(error), "error");
    } finally {
      set({ isResetLoading: false });
    }
  },
}));