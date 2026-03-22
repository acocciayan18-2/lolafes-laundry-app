/**
 * @file AuthContext.jsx
 * @description Enterprise Authentication Provider using the Heartbeat Pattern.
 * Guarantees session death tracking regardless of browser thread-killing policies.
 */

import { onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth } from "../services/firebase";
import { useSettingsStore } from "../store/settings/useSettingsStore";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const EXPIRE_LIMIT_MS = 30 * 60 * 1000; 
const HEARTBEAT_KEY = '_lf_last_pulse';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  // ==========================================
  // 1. INITIAL MOUNT & FIREBASE HYDRATION
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 🛡️ HEARTBEAT EVALUATION
        try {
          const lastPulseStr = localStorage.getItem(HEARTBEAT_KEY);

          if (lastPulseStr) {
            const lastPulse = parseInt(lastPulseStr, 10);
            const now = Date.now();
            const elapsed = now - lastPulse;

            // Tamper & Expiration Check
            if (elapsed > EXPIRE_LIMIT_MS || lastPulse > now) {
              isLoggingOutRef.current = true;
              localStorage.removeItem(HEARTBEAT_KEY);
              
              await signOut(auth); 
              setCurrentUser(null);
              setIsLoading(false);
              return; // 🚨 Abort login entirely
            }
          }
        } catch (err) {
          // Fail-Secure: Wipe storage and force logout on data corruption/tampering
          localStorage.removeItem(HEARTBEAT_KEY);
          await signOut(auth);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        setCurrentUser(user);
      } else {
        // No user in Firebase cache
        setCurrentUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // 2. THE HEARTBEAT ENGINE
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    // Immediately evaluate setting on mount
    const initialAutoLogout = useSettingsStore.getState().systemConfig?.autoLogout;
    if (initialAutoLogout) {
      localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(HEARTBEAT_KEY); // Active Purge
    }

    const pulseInterval = setInterval(() => {
      const isAutoLogout = useSettingsStore.getState().systemConfig?.autoLogout;
      
      if (isAutoLogout && !isLoggingOutRef.current) {
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
      } else {
        // ✨ QA FIX: If the setting is toggled OFF, aggressively delete the heartbeat
        // so it doesn't "rot" and cause a false logout on the next refresh.
        localStorage.removeItem(HEARTBEAT_KEY);
      }
    }, 5000); // Emit a pulse every 5 seconds

    return () => {
      clearInterval(pulseInterval);
    };
  }, [currentUser]);

  const value = { currentUser, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};