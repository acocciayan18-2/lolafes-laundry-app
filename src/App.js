import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import MainApp from "./pages/MainApp";
import { useEffect } from "react";
import { useSettingsStore } from "./store/settings/useSettingsStore"; 
import SignUp from "./pages/SignUp";
import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";

// --- GLOBAL NOTIFICATION IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";

function App() {
  const message = useNotificationStore((state) => state.message);
  const type = useNotificationStore((state) => state.type);
  const hideNotification = useNotificationStore((state) => state.hideNotification);

  const subscribeToSettings = useSettingsStore(state => state.subscribeToSettings);

  useEffect(() => {
    // Calling this once starts the "Live Link" to Firebase immediately
    const unsubscribe = subscribeToSettings(); 
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
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
        {/* 2. GLOBAL NOTIFICATION COMPONENT 
            This will now show up on ANY page (Login, Signup, or MainApp)
            whenever you call showNotification from any store.
        */}
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
            <Route path="/main/*" element={<MainApp />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}


export default App;