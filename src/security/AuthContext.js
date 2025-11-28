import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";

const AuthContext = createContext();

// Custom hook to access auth state
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Wait for auth check to finish before rendering app */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};