import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  IconCalculator,
  IconCheckBlack, IconCheckWhite,
  IconCreditCard, IconDelivery, IconGCash,
  IconHandover,
  IconWallet
} from "../icons";

// 1. PERFORMANCE: Move statics outside the component to prevent memory reallocation on every render
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash", icon: <IconWallet className="w-3 h-3 text-text-dark" /> },
  { value: "gcash", label: "GCash", icon: <IconGCash className="w-4 h-4 text-text-dark" /> },
  { value: "card", label: "Card", icon: <IconCreditCard className="w-4 h-4 text-text-dark" /> }
];

export const OrderSummary = ({
  customer,
  selectedServices,
  notes,
  setNotes,
  paymentMethod,
  setPaymentMethod,
  isPaid,
  setIsPaid,
  handoverMethod,
  setHandoverMethod,
  deliveryFee,
  setDeliveryFee,
  onSubmit,
  isProcessing,
  Button,
  isPhoneDuplicate,
}) => {
  // --- Refs ---
  const mainButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const deliveryInputRef = useRef(null);

  // --- UI States ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [dropdownDirection, setDropdownDirection] = useState("bottom");

  // ==========================================
  // 2. PERFORMANCE: Memoized Calculations
  // Prevents looping through the cart array on every single keystroke in the Notes box
  // ==========================================
  const subtotal = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
  }, [selectedServices]);
  
  const finalTotal = useMemo(() => {
    return subtotal + (handoverMethod === 'delivery' ? Number(deliveryFee) || 0 : 0);
  }, [subtotal, handoverMethod, deliveryFee]);

  // ==========================================
  // 3. SECURITY & VALIDATION: Memoized Checks
  // ==========================================
  const isPhoneValid = useMemo(() => {
    return customer.phone && customer.phone.length === 11 && customer.phone.startsWith("09");
  }, [customer.phone]);
  
  const isCartValid = selectedServices.length > 0;
  
  const isCustomerValid = useMemo(() => {
    return !!(customer.name && customer.name.trim().length > 0 && isPhoneValid && !isPhoneDuplicate);
  }, [customer.name, isPhoneValid, isPhoneDuplicate]);
  
  const isOrderInvalid = isProcessing || !isCartValid || !isCustomerValid;

  const selectedOption = useMemo(() => {
    return PAYMENT_OPTIONS.find(opt => opt.value === paymentMethod);
  }, [paymentMethod]);

  // --- Side Effects ---

  // Auto-focus Delivery Input
  useEffect(() => {
    if (handoverMethod === 'delivery') {
      const timer = setTimeout(() => {
        deliveryInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [handoverMethod]);

  // Smart Event Listeners (Clicks & Keyboard)
  useEffect(() => {
    const handleOutsideClickAndEsc = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setIsDropdownOpen(false);
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    // Only attach listeners when dropdown is open to save CPU cycles
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClickAndEsc);
      document.addEventListener("keydown", handleOutsideClickAndEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClickAndEsc);
      document.removeEventListener("keydown", handleOutsideClickAndEsc);
    };
  }, [isDropdownOpen]);

  // Intersection Observer for Mobile Floating Bar
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsButtonVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "-10px 0px 0px 0px" } 
    );

    if (mainButtonRef.current) observer.observe(mainButtonRef.current);
    return () => observer.disconnect();
  }, []);

  // Dropdown direction logic (Top vs Bottom)
  useLayoutEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropdownDirection(spaceBelow < 250 ? "top" : "bottom");
    }
  }, [isDropdownOpen]);

  // --- Handlers ---
  const getButtonText = useCallback(() => {
    if (isProcessing) return "Processing...";
    if (isPhoneDuplicate) return "Number Already Exists";
    if (!customer.name || !customer.name.trim()) return "Enter Customer Name";
    if (!isPhoneValid) return "Invalid Phone (11 Digits)";
    if (!isCartValid) return "Add Services";
    return "Place Order";
  }, [isProcessing, isPhoneDuplicate, customer.name, isPhoneValid, isCartValid]);

  const handleInputFocus = (e) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300); 
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 lg:sticky lg:top-6 z-30">
        <div className="p-4 !pb-0">
          <h3 className="text-h3 font-bold text-text-dark flex items-center gap-2">
            <IconCalculator className="w-6 h-6 !text-green-700 !stroke-green-600" />
            Order Summary
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {/* CUSTOMER CARD */}
          <div className={`p-3 rounded-xl overflow-hidden border transition-colors ${!isCustomerValid && customer.name ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <p className="text-sm-text font-medium text-text-dark/50 mb-2">Customer Details</p>
            {customer.name ? (
              <div className="space-y-1">
                <p className="text-base-text font-bold text-gray-900 leading-tight">{customer.name}</p>
                <p className={`text-sm-text font-medium flex items-center gap-1 ${!isPhoneValid || isPhoneDuplicate ? 'text-red-600 font-bold' : 'text-text-dark'}`}>
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
                    ₱{Number(service.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            

            <div className="flex justify-between items-center gap-1 mt-4">
              <span className="text-h3 font-bold text-green-700 leading-tight tracking-tight">Total Amount:</span>
              <motion.span key={finalTotal} className="text-h2 font-bold text-green-700 tracking-tighter">
                ₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </motion.span>
            </div>
          </div>

          {/* NOTES SECTION */}
          <div className="space-y-1 !mt-1">
            <label className="text-sm-text font-medium text-text-dark/70 ml-1">Special Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Add any special notes..."
              className="w-full p-3 rounded-lg border border-gray-300 text-sm-text focus:ring-app-dark/80 focus:border-app-dark/80 outline-none min-h-[50px] resize-none custom-scrollbar"
            />
          </div>

          {/* HANDOVER METHOD SELECTION */}
          <div className="flex flex-col gap-2 !mt-1">
            <p className="text-sm-text font-medium text-text-dark/70 ml-1">Handover Method</p>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-[220px]">
              {/* PICKUP OPTION */}
              <label className="flex-1 relative cursor-pointer">
                <input 
                  type="radio" 
                  name="handover" 
                  value="pickup" 
                  checked={handoverMethod === 'pickup'}
                  onChange={() => setHandoverMethod('pickup')}
                  className="sr-only" 
                />
                <div className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-micro font-bold transition-all duration-200 ${handoverMethod === 'pickup' ? 'bg-white text-app-dark shadow-sm ring-1 ring-black/5' : 'text-text-dark/40 hover:text-text-dark/60'}`}>
                  <IconHandover className="w-4 h-4" />
                  <span>PICK UP</span>
                </div>
              </label>
              
              {/* DELIVERY OPTION */}
              <label className="flex-1 relative cursor-pointer">
                <input 
                  type="radio" 
                  name="handover" 
                  value="delivery" 
                  checked={handoverMethod === 'delivery'}
                  onChange={() => setHandoverMethod('delivery')}
                  className="sr-only" 
                />
                <div className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-micro font-bold transition-all duration-200 ${handoverMethod === 'delivery' ? 'bg-white text-app-dark shadow-sm ring-1 ring-black/5' : 'text-text-dark/40 hover:text-text-dark/60'}`}>
                  <IconDelivery className="w-4 h-4" />
                  <span>DELIVERY</span>
                </div>
              </label>
            </div>

            {/* Delivery Fee Input */}
            <AnimatePresence>
              {handoverMethod === 'delivery' && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="mt-1 flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-text-dark/80">Delivery Fee</span>
                    <span className="text-nano text-text-dark/50 italic">Set 0 for free</span>
                  </div>

                  <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 focus-within:border-app-dark transition-all">
                    <span className="text-sm font-bold text-app-dark/90 mr-1 select-none">₱</span>
                    <input
                      ref={deliveryInputRef}
                      type="text"
                      inputMode="numeric"
                      value={deliveryFee === 0 ? "" : deliveryFee}
                      placeholder="0"
                      onChange={(e) => {
                        // Strict Sanitization: Strips non-digits securely
                        const val = e.target.value.replace(/\D/g, "");
                        if (val === "") {
                          setDeliveryFee(0);
                        } else if (val.length <= 4) {
                          setDeliveryFee(Number(val)); // Number() cleanly removes leading zeros (e.g., "050" -> 50)
                        }
                      }}
                      className="w-10 text-right bg-transparent outline-none font-bold text-app-dark/90 text-sm leading-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PAYMENT SECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-sm-text font-medium text-text-dark/70">Payment Status</span>
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

            <AnimatePresence mode="wait">
              {isPaid && (
                <motion.div
                  key="payment-method-automation"
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginBottom: 16 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  onAnimationComplete={() => {
                    const el = document.getElementById("payment-wrapper");
                    if (el) el.style.overflow = isPaid ? "visible" : "hidden";
                  }}
                  id="payment-wrapper"
                  className="overflow-hidden"
                >
                  <div className="space-y-1 !pt-0" ref={dropdownRef}>
                    <label className="text-sm-text font-medium text-text-dark/70 ml-1">
                      Payment Method
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsDropdownOpen(!isDropdownOpen);
                          handleInputFocus(e);
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
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
                            role="listbox"
                          >
                            {PAYMENT_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={paymentMethod === option.value}
                                onClick={() => {
                                  setPaymentMethod(option.value);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm-text flex items-center justify-between tracking-tight ${paymentMethod === option.value ? "text-gray-900 font-medium bg-gray-100" : "hover:bg-gray-50"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-5 flex justify-center">{option.icon}</div>
                                  {option.label}
                                </div>
                                {paymentMethod === option.value && <IconCheckBlack className="h-3.5 w-3.5 text-text-dark" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MAIN DESKTOP BUTTON */}
          <div ref={mainButtonRef}>
            <Button
              onClick={onSubmit}
              disabled={isOrderInvalid} 
              className={`w-full h-12 text-base-text !font-medium shadow-md border-0 rounded-lg mt-2 transition-all text-white ${
                isOrderInvalid 
                  ? "bg-gray-300 cursor-not-allowed hover:bg-gray-300" 
                  : "bg-green-700 hover:bg-green-600 active:bg-green-800"
              }`}
            >
              {getButtonText()}
            </Button>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BAR (MOBILE) */}
      <AnimatePresence>
        {!isButtonVisible && selectedServices.length > 0 && (
          <motion.div
            key="mobile-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white  shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-3 lg:hidden"
          >
            <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-micro font-medium text-text-dark/70">Total Amount</span>
                <span className="text-h3 font-bold text-green-700 truncate">
                  ₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                onClick={onSubmit}
                disabled={isOrderInvalid}
                className={`flex-1 h-12 text-base-text !font-medium shadow-md border-0 rounded-lg transition-all text-white ${
                  isOrderInvalid 
                    ? "bg-gray-300 cursor-not-allowed" 
                    : "bg-green-700 hover:bg-green-600 active:scale-95"
                }`}
              >
                {isProcessing ? "..." : getButtonText()}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};