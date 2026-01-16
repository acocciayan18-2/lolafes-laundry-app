import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconCalculator, IconWallet, IconCreditCard, IconGCash, 
  IconCheckBlack, IconCheckWhite 
} from "../icons"; 

const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};

export const OrderSummary = ({
  customer,
  selectedServices,
  notes,
  setNotes,
  paymentMethod,
  setPaymentMethod,
  isPaid,
  setIsPaid,
  onSubmit,
  isProcessing,
  Button,
}) => {
  const total = selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  
  const mainButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownDirection, setDropdownDirection] = useState("bottom");

  // --- REFINED OBSERVER ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Debug: console.log("Button is visible:", entry.isIntersecting);
        setIsButtonVisible(entry.isIntersecting);
      },
      { 
        threshold: 0, 
        rootMargin: "-10px 0px 0px 0px" // Trigger slightly before it fully leaves
      } 
    );

    if (mainButtonRef.current) {
      observer.observe(mainButtonRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      if (spaceBelow < 250) setDropdownDirection("top");
      else setDropdownDirection("bottom");
    }
  }, [isDropdownOpen]);

  const paymentOptions = [
    { value: "cash", label: "Cash", icon: <IconWallet className="w-3 h-3 text-gray-400" /> },
    { value: "gcash", label: "GCash", icon: <IconGCash className="w-4 h-4 text-gray-400" /> },
    { value: "card", label: "Card", icon: <IconCreditCard className="w-4 h-4 text-gray-400" /> }
  ];

  const selectedOption = paymentOptions.find(opt => opt.value === paymentMethod);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300); 
  };

  return (
    <>
      <motion.div 
        layout
        className="bg-white rounded-2xl shadow-md border border-gray-200 lg:sticky lg:top-6 z-30"
      >
        <div className="p-4 !pb-0">
          <h3 className="text-h3 font-bold text-text-dark flex items-center gap-2">
            <IconCalculator className="w-6 h-6 !text-green-700 !stroke-green-600" />
            Order Summary
          </h3>
        </div>

        <div className="p-4 space-y-5">
          {/* CUSTOMER CARD */}
          <div className="bg-gray-50 p-3 rounded-xl overflow-hidden border border-gray-100">
            <p className="text-sm-text font-medium text-text-dark/50 mb-2">Customer Details</p>
            {customer.name ? (
              <div className="space-y-1">
                <p className="text-base-text font-bold text-gray-900 leading-tight">{customer.name}</p>
                <p className="text-sm-text font-medium text-text-dark flex items-center gap-1">
                  {customer.phone || customer.contact_number || "No contact number"}
                </p>
                <p className="text-sm-text text-gray-600 leading-snug">
                  {customer.address || "No address provided"}
                </p>
              </div>
            ) : (
              <p className="text-sm-text font-medium text-text-dark italic">No customer selected</p>
            )}
          </div>

          {/* SERVICES LIST */}
          <div>
            <h4 className="text-sm-text font-medium text-text-dark/70 mb-2">Services ({selectedServices.length})</h4>
            <div className="space-y-2">
              {selectedServices.map((service, index) => (
                <div key={service.id || index} className="flex justify-between items-start">
                  <p className="text-base-text font-medium text-text-dark tracking-tight">{service.service_name}</p>
                  <p className={`text-base-text font-bold tracking-tight ${service.is_reward ? "text-green-700" : "text-text-dark"}`}>
                    ₱{service.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            <motion.div layout className="h-px bg-gray-100 my-4" />

            <div className="flex justify-between items-center gap-1">
                <span className="text-h3 font-bold text-green-700 leading-tight tracking-tight">Total Amount:</span>
                <motion.span key={total} className="text-h2 font-bold text-green-700 tracking-tighter">
                  ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </motion.span>
            </div>
          </div>

          {/* INPUTS SECTION */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm-text font-medium text-text-dark/70 ml-1">Special Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Add any special notes..."
                className="w-full p-3 rounded-lg border border-gray-300 text-base-text focus:ring-app-dark/80 focus:border-app-dark/80 outline-none min-h-[80px] resize-none"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-sm-text font-medium text-text-dark">Payment Status</span>
                <span className={`text-base-text font-bold tracking-tight ${isPaid ? 'text-green-600' : 'text-red-500'}`}>
                  {isPaid ? "Paid in Full" : "Unpaid / Balances"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPaid ? 'bg-green-600' : 'bg-red-500'}`}
              >
                <motion.div
                  animate={{ x: isPaid ? 28 : 4 }}
                  transition={SPRING_TRANSITION}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center"
                >
                  {isPaid ? <IconCheckWhite className="w-3 h-3 !text-green-600 !stroke-green-600" /> : <div className="w-2 h-0.5 bg-red-500 rounded-full" />}
                </motion.div>
              </button>
            </div>

            <div className="space-y-1" ref={dropdownRef}>
              <label className="text-sm-text font-medium text-text-dark/70 ml-1">Payment Method</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { setIsDropdownOpen(!isDropdownOpen); handleInputFocus(e); }}
                  className={`w-full h-11 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-sm-text font-medium ${isDropdownOpen ? "border-gray-900 ring-gray-900" : "border-gray-300"}`}
                >
                  <div className="flex items-center gap-2">
                    {selectedOption?.icon}
                    <span className="text-text-dark tracking-tight">{selectedOption?.label}</span>
                  </div>
                  <motion.svg animate={{ rotate: isDropdownOpen ? 180 : 0 }} className="h-3.5 w-3.5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: dropdownDirection === "bottom" ? -10 : 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: dropdownDirection === "bottom" ? -10 : 10, scale: 0.95 }}
                      className={`absolute left-0 right-0 z-[100] bg-white border border-gray-200 rounded-xl shadow-xl py-1 ${dropdownDirection === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}
                    >
                      {paymentOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => { setPaymentMethod(option.value); setIsDropdownOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm-text flex items-center justify-between tracking-tight ${paymentMethod === option.value ? "text-gray-900 font-bold bg-gray-50" : "text-gray-500 font-medium"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-5 flex justify-center">{option.icon}</div>
                            {option.label}
                          </div>
                          {paymentMethod === option.value && <IconCheckBlack className="h-3.5 w-3.5 text-gray-900" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* MAIN BUTTON WITH REF */}
          <div ref={mainButtonRef}>
            <Button
              onClick={onSubmit}
              disabled={isProcessing || selectedServices.length === 0} 
              className="w-full h-12 text-base-text !font-medium shadow-md border-0 rounded-lg mt-2 transition-all bg-green-700 hover:bg-green-600 text-white"
            >
              {isProcessing ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* FLOATING ACTION BAR - Ensure it is FIXED and has a high Z-Index */}
      <AnimatePresence>
        {!isButtonVisible && selectedServices.length > 0 && (
          <motion.div
            key="mobile-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-3 lg:hidden"
          >
            <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-micro font-medium text-text-dark/70">Total Amount</span>
                <span className="text-h3 font-bold text-green-700 truncate">
                  ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={onSubmit}
                disabled={isProcessing}
                className="flex-1 h-12  text-base-text !font-medium shadow-md border-0 rounded-lg transition-all bg-green-700 hover:bg-green-600 text-white"
              >
                {isProcessing ? "..." : "Place Order"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};