import { collection, getDocs, query, where } from 'firebase/firestore';
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconTrash } from "../components/icons";
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
import { startGlobalTour } from "../tours/globalTours";

import "driver.js/dist/driver.css";

// --- Helper Functions ---
const generateUniqueOrderNumber = async () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const r = (source, len) => Array.from({ length: len }, () => source[Math.floor(Math.random() * source.length)]).join('');
  let isUnique = false;
  let newID = "";
  while (!isUnique) {
    newID = `ORD-${r(letters, 3)}${r(numbers, 3)}`;
    const q = query(collection(db, "orders"), where("order_number", "==", newID));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) isUnique = true; 
  }
  return newID;
};

// --- UI Helper Components ---
const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
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
      className={`rounded-lg font-medium transition-all flex items-center justify-center ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, id, className = "", ...props }) => (
  <div className="w-full space-y-1">
    {label && (
      <label 
        htmlFor={id} 
        className="text-sm-text font-medium text-text-dark  ml-1 "
      >
        {label}
      </label>
    )}
    <input 
      id={id} 
      className={`
        w-full h-11 px-4 rounded-xl border border-gray-300 transition-all 
        text-sm-text text-text-dark outline-none font-medium
        focus:border-app-dark/70 focus:ring-0
        placeholder:text-text-dark/40
        ${className}
      `} 
      {...props} 
    />
  </div>
);

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${className}`}>{children}</span>
);


export default function NewOrder() {
  const location = useLocation();
  const navigate = useNavigate();

  // Stores
  // const checkPhoneExists = useCustomerStore((state) => state.checkPhoneExists);
  const customers = useCustomerStore((state) => state.customers);
  const { services, subscribeToServices } = useServiceStore();
  const { loyaltySettings, subscribeToLoyalty } = useLoyaltyStore();
  const { submitOrder, createCustomer } = useNewOrderStore(); 
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isPaid, setIsPaid] = useState(true); 

  // --- CART PROTECTION LOGIC ---
  const [showClearWarning, setShowClearWarning] = useState(false);
  const prevCustomerRef = useRef(customer);

  useEffect(() => {
  const hasItems = selectedServices.length > 0;
  
  // Check if identity changed from a non-empty previous value
  const nameChanged = prevCustomerRef.current.name !== customer.name && prevCustomerRef.current.name !== "";
  const phoneChanged = prevCustomerRef.current.phone !== customer.phone && prevCustomerRef.current.phone !== "";

  if (hasItems && (nameChanged || phoneChanged)) {
    // Show the warning modal to prevent accidental data loss
    setShowClearWarning(true);
  } else {
    prevCustomerRef.current = { ...customer };
  }
  
}, [customer, selectedServices.length]);

  const handleConfirmClear = () => {
    setSelectedServices([]); // Empty the cart
    prevCustomerRef.current = customer; // Sync the ref to the new customer
    setShowClearWarning(false);
   
  };

  const handleCancelClear = () => {
    setCustomer(prevCustomerRef.current); // Revert customer info
    setShowClearWarning(false);
  };

  // --- REWARD LOGIC ---
  const selectedCustomerData = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : null;

  const handleApplyReward = () => {
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
    setSelectedServices([...selectedServices, freeService]);
    showNotification("Reward applied!", "success");
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = async () => {
    if (!customer.name.trim() || selectedServices.length === 0) {
      showNotification("Please finish customer details and select services.", "error");
      return;
    }
    setIsProcessing(true);
    try {
      const uniqueOrderNumber = await generateUniqueOrderNumber();
      let finalCustomerId = selectedCustomerId;
      if (!finalCustomerId) {
        const newCust = await createCustomer({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address?.trim() || "",
        });
        finalCustomerId = newCust.id;
      }
      const totalAmount = selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const pointsToDeduct = selectedServices.some(s => s.is_reward) ? (loyaltySettings.orders_required || 10) : 0;

      const orderPayload = {
        customer_id: finalCustomerId, 
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_address: customer.address?.trim() || "",
        order_number: uniqueOrderNumber, 
        total_amount: Number(totalAmount),
        notes: notes.trim(),
        payment_method: paymentMethod,
        is_paid: Boolean(isPaid),
        loyalty_points_to_deduct: pointsToDeduct,
        services: selectedServices.map(s => ({
          service_id: s.id, service_name: s.service_name, quantity: Number(s.quantity || 1),
          price_per_kg: Number(s.price_per_kg), subtotal: Number(s.subtotal), is_reward: Boolean(s.is_reward)
        }))
      };

      await submitOrder(orderPayload);
      logActivity(orderPayload, 'pending');
      showNotification(`Order ${uniqueOrderNumber} created!`, "success");
      navigate("/main/orders");
    } catch (err) {
      setIsProcessing(false);
      showNotification("Failed to save order.", "error");
    }
  };

  // Subscriptions
  useEffect(() => {
    const unsubServices = subscribeToServices();
    const unsubLoyalty = subscribeToLoyalty();
    return () => { unsubServices(); unsubLoyalty(); };
  }, [subscribeToServices, subscribeToLoyalty]);

  // Global Keypress for focusing name
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
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
  }, []);

  const [forceReveal, setForceReveal] = useState(false);
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tour') === 'active') {
      setForceReveal(true);
      setTimeout(() => startGlobalTour(navigate, 3), 700);
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-app-light p-2">
      <div className="max-w-6xl mx-auto px-1 md:px-2">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <h1 className="text-h2 text-text-dark">New Order</h1>
            <p className="text-sm-text text-gray-600 mt-0.5">Create a new laundry order</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div id="step-customer">
              <CustomerForm 
                customer={customer} setCustomer={setCustomer}
                selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
                allCustomers={[]} Button={Button} Input={Input}
                isSubmitting={isProcessing}
              />
            </div>
            
            {(selectedCustomerData || forceReveal) && (
              <div id="step-loyalty" className="animate-in fade-in slide-in-from-top-2 duration-300">
                <LoyaltyStatus 
                  customer={selectedCustomerData || { name: "Tour Demo", loyalty_points: 0 }} 
                  loyaltySettings={loyaltySettings} 
                  Button={Button} Badge={Badge}
                  onApplyFreeService={handleApplyReward}
                  selectedServices={selectedServices} 
                />
              </div>
            )}
            
            <div id="step-services">
              <ServiceSelector 
                services={services.filter(s => s.is_active)} 
                selectedServices={selectedServices} 
                setSelectedServices={setSelectedServices} 
                Button={Button} Badge={Badge}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <div id="step-summary">
              <OrderSummary 
                customer={customer} 
                selectedServices={selectedServices}
                notes={notes} setNotes={setNotes}
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                isPaid={isPaid} setIsPaid={setIsPaid}
                onSubmit={handleSubmit} isProcessing={isProcessing}
                Button={Button} Input={Input}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- CUSTOMER CHANGE WARNING MODAL (GLASS EFFECT) --- */}
      <AnimatePresence>
        {showClearWarning && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-app-dark/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white max-w-sm w-full text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-h3 font-bold text-text-dark ">Clear Cart?</h3>
              <p className="text-sm-text text-text-dark/70 mt-2 mb-6">
                Changing the customer info will remove all items currently in the cart. Do you want to proceed?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 text-sm-text font-medium !border !border-1 !border-app-dark "
                  onClick={handleCancelClear}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger"
                  className="flex-1 text-sm-text font-medium !bg-red-500 text-white  "
                  onClick={handleConfirmClear}
                >
                  Clear Cart
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}