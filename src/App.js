import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Login from "./pages/Login";
import MainApp from "./pages/MainApp";
import SignUp from "./pages/SignUp";
import { AuthProvider } from "./security/AuthContext";
import ProtectedRoute from "./security/ProtectedRoute";

// --- NEW IMPORTS ---
import { LoginPopup } from "./modal/LoginPopup";
import { useNotificationStore } from "./store/ui/useNotificationStore";

function App() {
  // Pull the notification state from your store
  const { message, type, hideNotification } = useNotificationStore();

  return (
    /* FIX: Added Future Flags to opt-in to v7 behavior 
       This removes the console warnings about state wrapping and splat paths.
    */
   
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <AuthProvider>
        {/* GLOBAL NOTIFICATION COMPONENT */}
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