import React, { useState, useRef, useEffect } from "react";
import { 
  IconClock, IconPackage, IconCheckCircle, IconPhone, 
  IconArrowRight, IconMapPin 
} from "../icons";
import "../../style/OrderCard.css";

// Your Custom SVG Icon for Instructions
const IconEdit = ({ className }) => (
  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 20h4L18.5 9.5a2.829 2.829 0 0 0-4-4L4 16v4Z"></path>
    <path d="m13.5 6.5 4 4"></path>
  </svg>
);

const statusConfig = {
  pending: { 
    banner: "bg-gradient-to-b from-amber-300 to-amber-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]",
    theme: "text-amber-700 bg-amber-50 border-amber-200 font-bold", 
    icon: IconClock, label: "Pending", nextStatus: "in_progress" 
  },
  in_progress: { 
    banner: "bg-gradient-to-b from-blue-400 to-indigo-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]",
    theme: "text-blue-700 bg-blue-50 border-blue-200 font-bold", 
    icon: IconPackage, label: "Processing", nextStatus: "ready" 
  },
  ready: { 
    banner: "bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]",
    theme: "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold", 
    icon: IconCheckCircle, label: "Ready", nextStatus: "picked_up" 
  },
  completed: { 
    banner: "bg-gradient-to-b from-slate-400 to-slate-500",
    theme: "text-slate-700 bg-slate-50 border-slate-200 font-bold", 
    icon: IconCheckCircle, label: "Completed", nextStatus: null 
  },
  picked_up: { 
    banner: "bg-gradient-to-b from-slate-200 to-slate-300",
    theme: "text-slate-700 bg-white border-slate-100 font-bold", 
    icon: IconCheckCircle, label: "Picked Up", nextStatus: null 
  }
};

export default function OrderCard({ order, onStatusUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false);
  const dropdownRef = useRef(null);
  
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const instructions = order.special_instructions || order.notes;

  const statusOptions = [
    { value: "pending", label: "Pending", icon: IconClock },
    { value: "in_progress", label: "Processing", icon: IconPackage },
    { value: "ready", label: "Ready", icon: IconCheckCircle },
    { value: "completed", label: "Completed", icon: IconCheckCircle },
    { value: "picked_up", label: "Picked Up", icon: IconCheckCircle }
  ];

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setIsDropUp(spaceBelow < 250);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // FIX: Added dynamic z-index. When 'isOpen' is true, z-index jumps to 50.
    <div
      className={`
        group relative bg-white border border-slate-200 rounded-2xl transition-all duration-200 shadow-md
        ${
          isOpen
            ? "z-50 border-[#2d79f3] ring-1 ring-[#2d79f3]/20 shadow-lg"
            : "z-0 hover:border-[#2d79f3] hover:shadow-lg"
        }
      `}
    >
      {/* Side Banner */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`}
      />

      <div className="flex flex-col lg:flex-row ml-2 p-3">
        
        {/* IDENTITY SECTION */}
       <div className="flex-1 flex flex-col justify-start gap-3 lg:w-[22%] rounded-tl-2xl">
  
  {/* Top Row: Icon + Name & Tags */}
  <div className="flex items-center gap-3 w-full">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${status.theme}`}
    >
      <StatusIcon className="w-5 h-5" />
    </div>
    
    <div className="min-w-0 flex-1 flex flex-col gap-1">
      {/* ADDED: title={order.customer_name} 
        This enables the native browser tooltip on hover/hold so users can read the full name if it's truncated.
      */}
      <h3 
        className="font-black text-slate-900 truncate tracking-tight text-[15px] uppercase leading-tight cursor-default"
        title={order.customer_name}
      >
        {order.customer_name}
      </h3>

      <div className="flex flex-wrap items-center gap-1">
  <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 uppercase whitespace-nowrap">
    {order.order_number}
  </span>
  <span
    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border whitespace-nowrap ${status.theme}`}
  >
    {status.label}
  </span>
</div>
    </div>
  </div>

  {/* Bottom Row: Instructions */}
  {instructions && (
    <div 
      className="w-full px-2 border-slate-200 bg-white/50 rounded-lg flex items-start gap-2 "
      title={instructions} // Shows full instructions on hover/hold
    >
      <div className="shrink-0 mt-0.5">
        <IconEdit className="w-3.5 h-3.5 text-amber-600" />
      </div>
      {/* Added flex-1 and break-words to ensure multi-line wrapping works */}
      <p className="flex-1 text-[11px] lg:text-[12px] font-medium text-gray-700 leading-tight italic line-clamp-2 break-words">
        {instructions}
      </p>
    </div>
  )}
</div>

       {/* SERVICES & INSTRUCTIONS - Compact Width, No Item Limit */}
        <div className="p-3 lg:p-4 flex flex-col justify-center gap-2 bg-white lg:w-[28%]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Removed .slice() so all services display and wrap within the tighter width */}
            {order.services?.map((service, idx) => (
              <div
                key={idx}
                className="flex items-center bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg"
              >
                <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap uppercase tracking-wide">
                  {service.service_name}
                </span>
                <span className="ml-2 text-[11px] font-mono font-bold text-slate-400">
                  {service.weight_kg}kg
                </span>
              </div>
            ))}
          </div>
        </div>


       {/* LOGISTICS */}
        <div className="flex-1  lg:px-4 lg:py-4 flex items-center lg:min-w-[150px]">
          {/* Changed items-end to items-start for left alignment */}
          <div className="flex flex-col gap-1 items-start w-full">
            <div className="flex items-center gap-2">
              <IconPhone className="w-3 h-3 text-slate-700" />
              <span className="text-[13px] font-bold text-slate-700">
                {order.customer_phone}
              </span>
            </div>

            {order.customer_address && (
  <div className="flex items-start gap-2">
    <IconMapPin className="w-3 h-3 text-slate-700 shrink-0 mt-[2px]" />
    <span className="text-[13px] font-medium text-slate-700 leading-snug line-clamp-3">
      {order.customer_address}
    </span>
  </div>
)}

          </div>
        </div>

        {/* FINANCIALS & ACTIONS SECTION */}
<div className="transaction-section pt-1">
  
  {/* PRICE + PAYMENT STATUS */}
  <div className="price-group">
    <span
      className={`text-[8px] lg:text-[9px] font-black px-1.5 pt-0.5 !pb-0 mb-1 rounded border border-current mr-1 leading-none ${
        order.is_paid
          ? "text-emerald-600 bg-emerald-50"
          : "text-rose-600 bg-rose-50"
      }`}
    >
      {order.is_paid ? "PAID" : "UNPAID"}
    </span>

    <p className="text-[20px] font-bold text-slate-800 leading- mr-1">
      ₱{order.total_amount?.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })}
    </p>
  </div>

  {/* ACTION BUTTONS */}
  <div className="flex items-end gap-1 lg:gap-2 mt-1 " ref={dropdownRef}>
    <div className="relative">
      <button
  onClick={toggleDropdown}
  className={`
    flex items-center justify-center h-7 lg:h-8 w-24 lg:w-32 !px-2 whitespace-nowrap
    text-[12px] font-medium transition-all rounded-lg border tracking-wider
    ${isOpen ? "bg-slate-100" : "bg-white border-slate-200 text-slate-700"}
    focus:outline-none focus:ring-0
  `}
>

        Update Status
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden py-1 ${isDropUp ? "bottom-full mb-2" : "top-full mt-1"} animate-in fade-in zoom-in duration-150`}>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => { onStatusUpdate(order.id, option.value); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-[14px] font-normal flex items-center justify-between transition-colors ${order.status === option.value ? "bg-blue-50 text-[#2d79f3] font-bold" : "text-gray-700 hover:bg-slate-50"}`}
            >
              {option.label}
              <option.icon className={`w-4 h-4 ${order.status === option.value ? "text-[#2d79f3]" : "text-slate-300"}`} />
            </button>
          ))}
        </div>
      )}
    </div>

    {status.nextStatus && (
      <button
        onClick={() => onStatusUpdate(order.id, status.nextStatus)}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white h-7 lg:h-8 px-3 lg:px-3 rounded-lg text-[13px] font-normal transition-all flex items-center gap-2 shadow-md active:scale-95 whitespace-nowrap"
      >
        Next Stage
        <IconArrowRight className="w-3.5 h-3.5 !text-white !stroke-white" />
      </button>
    )}
  </div>
</div>
      </div>
    </div>
  );
}