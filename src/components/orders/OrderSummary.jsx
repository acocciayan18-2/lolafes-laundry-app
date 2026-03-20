import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePaymentSettingsStore } from "../../store/settings/usePaymentSettingsStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import {
  IconCalculator,
  IconCheckBlack, 
  IconCreditCard, 
  IconDelivery,
  IconHandover,
  IconWallet
} from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const SPRING_TRANSITION = Object.freeze({
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
});

const MAX_NOTES_LENGTH = 500;
const CASH_DENOMINATIONS = Object.freeze([100, 500, 1000]); 

// ==========================================
// UTILITY HELPERS
// ==========================================
const safeMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

const getPaymentIcon = (name) => {
  if (!name || typeof name !== 'string') return <div className="w-4 h-4 rounded-full border-2 border-dashed border-text-dark/20" aria-hidden="true" />;
  const lowerName = name.toLowerCase();
  
  if (/\bcash\b/.test(lowerName)) return <IconWallet className="w-4 h-4 text-text-dark" aria-hidden="true" />;
  return <IconCreditCard className="w-4 h-4 text-text-dark" aria-hidden="true" />;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
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
  amountTendered = "",
  setAmountTendered = () => {}, 
  isWalkInGuest = false // ✨ NEW PROP: Bypasses phone validations
}) => {
  // --- REFS ---
  const dropdownRef = useRef(null);
  const deliveryInputRef = useRef(null);
  const cashInputRef = useRef(null);
  const isMounted = useRef(false);

  // --- GLOBAL STATE ---
  const { methods, fetchPaymentMethods } = usePaymentSettingsStore();
  const showNotification = useNotificationStore(state => state.showNotification);

  // --- LOCAL STATE ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState("bottom");
  const [localAmountTendered, setLocalAmountTendered] = useState("");
  
  const actualAmountTendered = amountTendered !== "" ? amountTendered : localAmountTendered;

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    let unsubscribe = () => {};

    try {
      if (typeof fetchPaymentMethods === 'function') {
        unsubscribe = fetchPaymentMethods();
      }
    } catch (err) {
      console.error("[OrderSummary] Failed to fetch payment methods:", err);
    }

    return () => { 
      isMounted.current = false;
      if (typeof unsubscribe === 'function') unsubscribe(); 
    };
  }, [fetchPaymentMethods]);

  useEffect(() => {
    if (handoverMethod === 'delivery') {
      const timer = setTimeout(() => {
        if (isMounted.current) deliveryInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [handoverMethod]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClickAndEsc = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setIsDropdownOpen(false);
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClickAndEsc);
    document.addEventListener("keydown", handleOutsideClickAndEsc);
    
    return () => {
      document.removeEventListener("mousedown", handleOutsideClickAndEsc);
      document.removeEventListener("keydown", handleOutsideClickAndEsc);
    };
  }, [isDropdownOpen]);

  useLayoutEffect(() => {
    if (isDropdownOpen && dropdownRef.current && isMounted.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropdownDirection(spaceBelow < 250 ? "top" : "bottom");
    }
  }, [isDropdownOpen]);

  // --- DERIVED STATE (MEMOIZED) ---
  const activeMethods = useMemo(() => {
    if (!Array.isArray(methods)) return [];
    return methods.filter(m => m && m.isActive);
  }, [methods]);

  useEffect(() => {
    if (isPaid && !paymentMethod && activeMethods.length > 0) {
      const defaultMethod = activeMethods.find(m => m.isDefault) || activeMethods[0];
      setPaymentMethod(defaultMethod.name);
    }
  }, [isPaid, paymentMethod, activeMethods, setPaymentMethod]);

  const subtotal = useMemo(() => {
    if (!Array.isArray(selectedServices)) return 0;
    return selectedServices.reduce((sum, s) => safeMoney(sum + safeMoney(s?.subtotal)), 0);
  }, [selectedServices]);
  
  const finalTotal = useMemo(() => {
    const fee = handoverMethod === 'delivery' ? safeMoney(deliveryFee) : 0;
    return safeMoney(subtotal + fee);
  }, [subtotal, handoverMethod, deliveryFee]);

  const changeDue = useMemo(() => {
    if (!isPaid || !actualAmountTendered) return 0;
    return Math.max(0, safeMoney(safeMoney(actualAmountTendered) - finalTotal));
  }, [actualAmountTendered, finalTotal, isPaid]);

  const isAmountInsufficient = useMemo(() => {
    if (!isPaid) return false;
    return safeMoney(actualAmountTendered) < finalTotal;
  }, [isPaid, actualAmountTendered, finalTotal]);

  // ✨ FIX: Strict Validations - Adjusted for Walk-In Bypass
  const isPhoneValid = useMemo(() => {
    if (isWalkInGuest) return true; // Automatically pass phone validation if Walk-In
    const phone = customer?.phone;
    return typeof phone === 'string' && phone.length === 11 && phone.startsWith("09");
  }, [customer?.phone, isWalkInGuest]);
  
  const isCustomerValid = useMemo(() => {
    const name = customer?.name || "";
    return !!(name.trim().length > 0 && isPhoneValid && !isPhoneDuplicate);
  }, [customer?.name, isPhoneValid, isPhoneDuplicate]);

  const isPaymentValid = useMemo(() => {
    if (!isPaid) return true;
    if (!paymentMethod || typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) return false;
    if (isAmountInsufficient) return false; 
    return true;
  }, [isPaid, paymentMethod, isAmountInsufficient]);
  
  const isOrderInvalid = isProcessing || !Array.isArray(selectedServices) || selectedServices.length === 0 || !isCustomerValid || !isPaymentValid;

  const selectedOption = useMemo(() => {
    return activeMethods.find(m => m.name === paymentMethod);
  }, [paymentMethod, activeMethods]);


  // --- HANDLERS ---
  const getButtonText = useCallback(() => {
    if (isProcessing) return "Processing...";
    if (isPhoneDuplicate && !isWalkInGuest) return "Number Already Exists";
    if (!customer?.name || !customer.name.trim()) return "Enter Customer Name"; 
    if (!isPhoneValid && !isWalkInGuest) return "Invalid Phone (11 Digits)";
    if (!Array.isArray(selectedServices) || selectedServices.length === 0) return "Add Services";
    if (isPaid && !paymentMethod) return "Select Payment Method";
    if (isAmountInsufficient) return "Insufficient Amount";
    return "Place Order";
  }, [isProcessing, isPhoneDuplicate, isWalkInGuest, customer?.name, isPhoneValid, selectedServices, isPaid, paymentMethod, isAmountInsufficient]);

  const handleNotesChange = useCallback((e) => {
    if (typeof setNotes !== 'function') return;
    const val = e.target.value.substring(0, MAX_NOTES_LENGTH);
    setNotes(val);
  }, [setNotes]);

  const handleDeliveryFeeChange = useCallback((e) => {
    if (typeof setDeliveryFee !== 'function') return;
    const val = e.target.value.replace(/\D/g, "").substring(0, 4);
    setDeliveryFee(val === "" ? 0 : Number(val));
  }, [setDeliveryFee]);

  const handleHandoverChange = useCallback((method) => {
    if (typeof setHandoverMethod !== 'function') return;

    if (method === 'delivery') {
      if (!customer?.address || customer.address.trim() === "") {
        showNotification("Customer address is required for delivery!", "error");
        document.getElementById("customer-address")?.focus();
        return;
      }
    }
    setHandoverMethod(method);
  }, [setHandoverMethod, customer?.address, showNotification]);

  const updateAmountTendered = useCallback((val) => {
    setLocalAmountTendered(val);
    setAmountTendered(val); 
  }, [setAmountTendered]);

  const togglePayment = useCallback(() => {
    const isStateReady = 
      typeof setIsPaid === 'function' && 
      typeof setPaymentMethod === 'function' && 
      typeof updateAmountTendered === 'function';

    if (!isStateReady) {
      console.error("[POS_CRITICAL]: Payment state setters are uninitialized.");
      return;
    }

    const nextPaidState = !isPaid;
    
    setIsPaid(nextPaidState);
    if (!nextPaidState) {
      setPaymentMethod(""); 
      updateAmountTendered("");
    }
  }, [isPaid, setIsPaid, setPaymentMethod, updateAmountTendered]);

  const handlePaymentSelect = useCallback((methodName) => {
    if (typeof setPaymentMethod !== 'function') return;
    setPaymentMethod(methodName);
    setIsDropdownOpen(false);
  }, [setPaymentMethod]);

  const handleCashInputChange = useCallback((e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) val = val.replace(/\.+$/, "");
    updateAmountTendered(val.substring(0, 6));
  }, [updateAmountTendered]);

  const handleQuickDenomination = useCallback((amount) => {
    updateAmountTendered(amount);
  }, [updateAmountTendered]);

  // --- RENDER ---
  return (
    <section aria-labelledby="summary-title" className="bg-white rounded-2xl shadow-md border border-gray-200 lg:sticky lg:top-6 z-30">
      <header className="p-4 !pb-0">
        <h3 id="summary-title" className="text-h3 font-bold text-text-dark flex items-center gap-2">
          <IconCalculator className="w-6 h-6 !text-emerald-700 !stroke-emerald-600" aria-hidden="true" />
          Order
        </h3>
      </header>

      <div className="p-4 space-y-3">
        
        {/* CUSTOMER CARD */}
        <article>
          <h4 className="text-sm-text font-medium text-text-dark/50 !mb-1">Customer Details</h4>
          <div className={`p-3 rounded-xl overflow-hidden border transition-colors ${!isCustomerValid && customer?.name ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            {customer?.name ? (
              <div className="space-y-1">
                <p className="text-base-text font-bold text-gray-900 leading-tight">
                  {customer.name} {isWalkInGuest && <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>}
                </p>
                <p className={`text-sm-text font-medium flex items-center gap-1 ${!isWalkInGuest && (!isPhoneValid || isPhoneDuplicate) ? 'text-red-600 font-bold' : 'text-text-dark'}`}>
                  {isWalkInGuest ? "Anonymous (No Phone)" : (customer.phone || "No contact number")}
                </p>
                <p className="text-sm-text text-gray-600 leading-snug truncate" title={customer.address}>
                  {customer.address || "No address provided"}
                </p>
              </div>
            ) : (
              <p className="text-sm-text font-medium text-text-dark/70 italic">No customer selected</p>
            )}
          </div>
        </article>

        {/* SERVICES LIST */}
        <article>
          <h4 className="text-sm-text font-medium text-text-dark/70 mb-2">
            Services ({Array.isArray(selectedServices) ? selectedServices.length : 0})
          </h4>
          <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2 pr-1" role="list">
            {Array.isArray(selectedServices) && selectedServices.map((service, index) => (
              <div key={service.id || index} role="listitem" className="flex justify-between items-start">
                <p className="text-base-text font-medium text-text-dark tracking-tight truncate max-w-[150px]" title={service.service_name}>
                  {service.service_name}
                </p>
                <p className={`text-base-text font-bold tracking-tight ${service.is_reward ? "text-emerald-700" : "text-text-dark"}`}>
                  ₱{safeMoney(service.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center gap-1 mt-4 border-t border-dashed pt-3" aria-live="polite">
            <span className="text-h3 font-bold text-emerald-700 leading-tight tracking-tight">Total Amount:</span>
            <motion.span key={finalTotal} className="text-h2 font-bold text-emerald-700 tracking-tighter">
              ₱{finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </motion.span>
          </div>
        </article>

        {/* NOTES SECTION */}
        <div className="space-y-1 !mt-1">
          <label htmlFor="order-notes" className="text-sm-text font-medium text-text-dark/70 ml-1">Special Instructions</label>
          <textarea
            id="order-notes"
            value={notes || ""}
            onChange={handleNotesChange}
            maxLength={MAX_NOTES_LENGTH}
            placeholder={`Add any special notes (max ${MAX_NOTES_LENGTH} chars)...`}
            className="w-full p-3 rounded-lg border border-gray-300 text-sm-text focus:ring-app-dark/80 focus:border-app-dark/80 outline-none min-h-[50px] resize-none custom-scrollbar"
          />
        </div>

        {/* HANDOVER METHOD */}
        <fieldset className="flex flex-col gap-2 !mt-1 border-none p-0 m-0">
          <legend className="text-sm-text font-medium text-text-dark/70 ml-1">Handover Method</legend>
          <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-[220px]" role="radiogroup">
            <label className="flex-1 relative cursor-pointer">
              <input 
                type="radio" 
                name="handover" 
                value="pickup" 
                checked={handoverMethod === 'pickup'} 
                onChange={() => handleHandoverChange('pickup')} 
                className="sr-only focus-visible:ring-2 focus-visible:ring-app-dark focus-visible:ring-offset-2" 
              />
              <div className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-micro font-bold transition-all duration-200 ${handoverMethod === 'pickup' ? 'bg-white text-app-dark shadow-sm ring-1 ring-black/5' : 'text-text-dark/40 hover:text-text-dark/60'}`}>
                <IconHandover className="w-4 h-4" aria-hidden="true" /> <span>PICK UP</span>
              </div>
            </label>

            <label className="flex-1 relative cursor-pointer">
              <input 
                type="radio" 
                name="handover" 
                value="delivery" 
                checked={handoverMethod === 'delivery'} 
                onChange={() => handleHandoverChange('delivery')} 
                className="sr-only focus-visible:ring-2 focus-visible:ring-app-dark focus-visible:ring-offset-2" 
              />
              <div className={`py-1.5 flex items-center justify-center gap-1.5 rounded-lg text-micro font-bold transition-all duration-200 ${handoverMethod === 'delivery' ? 'bg-white text-app-dark shadow-sm ring-1 ring-black/5' : 'text-text-dark/40 hover:text-text-dark/60'}`}>
                <IconDelivery className="w-4 h-4" aria-hidden="true" /> <span>DELIVERY</span>
              </div>
            </label>
          </div>

          <AnimatePresence>
            {handoverMethod === 'delivery' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="mt-1 flex items-center justify-between">
                <div className="flex flex-col min-w-0 ml-1"> 
                  <label htmlFor="delivery-fee" className="text-sm-text font-medium text-text-dark/80">
                    Delivery Fee (₱)
                  </label>
                  <span 
                    className="text-micro text-emerald-600 font-medium pb-1 capitalize truncate block w-full" 
                    title={customer?.address || "No address provided"}
                  >
                    To: {customer?.address || "N/A"}
                  </span>
                </div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 focus-within:border-app-dark focus-within:ring-1 focus-within:ring-app-dark transition-all">
                  <input
                    id="delivery-fee"
                    ref={deliveryInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={deliveryFee === 0 ? "" : deliveryFee}
                    placeholder="0"
                    onChange={handleDeliveryFeeChange}
                    className="w-12 text-right bg-transparent outline-none font-bold text-app-dark/90 text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>

        {/* PAYMENT SECTION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span id="payment-status-label" className="text-sm-text font-medium text-text-dark/70 mb-1">Payment Status</span>
              <span className={`text-base-text font-bold tracking-tight ${isPaid ? 'text-emerald-700' : 'text-red-600'}`} aria-live="polite">
                {isPaid ? "Paid in Full" : "Unpaid"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPaid}
              aria-labelledby="payment-status-label"
              onClick={togglePayment}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-dark ${isPaid ? 'bg-emerald-600' : 'bg-rose-500'}`}
            >
              <motion.div animate={{ x: isPaid ? 28 : 4 }} transition={SPRING_TRANSITION} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isPaid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }} 
                className="overflow-visible"
              >
                {/* Payment Method Dropdown */}
                <div className="space-y-1 mb-4" ref={dropdownRef}>
                  <label id="payment-method-label" className="text-sm-text font-medium text-text-dark/70 ml-1">
                    Payment Method <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      aria-haspopup="listbox"
                      aria-expanded={isDropdownOpen}
                      aria-labelledby="payment-method-label"
                      className={`w-full h-11 px-3 flex items-center justify-between bg-white border transition-all rounded-xl text-base-text font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark ${
                        isDropdownOpen ? "border-gray-900 ring-0" : "border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(selectedOption?.name)}
                        <span className="text-text-dark tracking-tight">
                          {selectedOption?.name || "Choose Method..."}
                        </span>
                      </div>
                      <motion.svg animate={{ rotate: isDropdownOpen ? 180 : 0 }} className="h-3.5 w-3.5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </motion.svg>
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: dropdownDirection === "bottom" ? -5 : 5 }}
                          animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          role="listbox"
                          className={`absolute left-0 right-0 z-[100] bg-white border border-gray-200 rounded-xl shadow-xl py-1 ${dropdownDirection === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}`}
                        >
                          {activeMethods.map((method) => {
                            const isSelected = paymentMethod === method.name;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handlePaymentSelect(method.name)}
                                className={`w-full px-4 py-2.5 text-left text-sm-text flex items-center justify-between focus:outline-none focus-visible:bg-slate-100 ${isSelected ? "text-gray-900 font-bold bg-slate-50" : "hover:bg-gray-50"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-5 flex justify-center">{getPaymentIcon(method.name)}</div>
                                  <p className="truncate font-medium">{method.name}</p>
                                </div>
                                {isSelected && <IconCheckBlack className="h-3.5 w-3.5 text-text-dark" aria-hidden="true" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="cash-received" className="text-sm-text font-medium text-emerald-800">
                      Amount Received
                    </label>
                    <span className={`text-sm-text font-medium ${isAmountInsufficient ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`} aria-live="polite">
                      {isAmountInsufficient ? "Insufficient" : changeDue > 0 ? `Change: ₱${changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "No change"}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600" aria-hidden="true">₱</span>
                    <input
                      id="cash-received"
                      ref={cashInputRef}
                      type="text"
                      inputMode="decimal"
                      value={actualAmountTendered}
                      onChange={handleCashInputChange}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-3 py-2.5 bg-white border rounded-lg font-bold text-sm-text transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                        isAmountInsufficient && actualAmountTendered !== "" ? "border-red-300 text-red-600" : "border-emerald-200 text-text-dark"
                      }`}
                    />
                  </div>

                  <div className="flex gap-1.5 mt-2" aria-label="Quick exact amounts">
                    <button 
                      type="button"
                      onClick={() => handleQuickDenomination(finalTotal)}
                      className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 text-micro font-medium rounded-md hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95"
                    >
                      Exact
                    </button>
                    {CASH_DENOMINATIONS.map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickDenomination(amount)}
                        className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 text-micro font-medium rounded-md hover:bg-emerald-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95"
                      >
                        ₱{amount}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <Button
            onClick={onSubmit}
            disabled={isOrderInvalid} 
            aria-busy={isProcessing}
            className={`w-full h-12 text-base-text !font-medium shadow-md border-0 rounded-lg mt-2 transition-all text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark focus-visible:ring-offset-2 ${
              isOrderInvalid ? "bg-gray-300 cursor-not-allowed opacity-80" : "bg-emerald-700 hover:bg-emerald-600 active:scale-95"
            }`}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </section>
  );
};