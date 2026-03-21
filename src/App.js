/**
 * @file App.jsx
 * @version 1.2.0
 * @description Root Application Entry Point for POS Staff Portal.
 * Updated: Removed Public Tracking Portal (Migrated to Customer Site).
 */

import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import MainApp from "./pages/MainApp";
import SignUp from "./pages/SignUp";

// 🛡️ SECURITY: Removed OrderTrackingPage import as it now lives on the Customer Site.

import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";

// --- GLOBAL STATE IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";
import { useSettingsStore } from "./store/settings/useSettingsStore"; 

function App() {
  const message = useNotificationStore((state) => state.message);
  const type = useNotificationStore((state) => state.type);
  const hideNotification = useNotificationStore((state) => state.hideNotification);
  const subscribeToSettings = useSettingsStore((state) => state.subscribeToSettings);

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
          {/* 🌐 AUTH ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* 🔒 PROTECTED BUSINESS ROUTES (Staff Only) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/main/*" element={<MainApp />} />
          </Route>

          {/* 
             ✨ CATCH-ALL REDIRECT
             Redirects any unknown routes (including old /track links) 
             back to the login screen for staff security.
          */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;