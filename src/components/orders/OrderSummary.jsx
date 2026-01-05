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
  // --- CALCULATION LOGIC ---
  const total = selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [dropdownDirection, setDropdownDirection] = useState("bottom");

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
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-md border border-gray-200 sticky top-6 z-30"
    >
      {/* HEADER */}
      <div className="p-6 !pb-0">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <IconCalculator className="w-6 h-6 !text-green-700 !stroke-green-600" />
          Order Summary
        </h3>
      </div>

      <div className="p-6 space-y-6">
        
        {/* --- UPDATED CUSTOMER CARD --- */}
        <div className="bg-blue-50/80 p-3 rounded-xl overflow-hidden border border-blue-100">
          <p className="text-[13px] font-medium text-gray-500  mb-2">Customer Details</p>
          
          {customer.name ? (
            <div className="space-y-1">
              <p className="text-[15px] font-bold text-gray-900 leading-tight">
                {customer.name}
              </p>
              {/* FIX: Checks for 'phone' OR 'contact_number' to ensure display */}
              <p className="text-[14px] font-medium text-gray-800 flex items-center gap-1">
                {customer.phone || customer.contact_number || "No contact number"}
              </p>
              <p className="text-[13px] text-gray-700 leading-snug">
                {customer.address || "No address provided"}
              </p>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-500 italic">No customer selected</p>
          )}
        </div>

        {/* SERVICES LIST */}
        <div>
          <h4 className="font-medium text-gray-700 text-[14px] mb-2">Services ({selectedServices.length})</h4>
          <div className="space-y-2 ">
            {selectedServices.map((service, index) => (
              <div key={service.id || index} className="flex justify-between items-start text-sm">
                <p className="font-medium text-gray-800">{service.service_name}</p>
                <p className={`font-medium ${service.is_reward ? "text-green-700" : "text-gray-800"}`}>
                  ₱{service.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>

          <motion.div layout className="h-px bg-gray-200 my-4" />

          <motion.div layout className="space-y-1">
            <div className="flex justify-between items-center gap-1">
              <span className="font-bold text-green-700 text-lg leading-tight">Total Amount:</span>
              <motion.span key={total} className="font-bold text-2xl text-green-700">
                ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* INPUTS SECTION */}
        <motion.div layout className="space-y-4">
          
          <div className="space-y-1">
            <label className="font-bold text-sm text-gray-800 pb-1">Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Add any special notes..."
              className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:ring-1 focus:ring-black focus:border-black outline-none min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-800 tracking-tight">Payment Status</span>
              <span className={`text-[11px] font-bold uppercase ${isPaid ? 'text-green-600' : 'text-red-500'}`}>
                {isPaid ? "Paid in Full" : "Unpaid / Balances"}
              </span>
            </div>

            <button
              type="button"
              aria-label="Toggle Payment Status"
              onClick={() => setIsPaid(!isPaid)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPaid ? 'bg-green-600' : 'bg-red-500'}`}
            >
              <motion.div
                animate={{ x: isPaid ? 28 : 4 }}
                transition={SPRING_TRANSITION}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center"
              >
                {isPaid ? (
                  <IconCheckWhite className="w-3 h-3 !text-green-600 !stroke-green-600" />
                ) : (
                  <div className="w-2 h-0.5 bg-red-500 rounded-full" />
                )}
              </motion.div>
            </button>
          </div>

          <div className="space-y-1" ref={dropdownRef}>
            <label className="font-bold text-sm text-gray-800 pb-1">Payment Method</label>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { setIsDropdownOpen(!isDropdownOpen); handleInputFocus(e); }}
                className={`w-full h-11 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-sm font-medium ${isDropdownOpen ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-300"}`}
              >
                <div className="flex items-center gap-2">
                  {selectedOption?.icon}
                  <span className="text-gray-700">{selectedOption?.label}</span>
                </div>
                <motion.svg animate={{ rotate: isDropdownOpen ? 180 : 0 }} className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: dropdownDirection === "bottom" ? -10 : 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: dropdownDirection === "bottom" ? -10 : 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute left-0 right-0 z-[100] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden py-1 ${dropdownDirection === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}
                  >
                    {paymentOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setPaymentMethod(option.value); setIsDropdownOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${paymentMethod === option.value ? "text-gray-700 font-medium bg-gray-50" : "text-gray-600"}`}
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
        </motion.div>

        {/* SUBMIT BUTTON */}
        <motion.div layout>
          <Button
            onClick={onSubmit}
            disabled={isProcessing} 
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 text-base font-medium shadow-md border-0 rounded-lg mt-2 transition-all bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-white font-medium">Processing...</span>
              </div>
            ) : (
              <span className="text-white !font-normal">Place Order</span>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};