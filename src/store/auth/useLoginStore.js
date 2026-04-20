/**
 * @file useLoginStore.js
 * @description Enterprise-grade Authentication Controller for Lola Fe's POS.
 * @security Implements In-Memory RBAC, strict input sanitization, and brute-force protection.
 */

import { create } from "zustand";
import { auth, db } from "../../services/firebase";
import {
  browserLocalPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "../auth/useAuthStore";

const AuthHelper = {
  parseError(error) {
    const errorMap = {
      "auth/invalid-email": "Invalid credential combination.", 
      "auth/user-disabled": "This account has been suspended for security reasons.",
      "auth/invalid-credential": "Invalid email or password combination.",
      "auth/too-many-requests": "Access temporarily locked. Please try again in a few minutes.",
      "auth/network-request-failed": "Connection error. Please check your internet.",
      "auth/user-not-found": "Invalid credential combination.", 
      "auth/wrong-password": "Invalid credential combination.", 
    };
    return errorMap[error?.code] || "An unexpected security error occurred.";
  },

  isValidEmail(email) {
    if (!email || email.length > 254) return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
  }
};

export const useLoginStore = create((set, get) => ({
  isLoginLoading: false,
  isResetLoading: false,
  popup: { message: "", type: "" },
  popupTimeoutId: null,

  triggerPopup: (message, type) => {
    const { popupTimeoutId } = get();
    if (popupTimeoutId) clearTimeout(popupTimeoutId);

    const id = setTimeout(() => {
      set({ popup: { message: "", type: "" }, popupTimeoutId: null });
    }, 4000);

    set({ popup: { message, type }, popupTimeoutId: id });
  },

  loginUser: async (email, password, navigate) => {
    const { isLoginLoading, triggerPopup } = get();
    if (isLoginLoading) return false;

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!AuthHelper.isValidEmail(cleanEmail) || !cleanPassword) {
      triggerPopup("Please enter valid credentials.", "error");
      return false;
    }

    set({ isLoginLoading: true });

    try {
      // 🔥 CRITICAL FIX: Hard-wipe any lingering memory state BEFORE authenticating
      const { logout, setSession } = useAuthStore.getState();
      logout(); 

      await setPersistence(auth, browserLocalPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      if (!user.emailVerified) {
        triggerPopup("Please verify your email before logging in.", "error");
        await signOut(auth);
        set({ isLoginLoading: false });
        return false;
      }

      let fetchedRole = "STAFF"; 
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          fetchedRole = String(userData.role || "STAFF").toUpperCase();
        }
      } catch (dbError) {
        console.error("[Security] Failed to fetch server-side role.", dbError);
      }

      // Safely set the new role to Zustand
      setSession(user, fetchedRole);

      triggerPopup("Access granted. Welcome back.", "success");

      // Short delay for the success toast to be visible
      setTimeout(() => {
        set({ isLoginLoading: false });
        navigate("/main");
      }, 800);

      return true;

    } catch (error) {
      console.error("[Auth System] Login failure:", error.code);
      triggerPopup(AuthHelper.parseError(error), "error");
      set({ isLoginLoading: false });
      return false;
    }
  },

  resetPassword: async (email, onSuccessCallback) => {
    const { isResetLoading, triggerPopup } = get();
    if (isResetLoading) return;

    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!AuthHelper.isValidEmail(cleanEmail)) {
      triggerPopup("Please enter a valid business email.", "error");
      return;
    }

    set({ isResetLoading: true });

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      triggerPopup("Security reset link dispatched to your inbox.", "success");
      if (typeof onSuccessCallback === 'function') onSuccessCallback();
    } catch (error) {
      triggerPopup(AuthHelper.parseError(error), "error");
    } finally {
      set({ isResetLoading: false });
    }
  },
}));