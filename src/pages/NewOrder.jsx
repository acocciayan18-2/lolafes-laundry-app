import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconArrowLeft } from "../components/icons";
import { CustomerForm } from "../components/orders/CustomerForm";
import { LoyaltyStatus } from "../components/orders/LoyaltyStatus";
import { ServiceSelector } from "../components/orders/ServiceSelector";
import { OrderSummary } from "../components/orders/OrderSummary";

import '../style/neworder.css'; 

// --- Helper Components ---
const Button = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50",
    default: "bg-gray-900 text-white",
    yellow: "bg-yellow-500 text-white hover:bg-yellow-600",
    ghost: "text-red-500 hover:bg-red-50"
  };
  const sizes = { sm: "px-3 py-1 text-xs", md: "px-4 py-2 text-sm", icon: "p-2" };
  return <button className={`rounded-lg font-medium transition-all flex items-center justify-center ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

const Input = ({ label, className = "", ...props }) => (
  <div className="w-full space-y-1.5">
    {label && (
      <label className="text-sm font-bold text-black ml-1 tracking-tight uppercase">
        {label}
      </label>
    )}
    <input 
      className={`
        w-full h-11 px-4 rounded-xl border border-gray-200 outline-none text-sm transition-all
        focus:border-black focus:ring-0
        placeholder:text-gray-400 
        ${className}
      `} 
      {...props} 
    />
  </div>
);

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${className}`}>{children}</span>
);

// --- Main Page Component ---
export default function NewOrder() {
  const navigate = useNavigate();

  // --- STATE ---
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  // --- MOCK DATA ---
  const servicesList = [
    { id: 1, name: "Wash & Fold", type: "wash_fold", price_per_kg: 35 },
    { id: 2, name: "Dry Clean", type: "dry_only", price_per_kg: 65 },
    { id: 3, name: "Comforter (Single)", type: "wash_dry", price_per_kg: 150 },
    { id: 4, name: "Comforter (Double)", type: "wash_dry", price_per_kg: 200 },
    { id: 5, name: "Express Wash", type: "press_only", price_per_kg: 60 }
  ]; 

  const customersList = [
    { id: 101, name: "JUAN DELA CRUZ", phone: "09123456789", address: "Taguig City", order_count: 5 },
    { id: 102, name: "MARIA CLARA", phone: "09987654321", address: "Quezon City", order_count: 12 },
    { id: 103, name: "JOSE RIZAL", phone: "09171234567", address: "Calamba, Laguna", order_count: 8 },
    { id: 104, name: "ANDRES BONIFACIO", phone: "09187654321", address: "Tondo, Manila", order_count: 3 },
    { id: 105, name: "EMILIO AGUINALDO", phone: "09191234567", address: "Kawit, Cavite", order_count: 15 },
    { id: 106, name: "APOLINARIO MABINI", phone: "09207654321", address: "Tanauan, Batangas", order_count: 20 },
    { id: 107, name: "MELCHORA AQUINO", phone: "09211234567", address: "Quezon City", order_count: 7 },
    { id: 108, name: "GABRIELA SILANG", phone: "09227654321", address: "Vigan, Ilocos Sur", order_count: 4 },
    { id: 109, name: "ANTONIO LUNA", phone: "09231234567", address: "Binondo, Manila", order_count: 9 },
    { id: 110, name: "MARCELO H. DEL PILAR", phone: "09247654321", address: "Bulakan, Bulacan", order_count: 11 }
  ];

  const loyaltySettings = { is_enabled: true, orders_required: 10 };

  // --- HANDLERS ---
  
  /**
   * Added handleApplyReward inside the component to manage the free 8kg service.
   * It checks for duplicates using the is_reward flag.
   */
  const handleApplyReward = () => {
    const hasReward = selectedServices.some(s => s.is_reward);
    if (hasReward) return;

    const freeService = {
      id: 'reward-wash-fold', 
      service_name: "Wash & Fold (Reward)",
      service_type: "wash_fold",
      weight_kg: 8,
      price_per_kg: 0,
      subtotal: 0,
      is_reward: true // Identifier for ServiceSelector and LoyaltyStatus
    };

    setSelectedServices([...selectedServices, freeService]);
  };

  const handleSubmit = async () => {
    if (!customer.name || selectedServices.length === 0) {
      alert("Please select a customer and at least one service.");
      return;
    }
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert("Order created successfully!");
    navigate("/main/orders");
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <IconArrowLeft className="w-5"/>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <CustomerForm 
              customer={customer} setCustomer={setCustomer}
              selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId}
              allCustomers={customersList} Button={Button} Input={Input}
            />
            
            {/* Updated LoyaltyStatus with onApplyFreeService and selectedServices 
              to enable reward logic and button disabling.
            */}
            <LoyaltyStatus 
              customer={customersList.find(c => c.id === selectedCustomerId)}
              loyaltySettings={loyaltySettings} 
              Button={Button} 
              Badge={Badge}
              onApplyFreeService={handleApplyReward}
              selectedServices={selectedServices} 
            />
            
            <ServiceSelector 
              services={servicesList} 
              selectedServices={selectedServices} 
              setSelectedServices={setSelectedServices} 
              Button={Button} Input={Input} Badge={Badge}
            />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <OrderSummary 
              customer={customer} selectedServices={selectedServices}
              notes={notes} setNotes={setNotes}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              onSubmit={handleSubmit} isProcessing={isProcessing}
              Button={Button} Input={Input}
            />
          </div>

        </div>
      </div>
    </div>
  );
}