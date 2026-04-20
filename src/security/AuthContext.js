/**
 * @file AuthContext.jsx
 * @description Enterprise Authentication Provider using the Heartbeat Pattern.
 * Guarantees session death tracking, Sleep-Bypass Defense, and Single-Source-of-Truth Role Hydration.
 */

import { onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useSettingsStore } from "../store/settings/useSettingsStore";
import { useAuthStore } from "../store/auth/useAuthStore";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const EXPIRE_LIMIT_MS = 1 * 60 * 1000; // 30 Minutes
const HEARTBEAT_KEY = '_lf_last_pulse';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Email Verification Check
        if (!user.emailVerified) {
          logout();
          await signOut(auth);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // 2. Heartbeat Evaluation (Startup Check)
        try {
          const lastPulseStr = localStorage.getItem(HEARTBEAT_KEY);
          if (lastPulseStr) {
            const lastPulse = parseInt(lastPulseStr, 10);
            const now = Date.now();
            const elapsed = now - lastPulse;

            if (elapsed > EXPIRE_LIMIT_MS || lastPulse > now) {
              isLoggingOutRef.current = true;
              localStorage.removeItem(HEARTBEAT_KEY);
              
              logout(); 
              await signOut(auth); 
              setCurrentUser(null);
              setIsLoading(false);
              return; 
            }
          }
        } catch (err) {
          localStorage.removeItem(HEARTBEAT_KEY);
          logout();
          await signOut(auth);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        // 3. 🛡️ SECURE ROLE HYDRATION (Race Condition Guarded)
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const role = userDocSnap.data().role || "STAFF";
            setSession(user, role.toUpperCase());
          } else {
            // Failsafe: Prevent downgrade if useLoginStore already elevated them
            const existingRole = useAuthStore.getState().userRole;
            setSession(user, existingRole !== "STAFF" ? existingRole : "STAFF");
          }
        } catch (error) {
          console.error("[AuthContext] Role hydration caught in Race Condition:", error);
          const existingRole = useAuthStore.getState().userRole;
          setSession(user, existingRole !== "STAFF" ? existingRole : "STAFF");
        }

        setCurrentUser(user);
      } else {
        // No user in Firebase cache
        logout(); // Guarantee memory is wiped on normal logouts
        setCurrentUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setSession, logout]);

  // ==========================================
  // 🛡️ THE HEARTBEAT ENGINE (Sleep & Hydration Proof)
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    const pulseInterval = setInterval(async () => {
      if (isLoggingOutRef.current) return;

      // Extract current config safely without crashing
      const config = useSettingsStore.getState().systemConfig;
      
      // ✨ QA FIX 1: The "Zustand Empty Store" wipe bug.
      // Wait for Firebase to finish injecting the settings into Zustand.
      // If it's undefined, do absolutely nothing so we don't accidentally wipe the key.
      if (config === undefined || config === null) return; 

      const isAutoLogout = config.autoLogout;

      if (isAutoLogout) {
        
        // ✨ QA FIX 2: The "Laptop Sleep" Defense
        // If the user puts the PC to sleep or minimizes the mobile browser, the interval stops. 
        // When it wakes up, we MUST check the time gap BEFORE we overwrite the heartbeat.
        const lastPulseStr = localStorage.getItem(HEARTBEAT_KEY);
        if (lastPulseStr) {
          const lastPulse = parseInt(lastPulseStr, 10);
          const now = Date.now();
          
          if (now - lastPulse > EXPIRE_LIMIT_MS) {
            isLoggingOutRef.current = true;
            localStorage.removeItem(HEARTBEAT_KEY);
            logout();
            await signOut(auth);
            setCurrentUser(null);
            return;
          }
        }
        
        // It is safe to pulse
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
      } else {
        // Explicitly clean up ONLY if the feature is definitively turned off in the database
        localStorage.removeItem(HEARTBEAT_KEY);
      }
    }, 5000);

    return () => clearInterval(pulseInterval);
  }, [currentUser, logout]);

  const value = { currentUser, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};