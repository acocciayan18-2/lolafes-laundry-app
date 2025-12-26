import React, { useState, useRef, useEffect } from "react";
import { 
  IconClock, IconPackage, IconCheckCircle, IconPhone, 
  IconArrowRight, IconMapPin 
} from "../icons";

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
    theme: "text-slate-400 bg-white border-slate-100 font-bold", 
    icon: IconCheckCircle, label: "Picked Up", nextStatus: null 
  }
};

const formatDateTime = (dateString) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(new Date(dateString));
};

export default function OrderCard({ order, onStatusUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false); // Track direction
  const dropdownRef = useRef(null);
  
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "Processing" },
    { value: "ready", label: "Ready" },
    { value: "completed", label: "Completed" },
    { value: "picked_up", label: "Picked Up" }
  ];

  // Logic to determine direction on click
  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 200px space below, open UP
      setIsDropUp(spaceBelow < 200);
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
    <div className="group relative bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all duration-200 shadow-sm">
      <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl ${status.banner}`} />

      <div className="flex flex-col lg:flex-row lg:items-stretch ml-2">
        
        {/* IDENTITY SECTION */}
        <div className="p-4 flex items-center gap-4 lg:w-[25%] border-b lg:border-b-0 lg:border-r border-slate-50 bg-slate-50/30">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${status.theme}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-slate-900 truncate tracking-tight text-sm uppercase mb-1.5">
              {order.customer_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-medium text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100 uppercase">
                {order.order_number}
              </span>
              <span className={`text-[11px] font-black uppercase px-1.5 py-0.5 rounded border ${status.theme}`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* SERVICES SECTION */}
        <div className="flex-1 p-3 flex items-center bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {order.services?.map((service, idx) => (
              <div key={idx} className="flex items-center bg-slate-50 border border-slate-100 pl-2.5 pr-2 py-1.5 rounded-lg hover:bg-white transition-colors">
  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
  
  {/* Updated: text-slate-700 changed to text-gray-900 */}
  <span className="text-[11px] font-bold text-gray-900 whitespace-nowrap uppercase tracking-tight">
    {service.service_name}
  </span>
  
  <span className="ml-2 text-[10px] font-mono font-bold text-slate-400">
    {service.weight_kg}kg
  </span>
</div>
            ))}
          </div>
        </div>

        {/* LOGISTICS & FINANCIALS */}
        <div className="px-4 py-3 flex items-center justify-between lg:justify-end gap-6 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 lg:min-w-[420px]">
          <div className="flex flex-col gap-1 items-end min-w-[150px]">
            <div className="flex items-center gap-1.5">
              <IconPhone className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{order.customer_phone}</span>
            </div>
            {order.customer_address && (
              <div className="flex items-center gap-1.5 max-w-[180px]">
                <IconMapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{order.customer_address}</span>
              </div>
            )}
          </div>

          <div className="text-right shrink-0">
            <span className={`block text-[10px] font-black px-1 py-0.5 mb-1 rounded border border-current leading-none w-fit ml-auto ${order.is_paid ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
              {order.is_paid ? 'PAID' : 'UNPAID'}
            </span>
            <p className="text-lg  font-black text-slate-900 leading-none">
              ₱{order.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* ACTIONS: Smart Custom Dropdown */}
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200" ref={dropdownRef}>
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className={`
                  flex items-center justify-between h-8 w-36 px-2 
                  text-[10px] font-medium transition-all rounded-xl border
                  ${isOpen ? "border-black ring-0 shadow-sm" : "border-slate-200 text-slate-700"}
                  hover:border-black focus:outline-none
                `}
              >
                <span className="truncate">{status.label}</span>
                <svg className={`h-3.5 w-3.5 ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div 
                  className={`
                    absolute right-0 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-[100] overflow-hidden py-1
                    ${isDropUp ? "bottom-full mb-2" : "top-full mt-1"} 
                    animate-in fade-in zoom-in duration-150
                  `}
                >
                  {statusOptions.map((option) => {
                    const isActive = order.status === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          onStatusUpdate(order.id, option.value);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-[14px] font-normal text-gray-700 flex items-center justify-between transition-colors `}
                      >
                        {option.label}
                        {isActive && (
                          <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {status.nextStatus && (
              <button
                onClick={() => onStatusUpdate(order.id, status.nextStatus)}
                className="bg-gradient-to-r font-medium from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-8 px-3 rounded-lg text-[13px] font-black transition-all flex items-center gap-1 shadow-sm active:scale-95 whitespace-nowrap"
              >
                Next Stage
                <IconArrowRight className="w-4 h-4 !text-white !stroke-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}