/**
 * @file ProtectedRoute.jsx
 * @description Route wrapper enforcing Firebase authentication and email verification.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../security/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation(); // Track where they tried to go

  // 1. Defend against completely unauthenticated or expired users
  if (!currentUser) {
    // Pass the attempted URL in state so we can redirect them back after they log in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Strict Access Control: Enforce Email Verification
  if (!currentUser.emailVerified) {
    // Redirect to a specific verification prompt if needed, or fallback to login
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}