import { onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../services/firebase";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const SESSION_TIMEOUT = 30 * 60 * 1000; 
const HEARTBEAT_INTERVAL = 10 * 1000; 

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. THE ENTRANCE CHECK
    const lastActive = localStorage.getItem("last_active_timestamp");
    const isAutoLogoutEnabled = localStorage.getItem("auto_logout_enabled") === "true";
    const now = Date.now();

    // Only sign out if the feature is enabled AND the timeout has passed
    if (isAutoLogoutEnabled && lastActive && now - parseInt(lastActive) > SESSION_TIMEOUT) {
      signOut(auth);
      localStorage.removeItem("last_active_timestamp");
    }

    // 2. THE HEARTBEAT
    const heartbeat = setInterval(() => {
      if (auth.currentUser) {
        localStorage.setItem("last_active_timestamp", Date.now().toString());
      }
    }, HEARTBEAT_INTERVAL);

    // 3. FIREBASE AUTH LISTENER
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem("last_active_timestamp", Date.now().toString());
      } else {
        localStorage.removeItem("last_active_timestamp");
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      clearInterval(heartbeat);
    };
  }, []);

  const value = { currentUser, isLoading };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};