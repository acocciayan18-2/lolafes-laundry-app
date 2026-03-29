import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState, useRef, useCallback} from "react";
import { createPortal } from "react-dom";
import { IconWallet, IconClose } from "../icons";
import Button from "../ui/Button";

const getPaymentIcon = (name) => {
  if (!name || typeof name !== 'string') {
    return <div className="w-4 h-4 rounded-full border-2 border-dashed border-text-dark/20" aria-hidden="true" />;
  }
  // 🛡️ ENFORCEMENT: Universally return the wallet icon for all payment methods per requirements
  return <IconWallet className="w-5 h-5 text-text-dark/70" aria-hidden="true" />;
};

const formatSafeMoney = (val) => {
  const num = Number(val);
  if (isNaN(num) || num < 0) return "0.00";
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const PaymentUpdateModal = ({ isOpen, onClose, onConfirm, orderNumber, paymentMethods, totalAmount }) => {
  // --- STATE ---
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [portalNode, setPortalNode] = useState(null);
  
  const [tendered, setTendered] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");

  // --- REFS ---
  const isMounted = useRef(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null); // ✨ NEW: Ref for auto-focusing the tendered input

  // --- DERIVED STATE ---
  const safeMethods = Array.isArray(paymentMethods) ? paymentMethods : [];
  const parsedTotal = Number(totalAmount) || 0;
  const parsedTendered = Number(tendered);
  
  const isInsufficient = tendered !== "" && !isNaN(parsedTendered) && parsedTendered < parsedTotal;
  const changeDue = !isNaN(parsedTendered) && parsedTendered > parsedTotal ? parsedTendered - parsedTotal : 0;

  // --- HANDLERS (Hoisted before UseEffects) ---
  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isUpdating && typeof onClose === 'function') {
      onClose();
    }
  }, [isUpdating, onClose]);

  const handleTenderedChange = useCallback((e) => {
    let val = e.target.value.replace(/[^0-9.]/g, ''); 
    if ((val.match(/\./g) || []).length > 1) val = val.replace(/\.+$/, ""); 
    setTendered(val.substring(0, 8)); 
    setErrorMessage(null); 
  }, []);

  const handleQuickDenomination = useCallback((amount) => {
    setTendered(String(amount));
    setErrorMessage(null);
    inputRef.current?.focus(); // Return focus to input after quick select
  }, []);

  const handleMethodClick = useCallback((methodName) => {
    setSelectedMethod(methodName);
    setErrorMessage(null);
    inputRef.current?.focus(); // Return focus to input after changing method
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (isUpdating) return; 

    if (!selectedMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }
    
    const finalTendered = tendered !== "" && !isNaN(Number(tendered)) ? Number(tendered) : parsedTotal;

    // 🚨 ARCHITECTURE UPDATE: Require exact/over-payment for ALL methods, not just cash
    if (finalTendered < parsedTotal) {
      setErrorMessage(`Insufficient amount. Minimum required: ₱${formatSafeMoney(parsedTotal)}`);
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);
    
    try {
      if (typeof onConfirm !== 'function') throw new Error("Confirmation handler missing.");
      await onConfirm(selectedMethod, finalTendered);
    } catch (error) {
      if (isMounted.current) {
        console.error("[PaymentUpdateModal] Error:", error?.message || error);
        setErrorMessage(error?.message?.substring(0, 100) || "Update failed. Please try again.");
      }
    } finally {
      if (isMounted.current) {
        setIsUpdating(false);
      }
    }
  }, [isUpdating, selectedMethod, tendered, parsedTotal, onConfirm]);

  // --- LIFECYCLE & PORTAL SETUP ---
  useEffect(() => {
    isMounted.current = true;
    setPortalNode(document.body);
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsUpdating(false);
      setErrorMessage(null);
      setTendered(""); 
      
      if (safeMethods.length > 0) {
        const configuredDefault = safeMethods.find(m => m.isDefault === true || m.is_default === true);
        setSelectedMethod(configuredDefault ? configuredDefault.name : safeMethods[0].name);
      } else {
        setSelectedMethod("");
      }

      // ✨ NEW: Auto-focus the input 50ms after modal mounts to allow for animation
      const timer = setTimeout(() => {
        if (isMounted.current) inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, paymentMethods]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal Lifecycle Esc Guard
  const handleCloseRef = useRef(handleClose);

  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const previousFocus = document.activeElement;

    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isUpdating) {
        handleCloseRef.current?.(e);
      }
    };

    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = originalOverflow; 
      window.removeEventListener('keydown', handleEsc);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [isOpen, isUpdating]);

  // --- EARLY RETURN FOR SSR/PORTAL ---
  if (!portalNode) return null;

  // --- RENDER ---
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          onClick={handleClose} 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-app-dark/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <motion.div 
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()} 
            className="relative bg-white rounded-3xl p-4 shadow-2xl w-full max-w-[380px] max-h-[90dvh] h-fit overflow-hidden focus:outline-none flex flex-col"
          >
            {/* Header */}
            <header className="p-4 text-center relative">
              <button
                onClick={handleClose}
                disabled={isUpdating}
                className="absolute top-1 right-1 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <IconClose className="w-5 h-5" aria-hidden="true" />
              </button>

              <h3 id="payment-modal-title" className="text-sm-text  text-text-dark/90 mb-1">
                Collect Payment
              </h3>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-lg font-bold text-text-dark/50">₱</span>
                <span className="text-h2 font-bold text-emerald-600 leading-none">
                  {formatSafeMoney(totalAmount)}
                </span>
              </div>
              <p className="text-micro font-bold text-text-dark/60 mt-1.5">
                <span className="text-text-dark/90">#{orderNumber || "null"}</span>
              </p>
            </header>

            <div className="p-4 bg-white space-y-4">
              
              {/* ✨ MODIFIED: Unconditional Render of Amount Received */}
             <div>
                <label htmlFor="tendered-input" className="block text-sm-text text-text-dark/60 mb-1.5">
                  Amount Received 
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm-text text-text-dark/40">₱</span>
                  <input
                    id="tendered-input"
                    ref={inputRef} 
                    type="text"
                    inputMode="decimal"
                    value={tendered}
                    onChange={handleTenderedChange}
                    placeholder={formatSafeMoney(totalAmount)}
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-base-text text-text-dark transition-all focus:outline-none focus:bg-white ${isInsufficient ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30 text-rose-600' : 'focus:border-emerald-500 hover:border-slate-300'}`}
                  />
                </div>
                
                <div className="mt-2 mb-2 flex items-center justify-between px-1" aria-live="polite">
                  {isInsufficient ? (
                    <span className="text-rose-500 text-micro">Amount is less than total.</span>
                  ) : changeDue > 0 ? (
                    <>
                      <span className="text-micro text-text-dark/50">Change Due:</span>
                      <span className="font-bold text-emerald-600 text-sm-text">₱{formatSafeMoney(changeDue)}</span>
                    </>
                  ) : (
                    <span />
                  )}
                </div>

                {/* ✨ UPDATED QUICK DENOMINATION BUTTONS */}
                <div className="flex gap-1.5 mt-1.5">
                  <button 
                    type="button"
                    onClick={() => handleQuickDenomination(totalAmount)} 
                    className={`flex-1 py-2 text-micro rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      Number(tendered) === Number(totalAmount)
                        ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                        : "bg-white border border-slate-200 text-text-dark/90 hover:bg-emerald-50 font-normal"
                    }`}
                  >
                    Exact
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleQuickDenomination(100)} 
                    className={`flex-1 py-2 text-micro rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      Number(tendered) === 100
                        ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                        : "bg-white border border-slate-200 text-text-dark/90 hover:bg-emerald-50 font-normal"
                    }`}
                  >
                    ₱100
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleQuickDenomination(500)} 
                    className={`flex-1 py-2 text-micro rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      Number(tendered) === 500
                        ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                        : "bg-white border border-slate-200 text-text-dark/90 hover:bg-emerald-50 font-normal"
                    }`}
                  >
                    ₱500
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleQuickDenomination(1000)} 
                    className={`flex-1 py-2 text-micro rounded-md transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      Number(tendered) === 1000
                        ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-bold"
                        : "bg-white border border-slate-200 text-text-dark/90 hover:bg-emerald-50 font-normal"
                    }`}
                  >
                    ₱1000
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                    animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} 
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    role="alert"
                    className="p-2.5 bg-rose-50 text-rose-600 text-micro  rounded-lg border border-rose-100 text-center"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stacked Payment Methods */}
              <div className="pt-1.5 border-t border-slate-100">
                <p className="text-sm-text text-text-dark/70  mb-2">
                  Select Payment Method
                </p>
                <div className="flex flex-col gap-1.5 max-h-fit overflow-y-auto pr-1 custom-scrollbar" role="radiogroup" aria-label="Select Payment Method">
                  {safeMethods.length > 0 ? (
                    safeMethods.map((method) => {
                      const isSelected = selectedMethod === method.name;
                      return (
                        <button
                          key={method.id || method.name}
                          disabled={isUpdating}
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleMethodClick(method.name)}
                          className={`w-full p-2.5 flex items-center justify-between rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 active:scale-[0.98] ${
                            isSelected 
                              ? 'bg-emerald-50 border border-emerald-500 shadow-sm' 
                              : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center m" aria-hidden="true">
                              {getPaymentIcon(method.name)}
                            </div>
                            <span className={`block  text-sm-text transition-colors ${isSelected ? 'text-emerald-800' : 'text-text-dark'}`}>
                              {method.name}
                            </span>
                          </div>
                          
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 bg-white'}`} aria-hidden="true">
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-micro text-text-dark/40  border border-dashed border-slate-200 rounded-lg">
                      No active payment methods.
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex gap-2 w-full pt-2">
                <Button 
                  variant="success"
                  onClick={handleConfirmSubmit}
                  disabled={isUpdating || isInsufficient} 
                  className="flex-1 order-1 py-2.5 text-sm-text shadow-sm active:scale-95"
                >
                  {isUpdating ? "Processing..." : "Confirm Payment"}
                </Button>
                
                <Button 
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isUpdating}
                  className="flex-1 order-2 py-2.5 text-sm-text active:scale-95"
                >
                  Cancel
                </Button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalNode 
  );
};

export default PaymentUpdateModal;