import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { usePaymentSettingsStore } from "../../store/settings/usePaymentSettingsStore";
import {useNotificationStore} from "../../store/ui/useNotificationStore";
import {
  IconCalculator,
  IconCheckBlack, 
  IconCreditCard, IconDelivery,
  IconHandover,
  IconWallet
} from "../icons";

// 1. PERFORMANCE: Statics outside component
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};

// Helper to assign icons to dynamic payment methods
const getPaymentIcon = (name) => {
  if (!name) return <div className="w-4 h-4 rounded-full border-2 border-dashed border-text-dark/20" />;
  const lowerName = name.toLowerCase();
  if (lowerName.includes('cash')) return <IconWallet className="w-4 h-4 text-text-dark" />;
  return <IconCreditCard className="w-4 h-4 text-text-dark" />;
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
  handoverMethod,
  setHandoverMethod,
  deliveryFee,
  setDeliveryFee,
  onSubmit,
  isProcessing,
  Button,
  isPhoneDuplicate,
}) => {
  const mainButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const deliveryInputRef = useRef(null);

  const { methods, fetchPaymentMethods } = usePaymentSettingsStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [dropdownDirection, setDropdownDirection] = useState("bottom");

  useEffect(() => {
    const unsubscribe = fetchPaymentMethods();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [fetchPaymentMethods]);

  // ==========================================
  // ✨ EFFICIENT FILTERING: Only active methods
  // ==========================================
  const activeMethods = useMemo(() => {
    return methods.filter(m => m.isActive);
  }, [methods]);

  // ✨ AUTO-SELECT DEFAULT: When Paid is toggled ON
  useEffect(() => {
    if (isPaid && !paymentMethod && activeMethods.length > 0) {
      const defaultMethod = activeMethods.find(m => m.isDefault) || activeMethods[0];
      setPaymentMethod(defaultMethod.name);
    }
  }, [isPaid, paymentMethod, activeMethods, setPaymentMethod]);

  

  const subtotal = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
  }, [selectedServices]);
  
  const finalTotal = useMemo(() => {
    return subtotal + (handoverMethod === 'delivery' ? Number(deliveryFee) || 0 : 0);
  }, [subtotal, handoverMethod, deliveryFee]);

  // Validation Logic
  const isPhoneValid = useMemo(() => {
    return customer.phone && customer.phone.length === 11 && customer.phone.startsWith("09");
  }, [customer.phone]);
  
  const isCustomerValid = useMemo(() => {
    return !!(customer.name && customer.name.trim().length > 0 && isPhoneValid && !isPhoneDuplicate);
  }, [customer.name, isPhoneValid, isPhoneDuplicate]);

  const isPaymentValid = useMemo(() => {
    if (!isPaid) return true;
    return !!paymentMethod;
  }, [isPaid, paymentMethod]);
  
  const isOrderInvalid = isProcessing || selectedServices.length === 0 || !isCustomerValid || !isPaymentValid;

  const selectedOption = useMemo(() => {
    return activeMethods.find(m => m.name === paymentMethod);
  }, [paymentMethod, activeMethods]);
  // --- Side Effects ---

  useEffect(() => {
    if (handoverMethod === 'delivery') {
      const timer = setTimeout(() => {
        deliveryInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [handoverMethod]);

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

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClickAndEsc);
      document.addEventListener("keydown", handleOutsideClickAndEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClickAndEsc);
      document.removeEventListener("keydown", handleOutsideClickAndEsc);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsButtonVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "-10px 0px 0px 0px" } 
    );
    if (mainButtonRef.current) observer.observe(mainButtonRef.current);
    return () => observer.disconnect();
  }, []);

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
    if (selectedServices.length === 0) return "Add Services";
    if (isPaid && !paymentMethod) return "Select Payment Method";
    return "Place Order";
  }, [isProcessing, isPhoneDuplicate, customer.name, isPhoneValid, selectedServices.length, isPaid, paymentMethod]);

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
          <p className="text-sm-text font-medium text-text-dark/50 !mb-1">Customer Details</p>
          <div className={`p-3 rounded-xl overflow-hidden border transition-colors ${!isCustomerValid && customer.name ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            
            {customer.name ? (
              <div className="space-y-1">
                <p className="text-base-text font-bold text-gray-900 leading-tight">{customer.name}</p>
                <p className={`text-sm-text font-medium flex items-center gap-1 ${!isPhoneValid || isPhoneDuplicate ? 'text-red-600 font-bold' : 'text-text-dark'}`}>
                  {customer.phone || "No contact number"}
                </p>
                <p className="text-sm-text text-gray-600 leading-snug truncate">
                  {customer.address || "No address provided"}
                </p>
              </div>
            ) : (
              <p className="text-sm-text font-medium text-text-dark/70 italic">No customer selected</p>
            )}
          </div>

          {/* SERVICES LIST */}
          <div>
            <h4 className="text-sm-text font-medium text-text-dark/70 mb-2">Services ({selectedServices.length})</h4>
            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {selectedServices.map((service, index) => (
                <div key={service.id || index} className="flex justify-between items-start">
                  <p className="text-base-text font-medium text-text-dark tracking-tight truncate max-w-[150px]">{service.service_name}</p>
                  <p className={`text-base-text font-bold tracking-tight ${service.is_reward ? "text-green-700" : "text-text-dark"}`}>
                    ₱{Number(service.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-1 mt-4 border-t border-dashed pt-3">
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
              placeholder="Add any special notes..."
              className="w-full p-3 rounded-lg border border-gray-300 text-sm-text focus:ring-app-dark/80 focus:border-app-dark/80 outline-none min-h-[50px] resize-none custom-scrollbar"
            />
          </div>

          {/* HANDOVER METHOD */}
         {/* HANDOVER METHOD */}
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
        <IconHandover className="w-4 h-4" /> <span>PICK UP</span>
      </div>
    </label>

    {/* DELIVERY OPTION */}
    <label className="flex-1 relative cursor-pointer">
      <input 
        type="radio" 
        name="handover" 
        value="delivery" 
        checked={handoverMethod === 'delivery'} 
        onChange={() => {
          // 🛡️ BLOCK CHANGE IF ADDRESS IS EMPTY
          if (!customer.address || customer.address.trim() === "") {
            useNotificationStore.getState().showNotification("Customer address is required for delivery!", "error");
            // Focus the address input to help the staff
            document.getElementById("customer-address")?.focus();
            return;
          }
          setHandoverMethod('delivery');
        }} 
        className="sr-only" 
      />
      <div className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-micro font-bold transition-all duration-200 ${handoverMethod === 'delivery' ? 'bg-white text-app-dark shadow-sm ring-1 ring-black/5' : 'text-text-dark/40 hover:text-text-dark/60'}`}>
        <IconDelivery className="w-4 h-4" /> <span>DELIVERY</span>
      </div>
    </label>
  </div>

  <AnimatePresence>
    {handoverMethod === 'delivery' && (
      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="mt-1 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-text-dark/80">Delivery Fee (₱)</span>
          <span className="text-[9px] text-emerald-600 font-bold uppercase truncate max-w-[100px]">
            To: {customer.address}
          </span>
        </div>
        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 focus-within:border-app-dark transition-all">
          <input
            ref={deliveryInputRef}
            type="text"
            inputMode="numeric"
            value={deliveryFee === 0 ? "" : deliveryFee}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setDeliveryFee(val === "" ? 0 : Number(val));
            }}
            className="w-12 text-right bg-transparent outline-none font-bold text-app-dark/90 text-sm"
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
                <span className="text-sm-text font-medium text-text-dark/70 mb-1">Payment Status</span>
                <span className={`text-base-text font-bold tracking-tight ${isPaid ? 'text-green-700' : 'text-red-600'}`}>
                  {isPaid ? "Paid in Full" : "Unpaid"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextPaidState = !isPaid;
                  setIsPaid(nextPaidState);
                  if (!nextPaidState) setPaymentMethod(""); 
                }}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPaid ? 'bg-green-600' : 'bg-rose-500'}`}
              >
                <motion.div animate={{ x: isPaid ? 28 : 4 }} transition={SPRING_TRANSITION} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm flex items-center justify-center">
                  
                </motion.div>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isPaid && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }} className="overflow-visible"
                >
                  <div className="space-y-1 mb-4" ref={dropdownRef}>
                    <label className="text-sm-text font-medium text-text-dark/70 ml-1">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full h-11 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-base-text font-medium ${
                          isDropdownOpen ? "border-gray-900 ring-0" : "border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(selectedOption?.name)}
                          <span className="text-text-dark tracking-tight">
                            {selectedOption?.name || "Choose Method..."}
                          </span>
                        </div>
                        <motion.svg animate={{ rotate: isDropdownOpen ? 180 : 0 }} className="h-3.5 w-3.5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </button>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: dropdownDirection === "bottom" ? -5 : 5 }}
                            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`absolute left-0 right-0 z-[100] bg-white border border-gray-200 rounded-xl shadow-xl py-1 ${dropdownDirection === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}
                          >
                            {activeMethods.map((method) => ( // ✨ Used activeMethods here
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => { setPaymentMethod(method.name); setIsDropdownOpen(false); }}
                                className={`w-full px-4 py-2.5 text-left text-sm-text flex items-center justify-between ${paymentMethod === method.name ? "text-gray-900 font-bold bg-slate-50" : "hover:bg-gray-50"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-5 flex justify-center">{getPaymentIcon(method.name)}</div>
                                  <p className="truncate font-medium">{method.name}</p>
                                </div>
                                {paymentMethod === method.name && <IconCheckBlack className="h-3.5 w-3.5 text-text-dark" />}
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
                isOrderInvalid ? "bg-gray-300 cursor-not-allowed opacity-80" : "bg-green-700 hover:bg-green-600 active:scale-95"
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
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 z-[9999] bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-3 lg:hidden">
            <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-micro font-medium text-text-dark/70">Total Amount</span>
                <span className="text-h3 font-bold text-green-700 tracking-tighter truncate">
                  ₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button onClick={onSubmit} disabled={isOrderInvalid} className={`flex-1 h-12 text-base-text font-medium rounded-lg text-white ${isOrderInvalid ? "bg-gray-300 opacity-80" : "bg-green-700 active:scale-95"}`}>
                {getButtonText()}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};