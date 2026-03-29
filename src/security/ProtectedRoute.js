/**
 * @file ProtectedRoute.jsx
 * @description Route wrapper enforcing Firebase authentication, email verification, and Role-Based Access Control (RBAC).
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../security/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  // 1. Get the role saved in localStorage during the login process
  const userRole = localStorage.getItem("userRole") || "STAFF";

  // 2. Defend against completely unauthenticated or expired users
  if (!currentUser) {
    // Pass the attempted URL in state so we can redirect them back after they log in
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Strict Access Control: Enforce Email Verification
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // 4. Role-Based Access Control (Check if the role is allowed to see this page)
  // If allowedRoles is provided and the user's role isn't in it, kick them to the dashboard.
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`Access Denied: Role "${userRole}" is not authorized for this route.`);
    return <Navigate to="/main/dashboard" replace />;
  }

  // Render child components or the Outlet for nested routes
  return children ? children : <Outlet />;
}