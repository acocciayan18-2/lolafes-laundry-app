import { create } from "zustand";
import { auth } from "../../services/firebase";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// --- OOP Concept: Encapsulation of Helper Logic ---
const AuthHelper = {
  parseError(error) {
    // SECURITY: Avoid specific email/password errors to prevent enumeration attacks.
    // Firebase now groups "user-not-found" and "wrong-password" under 'invalid-credential'.
    const errorMap = {
      "auth/invalid-email": "The provided email address is invalid.",
      "auth/user-disabled": "This account has been suspended. Please contact support.",
      "auth/invalid-credential": "Invalid email or password combination.",
      "auth/too-many-requests": "Access temporarily locked due to too many failed attempts. Try again later.",
      "auth/network-request-failed": "Network connection error. Please check your internet and try again.",
    };
    return errorMap[error.code] || "An unexpected error occurred during authentication.";
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim());
  }
};

export const useLoginStore = create((set, get) => ({
  // --- STATE ---
  isLoginLoading: false,
  isResetLoading: false,
  popup: { message: "", type: "" },
  popupTimeoutId: null, // Tracks the timeout to prevent overlapping popups

  // --- ACTIONS ---
  triggerPopup: (message, type) => {
    const { popupTimeoutId } = get();
    
    // Clear any existing timeout so popups don't overwrite/hide each other prematurely
    if (popupTimeoutId) clearTimeout(popupTimeoutId);

    const id = setTimeout(() => {
      set({ popup: { message: "", type: "" }, popupTimeoutId: null });
    }, 4000);

    set({ popup: { message, type }, popupTimeoutId: id });
  },

  clearPopup: () => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);
    set({ popup: { message: "", type: "" }, popupTimeoutId: null });
  },

  loginUser: async (email, password, navigate) => {
    const state = get();
    
    // Prevent double-submissions
    if (state.isLoginLoading) return false;

    const cleanEmail = email?.trim() || "";

    // Pre-flight Validation: Prevent unnecessary network requests
    if (!AuthHelper.isValidEmail(cleanEmail) || !password) {
      state.triggerPopup("Please provide a valid email and password.", "error");
      return false;
    }

    set({ isLoginLoading: true });
    
    try {
      // Ensure session persists locally across browser restarts
      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // SECURITY: Ensure email verification before allowing dashboard access
      if (!user.emailVerified) {
        get().triggerPopup("Access Denied: Please verify your email first.", "error");
        await signOut(auth); // Immediately revoke the local token
        set({ isLoginLoading: false });
        return false; 
      }

      get().triggerPopup("Login successful!", "success");
      
      // Allow the UI to reflect success state briefly before routing
      setTimeout(() => {
        navigate("/main");
        set({ isLoginLoading: false }); // Clean up state in case of back-navigation
      }, 500);
      
      return true;

    } catch (error) {
      console.error("Authentication Error:", error.code || error.message);
      get().triggerPopup(AuthHelper.parseError(error), "error");
      set({ isLoginLoading: false });
      return false;
    }
  },

  resetPassword: async (email, onSuccessCallback) => {
    const state = get();
    
    // Prevent double-submissions
    if (state.isResetLoading) return;

    const cleanEmail = email?.trim() || "";

    // Pre-flight Validation
    if (!AuthHelper.isValidEmail(cleanEmail)) {
      state.triggerPopup("Please enter a valid email address.", "error");
      return;
    }

    set({ isResetLoading: true });
    
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      get().triggerPopup("Reset link sent! Check your email inbox.", "success");
      
      if (onSuccessCallback) onSuccessCallback();
    } catch (error) {
      console.error("Password Reset Error:", error.code || error.message);
      get().triggerPopup(AuthHelper.parseError(error), "error");
    } finally {
      // Always ensure the loading state resets, even if the request fails
      set({ isResetLoading: false });
    }
  },
}));