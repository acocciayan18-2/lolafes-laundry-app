import { collection, getDocs, limit, query, where, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { useEffect, useRef, useState, useMemo, useCallback, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerForm } from "../components/orders/CustomerForm";
import { LoyaltyStatus } from "../components/orders/LoyaltyStatus";
import { OrderSummary } from "../components/orders/OrderSummary";
import { ServiceSelector } from "../components/orders/ServiceSelector";
import { db } from '../services/firebase';
import { useActivityStore } from "../store/activities/useActivityStore";
import { useCustomerStore } from "../store/customer/useCustomerStore";
import { useNewOrderStore } from "../store/new-order/useNewOrderStore";
import { useLoyaltyStore } from "../store/services/useLoyaltyStore";
import { useServiceStore } from "../store/services/useServiceStore";
import { useNotificationStore } from "../store/ui/useNotificationStore";
import { useSettingsStore } from "../store/settings/useSettingsStore";
import { silentPrint } from "../services/printerService"; 
import { useOrderStore } from "../store/orders/useOrderStore"; 
import ClearCartModal from "../components/orders/ClearCartModal";
import { NewOrderSkeleton } from "../components/skeleton-loader";
import StoreGuard from '../components/settings/StoreGuard';
import { usePaymentSettingsStore } from "../store/settings/usePaymentSettingsStore"; 

// --- Helper Functions ---
const generateUniqueOrderNumber = async () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const r = (source, len) => Array.from({ length: len }, () => source[Math.floor(Math.random() * source.length)]).join('');
  let isUnique = false;
  let newID = "";
  while (!isUnique) {
    newID = `ORD-${r(letters, 3)}${r(numbers, 3)}`;
    const q = query(collection(db, "orders"), where("order_number", "==", newID), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) isUnique = true; 
  }
  return newID;
};

// --- UI Helper Components ---
const Button = ({ children, variant = "primary", size = "md", className = "", disabled, ...props }) => {
  const variants = {
    primary: "bg-blue-600 text-text-light hover:bg-blue-700 ",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    default: "bg-app-dark text-app-light",
    yellow: "bg-yellow-500 text-text-light hover:bg-yellow-600",
    ghost: "text-red-500 hover:bg-red-50"
  };
  const sizes = { sm: "px-3 py-1 text-xs", md: "px-4 py-2 text-sm", icon: "p-2" };
  return (
    <button 
      disabled={disabled}
      className={`rounded-lg font-medium transition-all flex items-center justify-center ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

const Input = forwardRef(({ label, id, className = "", disabled, ...props }, ref) => (
  <div className="w-full space-y-1">
    {label && (
      <label htmlFor={id} className={`text-sm-text font-medium ml-1 ${disabled ? 'text-text-dark/40' : 'text-text-dark'}`}>
        {label}
      </label>
    )}
    <input 
      ref={ref} 
      id={id} 
      disabled={disabled}
      className={`
        w-full h-11 px-4 rounded-xl border border-gray-300 transition-all 
        text-sm-text text-text-dark outline-none font-medium
        focus:border-app-dark/70 focus:ring-0
        placeholder:text-text-dark/40
        ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'bg-white'}
        ${className}
      `} 
      {...props} 
    />
  </div>
));
Input.displayName = "Input";

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${className}`}>{children}</span>
);

export default function NewOrder() {
  const navigate = useNavigate();
  const settings = useOrderStore((state) => state.settings);

  // Stores
  const { customers, subscribeToCustomers } = useCustomerStore();
  const { loyaltySettings, subscribeToLoyalty } = useLoyaltyStore();
  const { submitOrder, createCustomer } = useNewOrderStore(); 
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);
  const { services, isLoading, subscribeToServices } = useServiceStore();
  const { receiptConfig, systemConfig } = useSettingsStore();
  
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [handoverMethod, setHandoverMethod] = useState('pickup');
  const [deliveryFee, setDeliveryFee] = useState(0); 

  const safeCustomers = useMemo(() => customers || [], [customers]);
  const isFormIncomplete = !customer?.name?.trim() || (customer?.phone?.length || 0) < 11;

  const { methods, fetchPaymentMethods } = usePaymentSettingsStore();
  
  const activePaymentMethods = useMemo(() => 
    methods.filter(m => m.isActive), 
    [methods]
  );

  useEffect(() => {
    const unsubServices = subscribeToServices();
    const unsubLoyalty = subscribeToLoyalty();
    const unsubPayments = fetchPaymentMethods(); 
    let unsubCustomers;
    if (subscribeToCustomers) unsubCustomers = subscribeToCustomers();
    
    return () => { 
      if (typeof unsubServices === 'function') unsubServices(); 
      if (typeof unsubLoyalty === 'function') unsubLoyalty(); 
      if (typeof unsubPayments === 'function') unsubPayments(); 
      if (typeof unsubCustomers === 'function') unsubCustomers();
    };
  }, [subscribeToServices, subscribeToLoyalty, subscribeToCustomers, fetchPaymentMethods]);

  useEffect(() => {
    if (!paymentMethod && activePaymentMethods.length > 0) {
      const defaultMethod = activePaymentMethods.find(m => m.isDefault) || activePaymentMethods[0];
      setPaymentMethod(defaultMethod.name);
    }
  }, [activePaymentMethods, paymentMethod]);

  const isPhoneDuplicate = useMemo(() => {
    return safeCustomers.some(c => {
      const dbPhoneClean = String(c.phone || "").replace(/\D/g, "");
      const inputPhoneClean = String(customer?.phone || "").replace(/\D/g, "");
      return dbPhoneClean === inputPhoneClean && c.id !== selectedCustomerId;
    });
  }, [safeCustomers, customer?.phone, selectedCustomerId]);

  const [showClearWarning, setShowClearWarning] = useState(false);
  
  // ==========================================
  // BUG FIX: Track the ID so we can restore it
  // ==========================================
  const prevCustomerRef = useRef(customer);
  const prevCustomerIdRef = useRef(selectedCustomerId);

  useEffect(() => {
    const hasItems = selectedServices.length > 0;
    
    // Check if the actual identity (ID) changed, not just the text inputs
    const idChanged = prevCustomerIdRef.current !== selectedCustomerId;
    const nameChanged = prevCustomerRef.current.name !== customer.name && prevCustomerRef.current.name !== "";
    const phoneChanged = prevCustomerRef.current.phone !== customer.phone && prevCustomerRef.current.phone !== "";

    if (hasItems && (idChanged || nameChanged || phoneChanged) && !isProcessing) {
      setShowClearWarning(true);
    } else {
      prevCustomerRef.current = { ...customer };
      prevCustomerIdRef.current = selectedCustomerId; // Keep ID ref synced
    }
  }, [customer, selectedCustomerId, selectedServices.length, isProcessing]);

  const handleConfirmClear = () => {
    setSelectedServices([]); 
    prevCustomerRef.current = customer; 
    prevCustomerIdRef.current = selectedCustomerId; // Save the new ID
    setShowClearWarning(false);
  };

  const handleCancelClear = () => {
    setCustomer(prevCustomerRef.current); 
    // CRITICAL FIX: Restore the ID back to the previous one
    setSelectedCustomerId(prevCustomerIdRef.current); 
    setShowClearWarning(false);
  };

  const selectedCustomerData = useMemo(() => 
    selectedCustomerId ? safeCustomers.find(c => c.id === selectedCustomerId) : null
  , [selectedCustomerId, safeCustomers]);

  const handleApplyReward = useCallback(() => {
    if (isProcessing) return; 
    
    const hasReward = selectedServices.some(s => s.is_reward);
    if (hasReward || !loyaltySettings?.is_enabled) return;
    
    const currentData = selectedCustomerData || customer;
    const points = currentData.loyalty_points !== undefined ? currentData.loyalty_points : (currentData.order_count || 0);
    const required = loyaltySettings.orders_required || 10;
    
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
  }, [selectedServices, loyaltySettings, selectedCustomerData, customer, showNotification, isProcessing]);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShouldShowSkeleton(true), 400);
    } else {
      setShouldShowSkeleton(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleSubmit = async () => {
    // 1. VALIDATIONS
    if (isFormIncomplete) {
      showNotification("Please complete Customer Name and a valid 11-digit Contact Number.", "error");
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

    setIsProcessing(true);

    try {
      const uniqueOrderNumber = await generateUniqueOrderNumber();
      let finalCustomerId = selectedCustomerId;
      
      // 2. CUSTOMER CREATION (For New Customers)
      if (!finalCustomerId) {
        const newCust = await createCustomer({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address?.trim() || "",
          order_count: 0, 
          loyalty_points: 0
        });
        finalCustomerId = newCust.id;
      }
      
      // 3. CALCULATIONS
      const subtotal = selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const finalDeliveryFee = handoverMethod === 'delivery' ? Number(deliveryFee) : 0;
      const totalAmount = subtotal + finalDeliveryFee;
      
      const rewardItems = selectedServices.filter(s => s.is_reward);
      const isRewardClaimed = rewardItems.length > 0;
      const pointsRequiredPerReward = Number(loyaltySettings?.orders_required || 10);
      const totalPointsToDeduct = rewardItems.length * pointsRequiredPerReward;

      // 4. PREPARE ORDER
      const orderPayload = {
        customer_id: finalCustomerId, 
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_address: customer.address?.trim() || "",
        order_number: uniqueOrderNumber, 
        total_amount: Number(totalAmount),
        handover_method: handoverMethod,
        delivery_fee: finalDeliveryFee,
        notes: notes?.trim() || "",
        payment_method: paymentMethod || "Unpaid",
        is_paid: Boolean(isPaid),
        loyalty_points_to_deduct: totalPointsToDeduct,
        services: selectedServices.map(s => ({
          service_id: s.id, 
          service_name: s.service_name, 
          quantity: Number(s.quantity || 1),
          price_per_kg: Number(s.price_per_kg), 
          subtotal: Number(s.subtotal), 
          is_reward: Boolean(s.is_reward)
        })),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(), 
        status: 'pending'
      };

      // 5. SUBMIT ORDER
      await submitOrder(orderPayload);

      const customerRef = doc(db, "customers", finalCustomerId);
      await updateDoc(customerRef, {
        order_count: increment(1) 
      });

      // 6. LOG REWARDS (If applicable)
      if (isRewardClaimed) {
        for (const item of rewardItems) {
          await addDoc(collection(db, "reward_logs"), {
            customer_id: finalCustomerId,
            customer_name: customer.name.trim(),
            order_number: uniqueOrderNumber,
            reward_name: item.service_name,
            points_spent: pointsRequiredPerReward,
            timestamp: serverTimestamp() 
          });
        }
      }

      // 7. LOG ACTIVITY & PRINTING
      logActivity(orderPayload, 'pending');

      const shouldAutoPrint = systemConfig?.autoPrint === true;

      if (shouldAutoPrint) {
        try {
          const printableOrder = { ...orderPayload, created_at: new Date() };
          await silentPrint(printableOrder, settings.defaultPrinter || 'browser', receiptConfig);
        } catch (printErr) {
          showNotification("Order saved, but printer not found.", "info");
        }
      }

      showNotification(`Order ${uniqueOrderNumber} created!`, "success");
      navigate("/main/orders");

    } catch (err) {
      console.error("Submit Error:", err);
      setIsProcessing(false);
      showNotification("Failed to save order.", "error");
    }
  };

  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      if (isProcessing) return; 
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const nameInput = document.getElementById("customer-name");
        if (nameInput) {
          nameInput.focus();
          setCustomer(prev => ({ ...prev, name: (prev.name + e.key).toUpperCase() }));
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKeyPress);
    return () => window.removeEventListener("keydown", handleGlobalKeyPress);
  }, [isProcessing]); 

  if (isLoading && shouldShowSkeleton) return <NewOrderSkeleton />;
  if (isLoading && !shouldShowSkeleton) return null;

  return (
    <StoreGuard> 
      <div className="min-h-screen bg-app-light p-2 relative">
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-white/0 rounded-xl cursor-wait" />
        )}

        <div className="max-w-6xl mx-auto px-1 md:px-2 relative">
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-col">
              <h1 className="text-h2 text-text-dark">New Order</h1>
              <p className="text-sm-text text-gray-600 mt-0.5">Create a new laundry order</p>
            </div>
          </div>

          <div className={`grid lg:grid-cols-3 gap-4 items-start transition-opacity duration-300 ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}>
            <div className="lg:col-span-2 space-y-4">
              <div id="step-customer">
                <CustomerForm 
                  customer={customer} setCustomer={setCustomer}
                  selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
                  allCustomers={safeCustomers} Button={Button} Input={Input}
                  isSubmitting={isProcessing} 
                />
              </div>
              
              {selectedCustomerData && (
                <div id="step-loyalty" className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <LoyaltyStatus 
                    customer={selectedCustomerData} 
                    loyaltySettings={loyaltySettings} 
                    Button={Button} Badge={Badge}
                    onApplyFreeService={handleApplyReward}
                    selectedServices={selectedServices} 
                    isSubmitting={isProcessing} 
                  />
                </div>
              )}
              
              <div id="step-services">
                <ServiceSelector 
                  services={services} 
                  selectedServices={selectedServices} 
                  setSelectedServices={setSelectedServices} 
                  Button={Button} 
                  Badge={Badge}
                  isCustomerIncomplete={isFormIncomplete} 
                  isSubmitting={isProcessing} 
                />
              </div>
            </div>

            <div className="lg:col-span-1">
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
                  onSubmit={handleSubmit} 
                  isProcessing={isProcessing} 
                  Button={Button} 
                  isPhoneDuplicate={isPhoneDuplicate}
                />
              </div>
            </div>
          </div>
        </div>

        <ClearCartModal 
          isOpen={showClearWarning && !isProcessing} 
          onCancel={handleCancelClear}
          onConfirm={handleConfirmClear}
        />
      </div>
    </StoreGuard>
  );
}