/**
 * @file CustomerCard.jsx
 * @description Atomic component for Customer records.
 * @architecture Implements layout-thrashing prevention, DOM-based XSS scrubbing, and In-Memory RBAC.
 */
import { AnimatePresence, motion } from "framer-motion";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import RemoveCustomerModal from "./RemoveCustomerModal";
// ✨ SECURE RBAC: Import unified memory state
import { useAuthStore } from "../../store/auth/useAuthStore";

import {
  IconDotsHorizontal,
  IconMapPin,
  IconPhone,
  IconEditPen,
  IconTrash,
  IconShirt,
} from "../icons";

// ==========================================
// 🛡️ SECURITY UTILITIES
// ==========================================
// Prevents React from executing malicious scripts if the DB gets poisoned
const escapeHTML = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
};

const CustomerCard = ({ customer, onEdit }) => {
  // --- STATE ---
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState("bottom"); 
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // --- STORES ---
  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- REFS ---
  const menuRef = useRef(null);
  const isMounted = useRef(false);

  // ✨ SECURE RBAC: Read role directly from memory, bypass LocalStorage completely
  const userRole = useAuthStore((state) => state.userRole);
  const isOwnerOrAdmin = useMemo(() => {
    const safeRole = String(userRole || "STAFF").toUpperCase();
    return safeRole === "OWNER" || safeRole === "ADMIN";
  }, [userRole]);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ⚡ A11y & UX: Click Outside Listener
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") setShowMenu(false);
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!showConfirm) return;

    const handleEsc = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        setShowConfirm(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showConfirm, isDeleting]);

  // --- DERIVED STATE (Sanitized & Memoized) ---
  const safeData = useMemo(() => ({
    name: escapeHTML(customer?.name || "Unknown Customer"),
    phone: escapeHTML(customer?.phone || "No contact"),
    address: escapeHTML(customer?.address || ""),
    initial: customer?.name && typeof customer.name === 'string' ? customer.name.charAt(0).toUpperCase() : "?"
  }), [customer]);

  // --- HANDLERS (MEMOIZED) ---
  const handleToggleMenu = useCallback((e) => {
    e.stopPropagation();

    // ✨ VIEWPORT COLLISION DETECTION LOGIC (Optimized)
    if (!showMenu && menuRef.current) {
      // requestAnimationFrame prevents "Layout Thrashing" (Forced Synchronous Layouts)
      window.requestAnimationFrame(() => {
        const rect = menuRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const MENU_HEIGHT_REQUIREMENT = 120;

        setMenuPosition(spaceBelow < MENU_HEIGHT_REQUIREMENT ? "top" : "bottom");
      });
    }

    setShowMenu((prev) => !prev);
  }, [showMenu]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    
    // 🛡️ FRONTEND GATE: Double-check authorization before emitting the event
    if (isOwnerOrAdmin && typeof onEdit === 'function') {
      onEdit(customer);
    } else {
      showNotification("Unauthorized action. Admin privileges required.", "error");
    }
    
    setShowMenu(false);
  }, [onEdit, customer, isOwnerOrAdmin, showNotification]);

  const handleInitiateDelete = useCallback((e) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowMenu(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isDeleting) setShowConfirm(false);
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    // 🛡️ FRONTEND VS BACKEND: Frontend checks the role, but the backend 
    // Firestore rules MUST also block unauthorized DELETE requests.
    if (isDeleting || !customer?.id || !isOwnerOrAdmin) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteCustomer(customer.id);

      logActivity(
        { customer_name: customer.name, order_number: "CUSTOMER" },
        "Removed",
        { action: "deleted", label: "Customer Removed" }
      );
      showNotification(`Customer deleted successfully.`, "success");

    } catch (err) {
      console.error("[CustomerCard] Deletion error:", err);
      if (isMounted.current) {
        setErrorMsg(err?.message?.substring(0, 100) || "Network error. Could not delete customer.");
        showNotification("Failed to remove customer.", "error");
        setIsDeleting(false);
      }
    }
  }, [isDeleting, customer, deleteCustomer, logActivity, showNotification, isOwnerOrAdmin]);

  // --- EARLY RETURN ---
  if (!customer) return null;

  // --- ANIMATION VARIANTS ---
  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: menuPosition === "top" ? 10 : -10 
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0
    }
  };

  return (
    <>
      <article aria-labelledby={`customer-name-${customer.id}`} className={`group relative w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200 ${showMenu ? 'z-50' : 'z-0'}`}>
        <div className="flex items-center gap-4">

          <div
            className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark  text-h3 border border-app-dark/30 shadow-sm select-none"
            aria-hidden="true"
          >
            {safeData.initial}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id={`customer-name-${customer.id}`} className="font-bold text-gray-900 text-sm-text mb-1 truncate break-words" title={safeData.name}>
              {safeData.name}
            </h3>

            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <div className="flex items-center gap-1 text-emerald-600 shrink-0" aria-label={`${customer.order_count || 0} Orders`}>
                <IconShirt className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="text-micro">
                  {customer.order_count || 0} Orders
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-500 shrink-0" aria-label={customer.phone ? `Phone: ${customer.phone}` : "No contact number provided"}>
                <IconPhone className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="text-micro ">
                  {safeData.phone}
                </span>
              </div>

              {safeData.address && (
                <div className="flex items-start md:items-center gap-1 text-gray-500 min-w-0" aria-label={`Address: ${customer.address}`}>
                  <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" aria-hidden="true" />
                  <span className="text-micro truncate" title={safeData.address}>
                    {safeData.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✨ FIX: Completely hide Actions Menu if user is not Owner/Admin */}
          {isOwnerOrAdmin && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleToggleMenu}
                aria-haspopup="menu"
                aria-expanded={showMenu}
                aria-label={`Actions for ${safeData.name}`}
                className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark ${showMenu ? 'opacity-100 bg-gray-100' : 'opacity-0 group-hover:opacity-100 hover:bg-gray-100'}`}
              >
                <IconDotsHorizontal className="w-5 h-5 text-gray-400" aria-hidden="true" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    variants={menuVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    role="menu"
                    className={`absolute right-0 w-max bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden focus:outline-none ${menuPosition === "top" ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"}`}
                  >
                    <button
                      role="menuitem"
                      onClick={handleEditClick}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm-text  text-text-dark hover:bg-gray-50 transition-colors border-b border-gray-100 focus:outline-none focus-visible:bg-gray-100"
                    >
                      <IconEditPen className="w-4 h-4 text-gray-400" aria-hidden="true" /> Edit Details
                    </button>
                    <button
                      role="menuitem"
                      onClick={handleInitiateDelete}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm-text  text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:bg-rose-50"
                    >
                      <IconTrash className="w-4 h-4 text-rose-400" aria-hidden="true" /> Remove Customer
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </article>

      <RemoveCustomerModal
        isOpen={showConfirm}
        onClose={handleCloseModal}
        onConfirm={handleDelete}
        customerName={safeData.name}
        isDeleting={isDeleting}
        errorMsg={errorMsg}
      />
    </>
  );
};

export default React.memo(CustomerCard);