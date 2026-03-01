import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore"; 
import { IconDotsHorizontal, IconMapPin, IconPhone, IconUsers, IconEdit, IconTrash } from "../icons";


const CustomerCard = ({ customer, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification); 
  const logActivity = useActivityStore((state) => state.logActivity);
  
  const menuRef = useRef(null);

  // 2. PERFORMANCE: Memoized Avatar computation
  const firstLetter = useMemo(() => {
    return customer.name ? customer.name.charAt(0).toUpperCase() : "?";
  }, [customer.name]);

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // 3. ACCESSIBILITY: Scroll lock & Escape key for Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isDeleting) setShowConfirm(false);
    };

    if (showConfirm) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
      setErrorMsg(null); // Reset error on open
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showConfirm, isDeleting]);

  // 4. SECURITY: Wrapped async handler
  const handleDelete = async () => {
    if (isDeleting) return; // Prevent double-clicks
    
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteCustomer(customer.id);
      
      logActivity(
        { customer_name: customer.name, order_number: "CUSTOMER" },
        "Removed", 
        { action: 'deleted', label: 'Customer Removed' }
      );
      
      showNotification(`Customer deleted`, "success");
      // Component will likely unmount here as it's removed from the parent list
    } catch (err) {
      console.error("Delete failed:", err);
      setErrorMsg("Network error. Could not delete customer.");
      showNotification("Failed to remove customer.", "error");
      setIsDeleting(false); // Re-enable so they can try again
    }
  };

  return (
    <>
      <div className="group relative w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4">
          
          {/* AVATAR */}
          <div className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark font-bold text-h3 border border-app-dark/30" aria-hidden="true">
            {firstLetter}
          </div>

          {/* DETAILS */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm-text mb-1 line-clamp-1 break-words">
              {customer.name}
            </h3>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <div className="flex items-center gap-1 text-gray-600 shrink-0">
                <IconPhone className="w-3 h-3 text-text-dark/70 shrink-0" />
                <span className="text-[12px] font-medium text-gray-600">{customer.phone || "no contact"}</span>
              </div>
              {customer.address && (
                <div className="flex items-start md:items-center gap-1 text-gray-600 min-w-0">
                  <IconMapPin className="w-3 h-3 text-text-dark/70 shrink-0 mt-0.5 md:mt-0" />
                  <span className="text-[12px] font-medium text-gray-600 line-clamp-1">{customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS CONTAINER */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-expanded={showMenu}
              aria-haspopup="menu"
              aria-label="Customer actions"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <IconDotsHorizontal className="w-5 h-5 text-text-dark/90" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
                  role="menu"
                >
                  {/* EDIT OPTION */}
                  <button
                    onClick={() => {
                      onEdit(customer);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm-text font-medium text-text-dark hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <IconEdit className="w-4 h-4 text-text-dark/70" />
                    Edit Details
                  </button>

                  {/* REMOVE OPTION */}
                  <button
                    onClick={() => {
                      setShowConfirm(true);
                      setShowMenu(false);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm-text font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <IconTrash className="w-4 h-4 text-red-400" />
                    Remove Customer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirm && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowConfirm(false)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center relative"
            >
              <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
                <IconUsers className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-h3 font-bold text-text-dark">Remove Customer?</h3>
              <p className="text-sm-text text-text-dark/70 mt-2 mb-4 leading-snug">
                Are you sure you want to remove <span className="font-bold text-text-dark">{customer.name}</span>? This action cannot be undone.
              </p>

              {/* Error message block */}
              {errorMsg && (
                <div className="mb-4 p-2 bg-red-50 text-red-500 text-micro rounded border border-red-100">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-row gap-3">
                <button 
                  className="flex-1 order-1 px-4 py-2 text-sm-text font-medium border border-app-dark rounded-lg transition-all hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 order-2 flex items-center justify-center gap-2 px-4 py-2 text-sm-text font-medium bg-red-500 text-white rounded-lg transition-all hover:bg-red-600 disabled:opacity-70 disabled:cursor-wait"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      {/* Replace with IconLoading if you have one */}
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomerCard;