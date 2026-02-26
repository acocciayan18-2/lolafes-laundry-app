import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore"; 
import { IconDotsHorizontal, IconMapPin, IconPhone, IconUsers, IconEdit, IconTrash } from "../icons";

const CustomerCard = ({ customer, onEdit, actionId  }) => {

  
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const deleteCustomer = useCustomerStore((state) => state.deleteCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification); 
  
  const menuRef = useRef(null);
  const firstLetter = customer.name ? customer.name.charAt(0).toUpperCase() : "?";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logActivity = useActivityStore((state) => state.logActivity);

  const handleDelete = async () => {
    try {
      await deleteCustomer(customer.id);
      
      logActivity(
        { 
          customer_name: customer.name, 
          order_number: "CUSTOMER" 
        },
        "Removed", 
        { action: 'deleted', label: 'Customer Removed' }
      );
      
      showNotification(`Customer deleted`, "success");
      setShowConfirm(false);
    } catch (err) {
      showNotification("Failed to remove customer. Please try again.", "error");
    }
  };
  

  return (
    <>
      <div className="group relative w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4">
          
          {/* AVATAR */}
          <div className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center text-text-dark font-bold text-h3 border border-app-dark/30">
            {firstLetter}
          </div>

          {/* DETAILS */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm-text mb-1 line-clamp-1 break-words">
              {customer.name}
            </h3>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
              <div className="flex items-center gap-1 text-gray-600 shrink-0">
                <IconPhone className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-micro font-medium text-gray-600">{customer.phone || "no contact"}</span>
              </div>
              {customer.address && (
                <div className="flex items-start md:items-center gap-1 text-gray-600 min-w-0">
                  <IconMapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5 md:mt-0" />
                  <span className="text-micro font-medium text-gray-600 line-clamp-1">{customer.address}</span>
                </div>
              )}
            </div>
          </div>
          

          {/* ACTIONS CONTAINER */}
          <div className="relative" ref={menuRef}>
            <button 
            id={actionId}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
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
                >
                  {/* EDIT OPTION */}
                  <button
                    onClick={() => {
                      onEdit(customer);
                      setShowMenu(false);
                    }}
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 bg-app-dark rounded-full flex items-center justify-center mx-auto mb-4">
                <IconUsers className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-h3 font-bold text-text-dark">Remove Customer?</h3>
              <p className="text-sm-text text-text-dark/70 mt-2 mb-6">
                Are you sure you want to remove <span className="font-bold text-text-dark">{customer.name}</span>? This action cannot be undone.
              </p>

              <div className="flex flex-row gap-3">
                <button 
                  className="flex-1 order-1 px-4 py-2 text-sm-text font-medium border border-app-dark rounded-lg transition-all hover:bg-gray-50"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 order-2 px-4 py-2 text-sm-text font-medium bg-red-500 text-white rounded-lg transition-all hover:bg-red-600"
                  onClick={handleDelete}
                >
                  Delete
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