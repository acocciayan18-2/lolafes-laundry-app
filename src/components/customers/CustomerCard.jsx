import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, useEffect, useMemo } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import RemoveCustomerModal from "./RemoveCustomerModal";

import {
  IconDotsHorizontal,
  IconMapPin,
  IconPhone,
  IconEdit,
  IconTrash,
  IconShirt,
} from "../icons";

const CustomerCard = ({ customer, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  const menuRef = useRef(null);

  // Derive the first letter for the avatar
  const firstLetter = useMemo(() => {
    return customer.name ? customer.name.charAt(0).toUpperCase() : "?";
  }, [customer.name]);

  // Handle clicking outside the action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Handle Modal scroll locking and ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !isDeleting) setShowConfirm(false);
    };
    if (showConfirm) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showConfirm, isDeleting]);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      logActivity(
        { customer_name: customer.name, order_number: "CUSTOMER" },
        "Removed",
        { action: "deleted", label: "Customer Removed" }
      );
      showNotification(`Customer deleted`, "success");
    } catch (err) {
      setErrorMsg("Network error. Could not delete customer.");
      showNotification("Failed to remove customer.", "error");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="group relative w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4">
          
          {/* AVATAR */}
          <div
            className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark font-medium text-h3 border border-app-dark/30 shadow-sm"
            aria-hidden="true"
          >
            {firstLetter}
          </div>

          {/* DETAILS */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm-text mb-1 truncate break-words">
              {customer.name}
            </h3>

            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              
              <div className="flex items-center gap-1 text-emerald-600 shrink-0">
                <IconShirt className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px] font-bold">
                  {customer.order_count || 0} Orders
                </span>
              </div>

              {/* PHONE */}
              <div className="flex items-center gap-1 text-gray-500 shrink-0">
                <IconPhone className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-[12px] font-medium">
                  {customer.phone || "No contact"}
                </span>
              </div>

              {/* ADDRESS */}
              {customer.address && (
                <div className="flex items-start md:items-center gap-1 text-gray-500 min-w-0">
                  <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" />
                  <span className="text-[12px] font-medium truncate">
                    {customer.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS MENU */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <IconDotsHorizontal className="w-5 h-5 text-gray-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      onEdit(customer);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm-text font-medium text-text-dark hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <IconEdit className="w-4 h-4 text-gray-400" /> Edit Details
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm-text font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <IconTrash className="w-4 h-4 text-red-400" /> Remove Customer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <RemoveCustomerModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        customerName={customer.name}
        isDeleting={isDeleting}
        errorMsg={errorMsg}
      />
    </>
  );
};

export default CustomerCard;