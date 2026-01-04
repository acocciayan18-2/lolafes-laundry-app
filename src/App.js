import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import MainApp from "./pages/MainApp";

// --- NEW IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";

function App() {
  // Pull the notification state from your store
  const { message, type, hideNotification } = useNotificationStore();

  return (
    <Router>
      <AuthProvider>
        {/* GLOBAL NOTIFICATION COMPONENT */}
        {/* Placed here so it's always available across all routes */}
        <LoginPopup 
          message={message} 
          type={type} 
          onClose={hideNotification} 
        />

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