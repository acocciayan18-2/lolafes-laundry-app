import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowLeft } from "../components/icons";
import { CustomerForm } from "../components/orders/CustomerForm";
import { LoyaltyStatus } from "../components/orders/LoyaltyStatus";
import { ServiceSelector } from "../components/orders/ServiceSelector";
import { OrderSummary } from "../components/orders/OrderSummary";
import { useServiceStore } from "../store/services/useServiceStore";
import { useLoyaltyStore } from "../store/services/useLoyaltyStore";
import { useNewOrderStore } from "../store/new-order/useNewOrderStore";
import { useNotificationStore } from "../store/ui/useNotificationStore";

// FIX 1: Import customers list AND checkPhoneExists
import { useCustomerStore } from "../store/customer/useCustomerStore";

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

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
  const navigate = useNavigate();

  // FIX 2: Get both the checker AND the customer list
  const checkPhoneExists = useCustomerStore((state) => state.checkPhoneExists);
  const customers = useCustomerStore((state) => state.customers);

  // --- GLOBAL STORES ---
  const { services, subscribeToServices } = useServiceStore();
  const { loyaltySettings, subscribeToLoyalty } = useLoyaltyStore();
  const { submitOrder, createCustomer } = useNewOrderStore(); 
  const showNotification = useNotificationStore((state) => state.showNotification);

  // --- LOCAL STATE ---
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

  // Helper: Find the full customer object from the store if an ID is selected
  const selectedCustomerData = selectedCustomerId 
    ? customers.find(c => c.id === selectedCustomerId) 
    : null;

  // --- HANDLERS ---
  const handleApplyReward = () => {
    const hasReward = selectedServices.some(s => s.is_reward);
    if (hasReward || !loyaltySettings?.is_enabled) return;

    // --- LOGIC CHECK START ---
    // Use store data if available, else local state (though local state won't have points yet usually)
    const currentData = selectedCustomerData || customer;

    // Fallback: If loyalty_points doesn't exist (old customer), use order_count temporarily
    const points = currentData.loyalty_points !== undefined 
        ? currentData.loyalty_points 
        : (currentData.order_count || 0);
        
    const required = loyaltySettings.orders_required || 10;
    
    // Calculate Available Rewards: Floor(Points / Required)
    const available = Math.floor(points / required);

    if (available <= 0) {
        showNotification("Customer does not have enough points for a reward.", "error");
        return;
    }
    // --- LOGIC CHECK END ---

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
    showNotification("Reward applied to order!", "success");
  };

  const handleSubmit = async () => {
    // 1. Basic Validation
    if (!customer.name.trim() || selectedServices.length === 0) {
      showNotification("Please enter customer name and select a service.", "error");
      return;
    }

    // 2. Blocking Duplicate Check
    if (!selectedCustomerId && customer.phone) {
      const isDuplicate = checkPhoneExists(customer.phone);
      if (isDuplicate) {
        showNotification("This contact number is already registered. Please click 'Select Existing' instead.", "error");
        return; 
      }
    }

    // 3. START PROCESSING
    setIsProcessing(true);

    try {
      const uniqueOrderNumber = await generateUniqueOrderNumber();
      let finalCustomerId = selectedCustomerId;
      
      // Create customer if they don't exist
      if (!finalCustomerId) {
        const newCust = await createCustomer({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address?.trim() || "",
        });
        finalCustomerId = newCust.id;
      }

      const totalAmount = selectedServices.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      
      // Calculate Loyalty Deduction
      // If a reward is used, we deduct the required points from their balance
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
        // Pass the deduction info to the store
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

      await submitOrder(orderPayload);

      // 4. Success Logic
      setCustomer({ name: "", phone: "", address: "" });
      setSelectedCustomerId(null);

      showNotification(`Order ${uniqueOrderNumber} created successfully!`, "success");
      navigate("/main/orders");

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      showNotification("Failed to save order. Please check your internet.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 pt-3 md:p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
          <p className="text-gray-600 mt-1 text-[14px]">Create a new laundry order</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start mt-3">
          <div className="lg:col-span-2 space-y-6">
            <CustomerForm 
              customer={customer} setCustomer={setCustomer}
              selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
              allCustomers={[]} 
              Button={Button} Input={Input}
              isSubmitting={isProcessing}
            />
            
            {/* Pass the STORE customer object to LoyaltyStatus */}
            <LoyaltyStatus 
              customer={selectedCustomerData} 
              loyaltySettings={loyaltySettings} 
              Button={Button} 
              Badge={Badge}
              onApplyFreeService={handleApplyReward}
              selectedServices={selectedServices} 
            />
            
            <ServiceSelector 
              services={services.filter(s => s.is_active)} 
              selectedServices={selectedServices} 
              setSelectedServices={setSelectedServices} 
              Button={Button} Badge={Badge}
            />
          </div>

          <div className="lg:col-span-1">
            <OrderSummary 
              customer={customer} 
              selectedServices={selectedServices}
              notes={notes} setNotes={setNotes}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              isPaid={isPaid}
              setIsPaid={setIsPaid}
              onSubmit={handleSubmit} 
              isProcessing={isProcessing}
              Button={Button} Input={Input}
            />
          </div>
        </div>
      </div>
    </div>
  );
}