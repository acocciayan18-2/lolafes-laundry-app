import { create } from "zustand";
// ✨ FIX 1: Make sure 'db' is imported from your firebase config
import { auth, db } from "../../services/firebase";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
// ✨ FIX 2: Import Firestore document fetching methods
import { doc, getDoc } from "firebase/firestore";

/**
 * @namespace AuthHelper
 * @description Encapsulated security and validation utilities for authentication.
 */
const AuthHelper = {
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

  isValidEmail(email) {
    if (!email || email.length > 254) return false;
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

  triggerPopup: (message, type) => {
    const { popupTimeoutId } = get();
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

      // ==========================================
      // ✨ FIX 3: THE ROLE FETCHING LOGIC
      // ==========================================
      try {
        // Assume your users are stored in a "users" collection in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // If the document exists, extract the role. Otherwise, fallback to STAFF.
        const fetchedRole = userDocSnap.exists() ? userDocSnap.data().role : "STAFF";

        // Save to localStorage so ProtectedRoute can read it immediately
        localStorage.setItem("userRole", fetchedRole);
      } catch (dbError) {
        console.error("Failed to fetch user role from database:", dbError);
        // Fallback security measure: if DB fails, default to lowest permissions
        localStorage.setItem("userRole", "STAFF");
      }
      // ==========================================

      get().triggerPopup("Login successful!", "success");

      setTimeout(() => {
        navigate("/main");
        set({ isLoginLoading: false });
      }, 500);

      return true;

    } catch (error) {
      console.error("Auth Error:", error.code);
      get().triggerPopup(AuthHelper.parseError(error), "error");
      return false;
    } finally {
      if (!auth.currentUser?.emailVerified) {
        set({ isLoginLoading: false });
      }
    }
  },

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