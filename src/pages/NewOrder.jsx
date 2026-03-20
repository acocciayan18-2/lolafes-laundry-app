/**
 * @file NewOrder.jsx
 * @version 4.1.0 - Enterprise Edition
 * @description Orchestrates the New Order flow. Implements strict data gating,
 * dependency optimization, and fail-safe database synchronization.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback, forwardRef } from "react";
import { collection, getDocs, limit, query, where, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useNavigate } from "react-router-dom";

// --- Components & Stores ---
import { CustomerForm } from "../components/orders/CustomerForm";
import { LoyaltyStatus } from "../components/orders/LoyaltyStatus";
import { OrderSummary } from "../components/orders/OrderSummary";
import { ServiceSelector } from "../components/orders/ServiceSelector";
import ClearCartModal from "../components/orders/ClearCartModal";
import { NewOrderSkeleton } from "../components/skeleton-loader";
import StoreGuard from '../components/settings/StoreGuard';

import { db } from '../services/firebase';
import { silentPrint } from "../services/printerService"; 
import { useActivityStore } from "../store/activities/useActivityStore";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { useNewOrderStore } from "../store/new-order/useNewOrderStore";
import { useLoyaltyStore } from "../store/services/useLoyaltyStore";
import { useServiceStore } from "../store/services/useServiceStore";
import { useNotificationStore } from "../store/ui/useNotificationStore";
import { useSettingsStore } from "../store/settings/useSettingsStore";
import { useOrderStore } from "../store/orders/useOrderStore"; 
import { usePaymentSettingsStore } from "../store/settings/usePaymentSettingsStore"; 

// ==========================================
// 🛡️ UTILITY & SECURITY HELPERS
// ==========================================

const sanitizeString = (str, maxLen = 200) => {
  if (typeof str !== 'string') return "";
  return str.replace(/[<>]/g, "").trim().substring(0, maxLen);
};

const parseMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

const generateUniqueOrderNumber = async (maxRetries = 5) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const randomStr = (source, len) => Array.from({ length: len }, () => source[Math.floor(Math.random() * source.length)]).join('');
  
  for (let i = 0; i < maxRetries; i++) {
    const newID = `ORD-${randomStr(letters, 3)}${randomStr(numbers, 3)}`;
    try {
      const q = query(collection(db, "orders"), where("order_number", "==", newID), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return newID;
    } catch (err) {
      console.error("[Database] Collision check failed:", err);
    }
  }
  throw new Error("System is currently busy. Please try generating the order again.");
};

// ==========================================
// ⚛️ ATOMIC UI COMPONENTS (Memoized)
// ==========================================

const Button = React.memo(({ children, variant = "primary", size = "md", className = "", disabled, isLoading, ...props }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    default: "bg-app-dark text-white",
    yellow: "bg-yellow-500 text-white hover:bg-yellow-600",
    ghost: "text-red-500 hover:bg-red-50",
    warning: "bg-amber-500 text-white hover:bg-amber-600"
  };
  const sizes = { sm: "px-3 py-1 text-micro", md: "px-4 py-2 text-sm-text", icon: "p-2" };
  
  return (
    <button 
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`rounded-lg  transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${variants[variant]} ${sizes[size]} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${className}`} 
      {...props}
    >
      {isLoading ? "Processing..." : children}
    </button>
  );
});
Button.displayName = "Button";

const Input = forwardRef(({ label, id, className = "", disabled, ...props }, ref) => (
  <div className="w-full space-y-1">
    {label && (
      <label htmlFor={id} className={`text-sm-text  ml-1 ${disabled ? "text-text-dark/40" : "text-text-dark"}`}>
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      disabled={disabled}
      className={`
        w-full h-11 px-4 rounded-xl border border-gray-300 transition-all
        text-sm-text text-text-dark 
        outline-none focus:outline-none focus:ring-0 focus:ring-transparent
        focus:border-gray-500 placeholder:text-text-dark/40
        ${disabled ? "bg-slate-50 cursor-not-allowed opacity-70" : "bg-white"}
        ${className}
      `}
      {...props}
    />
  </div>
));
Input.displayName = "Input";

const Badge = React.memo(({ children, className = "" }) => (
  <span className={`px-2 py-0.5 rounded-full text-micro font-bold border ${className}`}>{children}</span>
));
Badge.displayName = "Badge";

// ==========================================
// 🧩 MAIN COMPONENT
// ==========================================

export default function NewOrder() {
  const navigate = useNavigate();
  
  // --- GLOBAL STORES ---
  const settings = useOrderStore((state) => state.settings);
  const { customers, subscribeToCustomers } = useCustomerStore();
  const { loyaltySettings, subscribeToLoyalty } = useLoyaltyStore();
  const { submitOrder, createCustomer } = useNewOrderStore(); 
  const { services, isLoading, subscribeToServices } = useServiceStore();
  const { receiptConfig, systemConfig } = useSettingsStore();
  const { methods, fetchPaymentMethods } = usePaymentSettingsStore();
  
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);
  
  // --- LOCAL STATE ---
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearWarning, setShowClearWarning] = useState(false);

  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isWalkInGuest, setIsWalkInGuest] = useState(false); 
  const [selectedServices, setSelectedServices] = useState([]);
  
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [handoverMethod, setHandoverMethod] = useState('pickup');
  const [deliveryFee, setDeliveryFee] = useState(0); 
  const [amountTendered, setAmountTendered] = useState("");

  // --- REFS (For Race-Condition Prevention) ---
  const prevCustomerRef = useRef(customer);
  const prevCustomerIdRef = useRef(selectedCustomerId);
  const prevWalkInRef = useRef(isWalkInGuest); 
  const isMounted = useRef(false);

  // --- LIFECYCLE ---
  useEffect(() => {
    isMounted.current = true;
    const unsubServices = subscribeToServices();
    const unsubLoyalty = subscribeToLoyalty();
    const unsubPayments = fetchPaymentMethods(); 
    const unsubCustomers = subscribeToCustomers ? subscribeToCustomers() : () => {};
    
    return () => { 
      isMounted.current = false;
      if (typeof unsubServices === 'function') unsubServices(); 
      if (typeof unsubLoyalty === 'function') unsubLoyalty(); 
      if (typeof unsubPayments === 'function') unsubPayments(); 
      if (typeof unsubCustomers === 'function') unsubCustomers();
    };
  }, [subscribeToServices, subscribeToLoyalty, subscribeToCustomers, fetchPaymentMethods]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => { if (isMounted.current) setShouldShowSkeleton(true); }, 300);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // --- 🛡️ GATING LOGIC (MEMOIZED) ---
  const safeCustomers = useMemo(() => Array.isArray(customers) ? customers : [], [customers]);
  const activePaymentMethods = useMemo(() => Array.isArray(methods) ? methods.filter(m => m.isActive) : [], [methods]);
  const selectedCustomerData = useMemo(() => selectedCustomerId ? safeCustomers.find(c => c.id === selectedCustomerId) : null, [selectedCustomerId, safeCustomers]);

  // ✨ SECURITY FIX: Walk-in strictly requires Name. Regular requires Name + Phone.
  const isFormIncomplete = useMemo(() => {
    const isNameValid = (customer?.name || "").trim().length >= 2;
    const isPhoneValid = (customer?.phone || "").replace(/\D/g, '').length >= 11;
    
    return isWalkInGuest ? !isNameValid : (!isNameValid || !isPhoneValid);
  }, [customer?.name, customer?.phone, isWalkInGuest]);

  const isPhoneDuplicate = useMemo(() => {
    if (isWalkInGuest || !customer?.phone) return false; 
    const inputPhoneClean = String(customer.phone).replace(/\D/g, "");
    return safeCustomers.some(c => {
      const dbPhoneClean = String(c.phone || "").replace(/\D/g, "");
      return dbPhoneClean === inputPhoneClean && c.id !== selectedCustomerId;
    });
  }, [safeCustomers, customer?.phone, selectedCustomerId, isWalkInGuest]);

  useEffect(() => {
    if (!paymentMethod && activePaymentMethods.length > 0) {
      const defaultMethod = activePaymentMethods.find(m => m.isDefault) || activePaymentMethods[0];
      setPaymentMethod(defaultMethod.name);
    }
  }, [activePaymentMethods, paymentMethod]);


  // --- CART CLEARING LOGIC ---
  useEffect(() => {
    const hasItems = selectedServices.length > 0;
    const idChanged = prevCustomerIdRef.current !== selectedCustomerId;
    const walkInChanged = prevWalkInRef.current !== isWalkInGuest;
    const nameChanged = prevCustomerRef.current.name !== customer.name && prevCustomerRef.current.name !== "";
    const phoneChanged = prevCustomerRef.current.phone !== customer.phone && prevCustomerRef.current.phone !== "";

    if (hasItems && (idChanged || nameChanged || phoneChanged || walkInChanged) && !isProcessing) {
      setShowClearWarning(true);
    } else {
      prevCustomerRef.current = { ...customer };
      prevCustomerIdRef.current = selectedCustomerId; 
      prevWalkInRef.current = isWalkInGuest; 
    }
  }, [customer, selectedCustomerId, isWalkInGuest, selectedServices.length, isProcessing]);

  const handleConfirmClear = useCallback(() => {
    setSelectedServices([]); 
    prevCustomerRef.current = { ...customer }; 
    prevCustomerIdRef.current = selectedCustomerId; 
    prevWalkInRef.current = isWalkInGuest; 
    setShowClearWarning(false);
  }, [customer, selectedCustomerId, isWalkInGuest]);

  const handleCancelClear = useCallback(() => {
    setCustomer(prevCustomerRef.current); 
    setSelectedCustomerId(prevCustomerIdRef.current); 
    setIsWalkInGuest(prevWalkInRef.current); 
    setShowClearWarning(false);
  }, []);

  // --- LOYALTY REWARDS HANDLER ---
  const handleApplyReward = useCallback(() => {
    if (isProcessing || isWalkInGuest) return; 
    
    const hasReward = selectedServices.some(s => s.is_reward);
    if (hasReward || !loyaltySettings?.is_enabled) return;
    
    const currentData = selectedCustomerData || customer;
    const points = Number(currentData.loyalty_points ?? currentData.order_count) || 0;
    const required = Math.max(1, Number(loyaltySettings.orders_required) || 10); 
    
    if (Math.floor(points / required) <= 0) {
        showNotification("Insufficient points for reward.", "error");
        return;
    }
    
    const freeService = {
      id: `reward-${Date.now()}`, 
      service_name: `${loyaltySettings.free_service_type} (Reward)`,
      service_type: loyaltySettings.free_service_type,
      quantity: 1, price_per_kg: 0, subtotal: 0, is_reward: true 
    };
    setSelectedServices(prev => [...prev, freeService]);
    showNotification("Reward applied!", "success");
  }, [selectedServices, loyaltySettings, selectedCustomerData, customer, showNotification, isProcessing, isWalkInGuest]);


  // --- 🚀 ORCHESTRATOR: ORDER SUBMISSION ---
  const handleSubmit = useCallback(async () => {
    if (isProcessing) return;

    // ✨ FRONTEND GATEKEEPERS
    if (isFormIncomplete) {
      showNotification(isWalkInGuest ? "Please provide a valid Customer Name." : "Please complete Customer Name and a valid 11-digit Contact Number.", "error");
      return;
    }
    if (isPaid && !paymentMethod) {
      showNotification("Please select a payment method to proceed.", "error");
      return;
    }
    if (selectedServices.length === 0) {
      showNotification("Please select at least one service to proceed.", "error");
      return;
    }
    if (isPhoneDuplicate) {
      showNotification("This phone number is already registered to another customer.", "error");
      return;
    }
    if (handoverMethod === 'delivery' && !customer?.address?.trim()) {
      showNotification("Please provide a delivery address.", "error");
      return;
    }

    setIsProcessing(true);

    try {
      const uniqueOrderNumber = await generateUniqueOrderNumber();
      let finalCustomerId = selectedCustomerId;
      
      // ✨ SANITIZATION: Clean all inputs before DB entry
      const cleanName = sanitizeString(customer.name, 100);
      const cleanPhone = isWalkInGuest ? "" : (customer.phone || "").replace(/\D/g, '').substring(0, 15);
      const cleanAddress = sanitizeString(customer.address, 200);
      const cleanNotes = sanitizeString(notes, 500);

      // Create profile for new regular customers
      if (!isWalkInGuest && !finalCustomerId) {
        const newCust = await createCustomer({
          name: cleanName, 
          phone: cleanPhone,
          address: cleanAddress,
          order_count: 0, 
          loyalty_points: 0
        });
        finalCustomerId = newCust.id;
      }
      
      // Calculate Financials securely
      const subtotal = selectedServices.reduce((sum, s) => sum + parseMoney(s.subtotal), 0);
      const finalDeliveryFee = handoverMethod === 'delivery' ? parseMoney(deliveryFee) : 0;
      const totalAmount = parseMoney(subtotal + finalDeliveryFee);
      
      // Calculate Loyalty parameters
      const rewardItems = selectedServices.filter(s => s.is_reward);
      const isRewardClaimed = rewardItems.length > 0 && !isWalkInGuest;
      const pointsRequiredPerReward = Math.max(1, Number(loyaltySettings?.orders_required) || 10);
      const totalPointsToDeduct = isWalkInGuest ? 0 : rewardItems.length * pointsRequiredPerReward;

      const isCashPayment = paymentMethod && paymentMethod.toLowerCase().includes('cash');
      const finalAmountTendered = isPaid && isCashPayment ? parseMoney(amountTendered) : totalAmount;
      const finalChangeDue = isPaid && isCashPayment ? Math.max(0, parseMoney(finalAmountTendered - totalAmount)) : 0;

      const orderPayload = {
        customer_id: isWalkInGuest ? null : finalCustomerId, 
        customer_name: cleanName,
        customer_phone: cleanPhone,
        customer_address: cleanAddress,
        is_walk_in: isWalkInGuest, 
        order_number: uniqueOrderNumber, 
        total_amount: totalAmount,
        handover_method: handoverMethod === 'delivery' ? 'delivery' : 'pickup', 
        delivery_fee: finalDeliveryFee,
        notes: cleanNotes, 
        payment_method: isPaid ? sanitizeString(paymentMethod, 50) : "Unpaid",
        is_paid: Boolean(isPaid),
        loyalty_points_to_deduct: totalPointsToDeduct,
        amount_tendered: finalAmountTendered,
        change_due: finalChangeDue,
        services: selectedServices.map(s => ({
          service_id: String(s.id), 
          service_name: sanitizeString(s.service_name, 100), 
          quantity: Math.max(1, Number(s.quantity) || 1),
          price_per_kg: parseMoney(s.price_per_kg), 
          subtotal: parseMoney(s.subtotal), 
          is_reward: Boolean(s.is_reward)
        })),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(), 
        status: 'pending'
      };

      await submitOrder(orderPayload);

      // Post-Order Synchronization (Best Effort)
      try {
        if (!isWalkInGuest && finalCustomerId) {
          const customerRef = doc(db, "customers", finalCustomerId);
          await updateDoc(customerRef, { order_count: increment(1) });

          if (isRewardClaimed) {
            const rewardPromises = rewardItems.map(item => 
              addDoc(collection(db, "reward_logs"), {
                customer_id: finalCustomerId,
                customer_name: cleanName,
                order_number: uniqueOrderNumber,
                reward_name: item.service_name,
                points_spent: pointsRequiredPerReward,
                timestamp: serverTimestamp() 
              })
            );
            await Promise.all(rewardPromises);
          }
        }
      } catch (secondaryErr) {
        console.error("[Post-Order Sync Error]: Backend synchronization failed.", secondaryErr);
      }

      // Log Activity to Audit Trail
      logActivity(orderPayload, 'pending', { 
        action: 'create_order', 
        label: `Order #${uniqueOrderNumber} created for ${cleanName}` 
      });

      // Hardware execution
      if (systemConfig?.autoPrint === true) {
        try {
          const printableOrder = { ...orderPayload, created_at: new Date() };
          await silentPrint(printableOrder, settings.defaultPrinter || 'browser', receiptConfig);
        } catch (printErr) {
          showNotification("Order saved, but printer failed to connect.", "info");
        }
      }

      showNotification(`Order ${uniqueOrderNumber} created!`, "success");
      navigate("/main/orders");

    } catch (err) {
      console.error("Submit Error:", err);
      if (isMounted.current) {
        setIsProcessing(false);
        showNotification(err.message || "Failed to save order. Please check your connection.", "error");
      }
    }
  }, [
    isProcessing, isFormIncomplete, isPaid, paymentMethod, selectedServices, isPhoneDuplicate, 
    customer, selectedCustomerId, handoverMethod, deliveryFee, notes, loyaltySettings?.orders_required, 
    amountTendered, isWalkInGuest, submitOrder, createCustomer, systemConfig?.autoPrint, 
    settings.defaultPrinter, receiptConfig, navigate, showNotification, logActivity
  ]);

  // --- RENDER ---
  if (isLoading && shouldShowSkeleton) return <NewOrderSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

 return (
  <StoreGuard> 
    <main className="min-h-screen bg-app-light p-2 relative" aria-busy={isProcessing}>
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/0 rounded-xl cursor-wait" aria-hidden="true" />
      )}

      <div className="max-w-6xl mx-auto px-1 md:px-2 relative">
        <header className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <h1 className="text-h2 text-text-dark">New Order</h1>
            <p className="text-sm-text text-gray-600 font-normal mt-0.5">Create a new laundry order</p>
          </div>
        </header>

        <div className={`grid lg:grid-cols-5 gap-4 items-start transition-opacity duration-300 ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
          
          <div className="lg:col-span-3 space-y-4">
            <section id="step-customer" aria-label="Customer Information">
              <CustomerForm 
                customer={customer} setCustomer={setCustomer}
                selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
                allCustomers={safeCustomers} Button={Button} Input={Input}
                isSubmitting={isProcessing} 
                isWalkInGuest={isWalkInGuest} 
                setIsWalkInGuest={setIsWalkInGuest}
              />
            </section>
            
            {selectedCustomerData && !isWalkInGuest && (
              <section id="step-loyalty" className="animate-in fade-in slide-in-from-top-2 duration-300" aria-label="Loyalty Rewards">
                <LoyaltyStatus 
                  customer={selectedCustomerData} 
                  loyaltySettings={loyaltySettings} 
                  Button={Button} Badge={Badge}
                  onApplyFreeService={handleApplyReward}
                  selectedServices={selectedServices} 
                  isSubmitting={isProcessing} 
                />
              </section>
            )}
            
            <section id="step-services" aria-label="Service Selection">
              <ServiceSelector 
                services={services} 
                selectedServices={selectedServices} 
                setSelectedServices={setSelectedServices}  
                Button={Button} 
                Badge={Badge}
                isCustomerIncomplete={isFormIncomplete} 
                isSubmitting={isProcessing} 
              />
            </section>
          </div>

          <aside className="lg:col-span-2" aria-label="Order Summary">
            <div id="step-summary">
              <OrderSummary 
                customer={customer} 
                selectedServices={selectedServices}
                notes={notes} 
                setNotes={setNotes}
                paymentMethod={paymentMethod} 
                setPaymentMethod={setPaymentMethod}
                availableMethods={activePaymentMethods}
                isPaid={isPaid} 
                setIsPaid={setIsPaid}
                handoverMethod={handoverMethod} 
                setHandoverMethod={setHandoverMethod}
                deliveryFee={deliveryFee} 
                setDeliveryFee={setDeliveryFee}
                amountTendered={amountTendered}
                setAmountTendered={setAmountTendered}
                onSubmit={handleSubmit} 
                isProcessing={isProcessing} 
                Button={Button} 
                isPhoneDuplicate={isPhoneDuplicate}
                isWalkInGuest={isWalkInGuest} 
              />
            </div>
          </aside>
        </div>
      </div>

      <ClearCartModal 
        isOpen={showClearWarning && !isProcessing} 
        onCancel={handleCancelClear}
        onConfirm={handleConfirmClear}
      />
    </main>
  </StoreGuard>
 );
}