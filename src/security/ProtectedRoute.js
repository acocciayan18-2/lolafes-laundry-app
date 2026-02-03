import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../security/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  // 1. Check if user is logged in
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check if email is verified (Optional security step)
  // If they aren't verified, we force them back to login or a verify page
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // Render child components or the Outlet for nested routes
  return children ? children : <Outlet />;
}