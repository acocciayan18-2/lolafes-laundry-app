import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IconArrowLeft } from "../components/icons";
import { CustomerForm } from "../components/orders/CustomerForm";
import { LoyaltyStatus } from "../components/orders/LoyaltyStatus";
import { ServiceSelector } from "../components/orders/ServiceSelector";
import { OrderSummary } from "../components/orders/OrderSummary";
import { useServiceStore } from "../store/services/useServiceStore";
import { useLoyaltyStore } from "../store/services/useLoyaltyStore";
import { useNewOrderStore } from "../store/new-order/useNewOrderStore";
import { useNotificationStore } from "../store/ui/useNotificationStore";

import { useActivityStore } from "../store/activities/useActivityStore";
import { startGlobalTour } from "../tours/globalTours";

// FIX 1: Import customers list AND checkPhoneExists
import { useCustomerStore } from "../store/customer/useCustomerStore";

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

import { driver } from "driver.js"; // Import Driver.js
import "driver.js/dist/driver.css"; // Import styles





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
    
    if (querySnapshot.empty) {
      isUnique = true; 
    }
  }
  return newID;
};

// --- UI Helper Components ---
const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    default: "bg-gray-900 text-white",
    yellow: "bg-yellow-500 text-white hover:bg-yellow-600",
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
  <div className="w-full space-y-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-bold text-black-800 ml-1 tracking-tight">
        {label}
      </label>
    )}
    <input 
      id={id} 
      className={`w-full h-11 px-4 rounded-xl border border-gray-300 transition-all text-sm outline-none focus:border-blue-500 ${className}`} 
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
  

  const checkPhoneExists = useCustomerStore((state) => state.checkPhoneExists);
  const customers = useCustomerStore((state) => state.customers);

  const { services, subscribeToServices } = useServiceStore();
  const { loyaltySettings, subscribeToLoyalty } = useLoyaltyStore();
  const { submitOrder, createCustomer } = useNewOrderStore(); 
  const showNotification = useNotificationStore((state) => state.showNotification);

  // 2. INITIALIZE THE LOGGER
  const logActivity = useActivityStore((state) => state.logActivity);

  const [isProcessing, setIsProcessing] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isPaid, setIsPaid] = useState(true); 

  useEffect(() => {
    const unsubServices = subscribeToServices();
    const unsubLoyalty = subscribeToLoyalty();
    return () => { unsubServices(); unsubLoyalty(); };
  }, [subscribeToServices, subscribeToLoyalty]);

  const selectedCustomerData = selectedCustomerId 
    ? customers.find(c => c.id === selectedCustomerId) 
    : null;

  // --- HANDLERS ---
  const handleApplyReward = () => {
    const hasReward = selectedServices.some(s => s.is_reward);
    if (hasReward || !loyaltySettings?.is_enabled) return;

    const currentData = selectedCustomerData || customer;
    const points = currentData.loyalty_points !== undefined 
        ? currentData.loyalty_points 
        : (currentData.order_count || 0);
        
    const required = loyaltySettings.orders_required || 10;
    const available = Math.floor(points / required);

    if (available <= 0) {
        showNotification("Customer does not have enough points for a reward.", "error");
        return;
    }

    const freeService = {
      id: `reward-${Date.now()}`, 
      service_name: `${loyaltySettings.free_service_type} (Reward)`,
      service_type: loyaltySettings.free_service_type,
      quantity: 1, 
      price_per_kg: 0,
      subtotal: 0,
      is_reward: true 
    };

    setSelectedServices([...selectedServices, freeService]);

    // 3. LOG ACTIVITY: REWARD APPLIED
    logActivity({
        id: `reward-${Date.now()}`,
        customer_name: currentData.name,
        order_number: "REWARD",
        total_amount: 0
    }, 'ready'); // Using 'ready' status to show a green/check icon for rewards

    showNotification("Reward applied to order!", "success");
  };

  const handleSubmit = async () => {
    if (!customer.name.trim() || selectedServices.length === 0) {
      showNotification("Please enter customer name and select a service.", "error");
      return;
    }

    if (!selectedCustomerId && customer.phone) {
      const isDuplicate = checkPhoneExists(customer.phone);
      if (isDuplicate) {
        showNotification("This contact number is already registered.", "error");
        return; 
      }
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
      const hasReward = selectedServices.some(s => s.is_reward);
      const pointsToDeduct = hasReward ? (loyaltySettings.orders_required || 10) : 0;

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
          service_id: s.id,
          service_name: s.service_name,
          quantity: Number(s.quantity || 1),
          price_per_kg: Number(s.price_per_kg),
          subtotal: Number(s.subtotal),
          is_reward: Boolean(s.is_reward)
        }))
      };

      // SUBMIT TO FIREBASE/STORE
      await submitOrder(orderPayload);

      // 4. LOG ACTIVITY: ORDER CREATED
      // This creates a dedicated card in your Recent Activity feed
      logActivity({
          ...orderPayload,
          id: uniqueOrderNumber // Ensuring this version of the event has its own ID
      }, 'pending');

      setCustomer({ name: "", phone: "", address: "" });
      setSelectedCustomerId(null);
      showNotification(`Order ${uniqueOrderNumber} created successfully!`, "success");
      navigate("/main/orders");

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showNotification("Failed to save order.", "error");
    }
  };

  const [forceReveal, setForceReveal] = useState(false);

useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  
  if (searchParams.get('tour') === 'active') {
    setForceReveal(true);

    const timer = setTimeout(() => {
      // RESUME the tour at index 3
      startGlobalTour(navigate, 3); 
    }, 700); // 700ms is safer for page loading

    return () => clearTimeout(timer);
  }
}, [location.search, navigate]);
 return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 pt-3 md:p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER (Excluded from Tour Steps) */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
            <p className="text-gray-600 mt-1 text-[14px]">Create a new laundry order</p>
          </div>
          
          
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start mt-3">
          <div className="lg:col-span-2 space-y-6">
            <div id="step-customer">
              <CustomerForm 
                customer={customer} setCustomer={setCustomer}
                selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
                allCustomers={[]} Button={Button} Input={Input}
                isSubmitting={isProcessing}
              />
            </div>
            
            {/* FORCE REVEAL LOGIC: Show if customer is selected OR if tour is active */}
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
    </div>
  );
}