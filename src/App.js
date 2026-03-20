/**
 * @file App.jsx
 * @description Root Application Entry Point.
 * Handles Global Routing, Authentication Provider Injection, and Root Listeners.
 */

import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useEffect, useCallback } from "react";
import Login from "./pages/Login";
import MainApp from "./pages/MainApp";
import SignUp from "./pages/SignUp";
import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";

// --- GLOBAL STATE IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";
import { useSettingsStore } from "./store/settings/useSettingsStore"; 

function App() {
  const message = useNotificationStore(useCallback((state) => state.message, []));
  const type = useNotificationStore(useCallback((state) => state.type, []));
  const hideNotification = useNotificationStore(useCallback((state) => state.hideNotification, []));

  const subscribeToSettings = useSettingsStore(useCallback((state) => state.subscribeToSettings, []));

  
 
  useEffect(() => {
    const unsubscribe = subscribeToSettings(); 
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToSettings]);

  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <AuthProvider>
        {message && (
          <LoginPopup 
            message={message} 
            type={type} 
            onClose={hideNotification} 
          />
        )}

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* 🔒 Protected Business Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/main/*" element={<MainApp />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;