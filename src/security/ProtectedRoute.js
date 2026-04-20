/**
 * @file ProtectedRoute.jsx
 * @description Enterprise-grade RBAC gatekeeper.
 * @security Uses in-memory state for role verification to prevent localStorage manipulation.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../security/AuthContext";
// ✨ SECURE ROLE SOURCE
import { useAuthStore } from "../store/auth/useAuthStore";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  // 🛡️ SECURITY FIX: Get the authoritative role from memory, NOT localStorage
  const userRole = useAuthStore((state) => state.userRole) || "STAFF";

  // 1. Defend against unauthenticated users
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Enforce Email Verification
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // 3. Role-Based Access Control (RBAC)
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`[Security] Access Denied: Role "${userRole}" attempted to access restricted path: ${location.pathname}`);
    // Redirect unauthorized users to the dashboard
    return <Navigate to="/main/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}