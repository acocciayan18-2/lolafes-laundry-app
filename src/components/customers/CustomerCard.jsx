import { AnimatePresence, motion } from "framer-motion";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import RemoveCustomerModal from "./RemoveCustomerModal";

import {
  IconDotsHorizontal,
  IconMapPin,
  IconPhone,
  IconEditPen,
  IconTrash,
  IconShirt,
} from "../icons";

/**
 * @component CustomerCard
 * @description Enterprise-grade card for displaying and managing customer records.
 * Implements Smart Viewport Collision Detection for dropdown menus.
 */
const CustomerCard = ({ customer, onEdit }) => {
  // --- STATE ---
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState("bottom"); // ✨ Smart Positioning State
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

  // ✨ FIX: Get user role
  const userRole = localStorage.getItem("userRole") || "STAFF";
  const isOwner = userRole === "OWNER" || userRole === "ADMIN";

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
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

  // --- DERIVED STATE (MEMOIZED) ---
  const firstLetter = useMemo(() => {
    if (!customer?.name || typeof customer.name !== 'string') return "?";
    return customer.name.charAt(0).toUpperCase();
  }, [customer?.name]);

  // --- HANDLERS (MEMOIZED) ---

  const handleToggleMenu = useCallback((e) => {
    e.stopPropagation();

    // ✨ VIEWPORT COLLISION DETECTION LOGIC
    if (!showMenu && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const MENU_HEIGHT_REQUIREMENT = 120; // Approx height of the dropdown menu in pixels

      if (spaceBelow < MENU_HEIGHT_REQUIREMENT) {
        setMenuPosition("top");
      } else {
        setMenuPosition("bottom");
      }
    }

    setShowMenu((prev) => !prev);
  }, [showMenu]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    if (typeof onEdit === 'function') {
      onEdit(customer);
    }
    setShowMenu(false);
  }, [onEdit, customer]);

  const handleInitiateDelete = useCallback((e) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowMenu(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (!isDeleting) setShowConfirm(false);
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    if (isDeleting || !customer?.id) return;

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
  }, [isDeleting, customer, deleteCustomer, logActivity, showNotification]);

  // --- EARLY RETURN ---
  if (!customer) return null;

  // --- ANIMATION VARIANTS ---
  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: menuPosition === "top" ? 10 : -10 // Animate from bottom up, or top down
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0
    }
  };

  return (
    <>
      {/* ✨ QA FIX: Added dynamic z-index (z-50) when menu is open to prevent overlapping by cards below */}
      <article aria-labelledby={`customer-name-${customer.id}`} className={`group relative w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200 ${showMenu ? 'z-50' : 'z-0'}`}>
        <div className="flex items-center gap-4">

          <div
            className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark  text-h3 border border-app-dark/30 shadow-sm select-none"
            aria-hidden="true"
          >
            {firstLetter}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id={`customer-name-${customer.id}`} className="font-bold text-gray-900 text-sm-text mb-1 truncate break-words" title={customer.name}>
              {customer.name || "Unknown Customer"}
            </h3>

            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <div className="flex items-center gap-1 text-emerald-600 shrink-0" aria-label={`${customer.order_count || 0} Orders`}>
                <IconShirt className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="text-micro font-bold">
                  {customer.order_count || 0} Orders
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-500 shrink-0" aria-label={customer.phone ? `Phone: ${customer.phone}` : "No contact number provided"}>
                <IconPhone className="w-3 h-3 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="text-micro ">
                  {customer.phone || "No contact"}
                </span>
              </div>

              {customer.address && (
                <div className="flex items-start md:items-center gap-1 text-gray-500 min-w-0" aria-label={`Address: ${customer.address}`}>
                  <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" aria-hidden="true" />
                  <span className="text-micro  truncate" title={customer.address}>
                    {customer.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✨ FIX: Completely hide Actions Menu if user is not Owner */}
          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleToggleMenu}
                aria-haspopup="menu"
                aria-expanded={showMenu}
                aria-label={`Actions for ${customer.name}`}
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
                    // ✨ SMART POSITIONING CSS
                    className={`absolute right-0 w-max bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden focus:outline-none ${menuPosition === "top" ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right"
                      }`}
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
        customerName={customer.name}
        isDeleting={isDeleting}
        errorMsg={errorMsg}
      />
    </>
  );
};

export default React.memo(CustomerCard);