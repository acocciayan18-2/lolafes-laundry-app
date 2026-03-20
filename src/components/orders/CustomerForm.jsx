import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useCustomerStore } from "../../store/customer/useCustomerStore";
import { IconSearch, IconUserPlus, IconUsers, IconUserOff } from "../icons";

import "../../style/custom-scrollbar.css";

// ==========================================
// UTILITY HELPERS
// ==========================================

const sanitizeAndFormatPhone = (val) => {
  if (typeof val !== 'string') return "";
  let cleanVal = val;
  if (cleanVal.startsWith('+63')) cleanVal = '0' + cleanVal.substring(3);
  if (cleanVal.startsWith('63')) cleanVal = '0' + cleanVal.substring(2);
  cleanVal = cleanVal.replace(/\D/g, ''); 
  if (cleanVal.startsWith('9')) cleanVal = '0' + cleanVal; 
  return cleanVal.substring(0, 11); 
};

const capitalizeWords = (val) => {
  if (typeof val !== 'string') return "";
  return val.replace(/\b\w/g, (char) => char.toUpperCase());
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export const CustomerForm = ({
  customer,
  setCustomer,
  selectedCustomerId,
  setSelectedCustomerId,
  Button,
  Input,
  isSubmitting,
  isWalkInGuest, 
  setIsWalkInGuest 
}) => {
  // --- LOCAL STATE ---
  const [showExistingCustomers, setShowExistingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // --- GLOBAL STATE ---
  const { customers, subscribeToCustomers, isLoading } = useCustomerStore();

  // --- REFS ---
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const isMounted = useRef(true);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToCustomers();
    } catch (error) {
      console.error("[CustomerForm] Failed to subscribe to customers:", error);
    }

    return () => {
      isMounted.current = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToCustomers]);

  // --- DERIVED STATE (MEMOIZED) ---

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    
    const safeCustomers = customers.filter(c => c && typeof c.name === 'string');
    const safeTerm = (searchTerm || "").trim().toLowerCase();
    let filtered = safeCustomers;
    
    if (safeTerm) {
      filtered = safeCustomers.filter((c) => {
        const cName = c.name.toLowerCase();
        const cPhone = c.phone || "";
        return cName.includes(safeTerm) || cPhone.includes(safeTerm);
      });
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTerm]);

  // Validation Logic (Bypassed if Walk-In)
  const phoneVal = customer?.phone || "";
  const isPhoneIncomplete = !isWalkInGuest && phoneVal.length > 0 && phoneVal.length < 11;
  const isPhoneValidFormat = phoneVal.length === 11 && phoneVal.startsWith("09");
  
  const duplicateCustomer = useMemo(() => {
    if (isSubmitting || isWalkInGuest || phoneVal.length < 11 || !Array.isArray(customers)) return null;
    
    const inputPhoneClean = phoneVal.replace(/\D/g, "");
    return customers.find(c => {
      if (!c) return false;
      const dbPhoneClean = String(c.phone || "").replace(/\D/g, "");
      return dbPhoneClean === inputPhoneClean && c.id !== selectedCustomerId;
    });
  }, [customers, phoneVal, selectedCustomerId, isSubmitting, isWalkInGuest]);

  const isPhoneDuplicate = !!duplicateCustomer;
  const isPhoneInvalid = !isWalkInGuest && (isPhoneIncomplete || (phoneVal.length === 11 && !isPhoneValidFormat)) && !selectedCustomerId;

  // --- HANDLERS ---

  const handleNameKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      if (!isWalkInGuest && phoneInputRef.current) {
        phoneInputRef.current.focus();
      } else if (isWalkInGuest && addressInputRef.current) {
        addressInputRef.current.focus();
      }
    }
  }, [isWalkInGuest]);

  const handlePhoneKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addressInputRef.current?.focus();
    }
  }, []);

  const handlePhoneChange = useCallback((e) => {
    const formattedPhone = sanitizeAndFormatPhone(e.target.value);
    setCustomer(prev => ({ ...prev, phone: formattedPhone }));
  }, [setCustomer]);

  const handleTextChange = useCallback((field, value) => {
    const capitalized = capitalizeWords(value);
    setCustomer(prev => ({ ...prev, [field]: capitalized }));
  }, [setCustomer]);

  const selectCustomer = useCallback((c) => {
    if (!c) return;
    setCustomer({ name: c.name || "", phone: c.phone || "", address: c.address || "" });
    setSelectedCustomerId(c.id);
    setShowExistingCustomers(false);
    setSearchTerm(""); 
  }, [setCustomer, setSelectedCustomerId]);

  const handleAddNew = useCallback(() => {
    setShowExistingCustomers(false);
    setSelectedCustomerId(null);
    setCustomer({ name: "", phone: "", address: "" });
  }, [setCustomer, setSelectedCustomerId]);

  // ✨ HANDLER FIX: Do not auto-fill "Walk-In Guest". Force the cashier to ask for a name.
  const handleWalkInToggle = useCallback((isNowWalkIn) => {
    setIsWalkInGuest(isNowWalkIn);
    setShowExistingCustomers(false);
    setSelectedCustomerId(null);
    setCustomer({ name: "", phone: "", address: "" });
  }, [setCustomer, setSelectedCustomerId, setIsWalkInGuest]);

  // --- UI HELPERS ---
  const isExistingActive = !isWalkInGuest && (showExistingCustomers || selectedCustomerId !== null);
  const isAddNewActive = !isWalkInGuest && (!showExistingCustomers && selectedCustomerId === null);
  const focusClasses = "focus:outline-none focus-visible:ring-1 border-gray-300";

  return (
    <section className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden" aria-labelledby="customer-form-title">
      <header className="p-4 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex items-center gap-2">
            <h3 id="customer-form-title" className="flex items-center gap-2 text-h3 font-bold text-text-dark">
              <IconUsers className="w-6 h-6 !text-app-dark !stroke-app-dark" aria-hidden="true" />
              Customer
            </h3>
              
            <AnimatePresence>
              {selectedCustomerId && !isWalkInGuest && (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="px-3 py-1 rounded-full text-micro font-bold bg-emerald-100 text-emerald-800 hidden sm:inline-block"
                  role="status"
                >
                  Existing Customer
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <IconUserOff className={` w-4 h-4 !mr-[-4px] transition-colors ${isWalkInGuest ? 'text-emerald-600' : 'text-gray-400'}`} aria-hidden="true"/>
            <span className={`text-sm-text  transition-colors ${isWalkInGuest ? 'text-emerald-600' : 'text-gray-400'}`} aria-hidden="true">
              Walk-In
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isWalkInGuest}
              onClick={() => handleWalkInToggle(!isWalkInGuest)}
              disabled={isSubmitting}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark focus-visible:ring-offset-2 ${
                isWalkInGuest ? 'bg-emerald-500' : 'bg-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Toggle Walk-In Guest Mode (Disables Loyalty)"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isWalkInGuest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

        </div>
      </header>

      <div className="p-4 space-y-2">
        <nav className="flex flex-wrap gap-2 pb-1" aria-label="Customer Entry Mode">
  <Button
    variant={isExistingActive ? "default" : "outline"}
    size="md"
    onClick={() => setShowExistingCustomers(true)}
    disabled={isSubmitting || isWalkInGuest} 
    aria-pressed={isExistingActive}
    className="transition-all !px-4 text-sm-text outline-none"
  >
    <IconSearch className="w-4 h-4 mr-2" aria-hidden="true" />
    Select Existing
  </Button>

  <Button
    variant={isAddNewActive ? "default" : "outline"}
    size="md"
    onClick={handleAddNew}
    disabled={isSubmitting || isWalkInGuest} 
    aria-pressed={isAddNewActive}
    className="transition-all !px-4 text-sm-text outline-none"
  >
    <IconUserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
    Add New
  </Button>
</nav>

        <div className="relative overflow-hidden mt-2">
          <AnimatePresence mode="wait">
            {showExistingCustomers && !isWalkInGuest ? (
              <motion.div key="existing" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                 <div className="relative">
                  <Input id="customer-search" placeholder={isLoading ? "Loading customers..." : "Search by name or phone..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`text-sm-text ${focusClasses}`} disabled={isLoading || isSubmitting} aria-busy={isLoading}/>
                 </div>
                 <div className="max-h-40 overflow-y-auto bg-gray-50/50 rounded-xl p-1 border border-gray-100 custom-scrollbar" role="listbox">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <button key={c.id} role="option" aria-selected={selectedCustomerId === c.id} onClick={() => selectCustomer(c)} disabled={isSubmitting} className="w-full text-left p-3 rounded-lg transition-colors hover:bg-blue-50 group disabled:opacity-50">
                        <p className="text-sm-text font-bold text-text-dark group-hover:text-btn-primary">{c.name}</p>
                        <p className="text-sm-text text-text-dark/70">{c.phone}</p>
                      </button>
                    ))
                  ) : (
                    <motion.p className="text-center text-micro text-gray-400 py-10 font-normal">{isLoading ? "Fetching cloud data..." : "No customers found"}</motion.p>
                  )}
                 </div>
              </motion.div>
            ) : (
              <fieldset className="space-y-1 m-0 p-0 border-none" disabled={isSubmitting}>
                <legend className="sr-only">Customer Details Form</legend>
                
                <div className={`grid gap-2 h-fit ${isWalkInGuest ? "grid-cols-1" : "md:grid-cols-2"}`}>
                  
                  {/* ✨ FIX: Name Input is ALWAYS required now */}
                  <Input
                    label="Customer Name *"
                    value={customer?.name || ""}
                    id="customer-name"
                    required={true}
                    readOnly={!!selectedCustomerId}
                    onChange={(e) => handleTextChange('name', e.target.value)}
                    onKeyDown={handleNameKeyDown} 
                    enterKeyHint="next"
                    placeholder={isWalkInGuest ? "Enter Customer Name" : "Enter Customer Name"}
                    className={`text-sm-text ${
                      selectedCustomerId
                        ? "focus:outline-none bg-gray-50 cursor-not-allowed text-gray-700 border-gray-200" 
                        : focusClasses
                    }`}
                  />
                  
                  {/* Phone Input vanishes during Walk-In */}
                  {!isWalkInGuest && (
                    <div className="flex flex-col relative">
                      <Input
                        ref={phoneInputRef}
                        type="tel"
                        required={true}
                        inputMode="numeric"
                        label="Contact Number *"
                        value={customer?.phone || ""}
                        id="customer-phone"
                        readOnly={!!selectedCustomerId}
                        onChange={handlePhoneChange}
                        onKeyDown={handlePhoneKeyDown} 
                        enterKeyHint="next"
                        placeholder="09XX XXX XXXX"
                        aria-invalid={isPhoneInvalid || isPhoneDuplicate}
                        className={`text-sm-text transition-all ${
                          selectedCustomerId
                            ? "bg-gray-50 cursor-not-allowed placeholder-transparent" 
                            : isPhoneInvalid || isPhoneDuplicate
                              ? "!border-rose-500 !text-rose-600 !bg-rose-50"
                              : isPhoneValidFormat 
                                ? "!border-emerald-500 !bg-emerald-50/30" 
                                : focusClasses
                        }`}
                      />
                      
                      <div className="mt-1" aria-live="polite" aria-atomic="true">
                        <AnimatePresence>
                          {isPhoneDuplicate && (
                            <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className=" text-rose-600 text-micro ml-1 block" role="alert">Number already exists!</motion.span>
                          )}
                          {!isPhoneDuplicate && isPhoneIncomplete && (
                            <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className=" text-rose-600 text-micro ml-1 block" role="alert">Enter 11-digit number</motion.span>
                          )}
                          {!isPhoneDuplicate && phoneVal.length === 11 && !isPhoneValidFormat && (
                            <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className=" text-rose-600 text-micro ml-1 block" role="alert">Invalid Format (must start with 09)</motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Address Input remains Optional */}
                <Input
                  ref={addressInputRef}
                  label="Address"
                  id="customer-address"
                  value={customer?.address || ""}
                  readOnly={!!selectedCustomerId}
                  onChange={(e) => handleTextChange('address', e.target.value)}
                  enterKeyHint="done"
                  placeholder="Customer Address"
                  className={`text-sm-text ${
                    selectedCustomerId
                      ? "capitalize focus:outline-none bg-gray-50 cursor-not-allowed text-gray-700 border-gray-200" 
                      : focusClasses
                  }`}
                />
              </fieldset>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};