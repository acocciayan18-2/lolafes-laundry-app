import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import MainApp from "./pages/MainApp";
import { useEffect } from "react";
import { useSettingsStore } from "./store/settings/useSettingsStore"; 
import SignUp from "./pages/SignUp";
import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";

// --- NEW IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";

function App() {
  // 1. EXTRACT NOTIFICATION STATE (This was missing)
  const { message, type, hideNotification } = useNotificationStore();

  // 2. EXTRACT SETTINGS ACTIONS
  const subscribe = useSettingsStore(state => state.subscribeToSettings);
  const fetchSettings = useSettingsStore(state => state.fetchSettings);

  useEffect(() => {
    // Initial fetch from Firebase
    fetchSettings(); 
    
    // Start real-time listener and store the unsubscribe function
    const unsubscribe = subscribe(); 
    
    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchSettings, subscribe]);

  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <AuthProvider>
        {/* 3. GLOBAL NOTIFICATION COMPONENT (Now has access to state) */}
        {message && (
          <LoginPopup 
            message={message} 
            type={type} 
            onClose={hideNotification} 
          />
        )}

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          <Route element={<ProtectedRoute />}>
            {/* Using /* for nested routes inside MainApp */}
            <Route path="/main/*" element={<MainApp />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;