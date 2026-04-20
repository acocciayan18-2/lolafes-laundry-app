/**
 * @file useAuthStore.js
 * @description Secure in-memory authentication and RBAC (Role-Based Access Control) store.
 * @security Prevents client-side role manipulation by avoiding persistent storage for sensitive claims.
 */

import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // Defaults to STAFF for maximum security (Principle of Least Privilege)
  userRole: "STAFF", 
  isAuthenticated: false,
  user: null,

  /**
   * Initializes the session. In a production environment, this would 
   * validate a JWT or Session Cookie with Firebase Auth or your Backend.
   */
  setSession: (userData, role) => {
    set({
      user: userData,
      userRole: role || "STAFF",
      isAuthenticated: !!userData,
    });
  },

  /**
   * Clears the in-memory state. Since data isn't in localStorage,
   * a simple refresh or logout completely wipes the access context.
   */
  logout: () => {
    set({
      user: null,
      userRole: "STAFF",
      isAuthenticated: false,
    });
  },
}));