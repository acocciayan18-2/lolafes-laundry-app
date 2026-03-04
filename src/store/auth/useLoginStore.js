import { create } from "zustand";
import { auth } from "../../services/firebase";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// OOP Concept: Encapsulation of Helper Logic
const AuthHelper = {
  parseError(error) {
    const errorMap = {
      "auth/invalid-email": "The email address is badly formatted.",
      "auth/user-disabled": "This account has been suspended.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-credential": "Invalid email or password combination.",
      "auth/too-many-requests": "Access temporarily locked due to too many failed attempts.",
    };
    return errorMap[error.code] || "An unexpected network error occurred.";
  },
};

export const useLoginStore = create((set, get) => ({
  // --- STATE ---
  isLoginLoading: false,
  isResetLoading: false,
  popup: { message: "", type: "" },

  // --- ACTIONS ---
  triggerPopup: (message, type) => {
    set({ popup: { message, type } });
    setTimeout(() => set({ popup: { message: "", type: "" } }), 4000);
  },

  clearPopup: () => set({ popup: { message: "", type: "" } }),

  loginUser: async (email, password, navigate) => {
    set({ isLoginLoading: true });
    
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // SECURITY: Ensure email verification before allowing dashboard access
      if (!user.emailVerified) {
        get().triggerPopup("Access Denied: Please verify your email first.", "error");
        await signOut(auth);
        set({ isLoginLoading: false });
        return false; // Returns false to tell the UI to clear the password
      }

      get().triggerPopup("Login successful!", "success");
      setTimeout(() => navigate("/main"), 1000);
      return true;

    } catch (error) {
      console.error("Login Error:", error.code);
      get().triggerPopup(`${AuthHelper.parseError(error)}`, "error");
      set({ isLoginLoading: false });
      return false;
    }
  },

  resetPassword: async (email, onSuccessCallback) => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      get().triggerPopup("Please enter a valid email.", "error");
      return;
    }

    set({ isResetLoading: true });
    try {
      await sendPasswordResetEmail(auth, email.trim());
      get().triggerPopup("Reset link sent! Check your email inbox.", "success");
      if (onSuccessCallback) onSuccessCallback();
    } catch (error) {
      get().triggerPopup(`${AuthHelper.parseError(error)}`, "error");
    } finally {
      set({ isResetLoading: false });
    }
  },
}));