import React, { useState, useRef, useEffect } from "react";
// 1. Import Framer Motion
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconClock, IconPackage, IconCheckCircle, IconPhone, 
  IconArrowRight, IconMapPin, IconInfo, IconShirt
} from "../icons";
import "../../style/OrderCard.css";
import { useOrderStore } from "../../store/orders/useOrderStore";

import { useNotificationStore } from "../../store/ui/useNotificationStore";


// Transition configuration for a smooth "springy" feel
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1
};



const IconEdit = ({ className }) => (
  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 20h4L18.5 9.5a2.829 2.829 0 0 0-4-4L4 16v4Z"></path>
    <path d="m13.5 6.5 4 4"></path>
  </svg>
);

const statusConfig = {
  pending: { banner: "bg-amber-500", theme: "text-amber-700 bg-amber-50 border-amber-200", icon: IconClock, label: "Pending", nextStatus: "in_progress" },
  in_progress: { banner: "bg-blue-600", theme: "text-blue-700 bg-blue-50 border-blue-200", icon: IconPackage, label: "Processing", nextStatus: "ready" },
  ready: { banner: "bg-emerald-500", theme: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: IconCheckCircle, label: "Ready", nextStatus: "picked_up" },
  completed: { banner: "bg-slate-500", theme: "text-slate-700 bg-slate-50 border-slate-200", icon: IconCheckCircle, label: "Completed", nextStatus: null },
  picked_up: { banner: "bg-slate-300", theme: "text-slate-400 bg-white border-slate-100", icon: IconCheckCircle, label: "Picked Up", nextStatus: null }
};

const statusOptions = [
  { value: "pending", label: "Pending", icon: IconClock },
  { value: "in_progress", label: "Processing", icon: IconPackage },
  { value: "ready", label: "Ready", icon: IconCheckCircle },
  { value: "completed", label: "Completed", icon: IconCheckCircle },
  { value: "picked_up", label: "Picked Up", icon: IconCheckCircle }
];

export default function OrderCard({ order }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false);
  const dropdownRef = useRef(null);

  // --- ZUSTAND ACTIONS ---
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const togglePaymentStatus = useOrderStore((state) => state.togglePaymentStatus);
  
  const status = statusConfig[order.status] || statusConfig.pending;
  const instructions = order.special_instructions || order.notes;

  // Handle Firebase Timestamps or standard Strings
  const getFormattedDate = (dateObj) => {
    const d = dateObj?.seconds ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const totalQty = order.services?.reduce((sum, s) => 
  sum + (Number(s.quantity || s.weight_kg) || 0), 0
);

  const { date: dateStamp, time: timeStamp } = getFormattedDate(order.created_at || order.created_date);

  const toggleDropdown = (e) => {
    e.stopPropagation(); 
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setIsDropUp(window.innerHeight - rect.bottom < 250);
    }
    setIsOpen(!isOpen);
  };

  const handleStatusChange = async (e, newStatus) => {

    if (newStatus === "picked_up" && !order.is_paid) {
    // REPLACED ALERT
    showNotification("Cannot pick up unpaid orders!", "error");
    setIsOpen(false);
    return;
  }
    e.stopPropagation();
    setIsOpen(false);
    try {
      await updateOrderStatus(order.id, newStatus);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    }
  };

  const handlePaymentToggle = (e) => {
    e.stopPropagation();
    togglePaymentStatus(order.id, order.is_paid);
  };

  const showNotification = useNotificationStore((state) => state.showNotification);

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer rounded-2xl ${
        isOpen ? "z-50 border-blue-500 ring-2 ring-blue-500/10 shadow-md" : 
        isExpanded ? "z-40 border-blue-400 shadow-md" : "border-slate-200 hover:border-blue-300"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`} />

      <div className="flex flex-col ml-2">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 md:p-4">
          
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${status.theme}`}>
              <status.icon className="w-5 h-5" />
            </div>
            
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-800 text-[16px] uppercase tracking-tight">{order.customer_name}</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {dateStamp} <span className="mx-1 opacity-30">|</span> {timeStamp}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{order.order_number}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${status.theme}`}>{status.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
            <div 
              className="text-left lg:text-right cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handlePaymentToggle} // Toggle payment status on click
            >
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mb-0.5 inline-block ${order.is_paid ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                {order.is_paid ? "PAID" : "UNPAID"}
              </span>
              <p className="text-lg font-bold text-gray-800">₱{order.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex items-center gap-1.5" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className={`h-8 px-3 text-[13px] font-medium rounded-lg border transition-all ${isOpen ? "bg-slate-800 text-white" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  Update Status
                </button>

                {isOpen && (
                  <div className={`absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 ${isDropUp ? "bottom-full mb-2" : "top-full mt-1"}`}>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => handleStatusChange(e, option.value)}
                        className={`w-full px-3 py-2 text-left text-[13px] font-medium flex items-center justify-between ${order.status === option.value ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        {option.label}
                        <option.icon className="w-4 h-4 opacity-40" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {status.nextStatus && (
                <button
                  onClick={(e) => handleStatusChange(e, status.nextStatus)}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[13px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  Next <IconArrowRight className="w-3.5 h-3.5 !text-white !stroke-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-4 mb-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-50 pt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconShirt className="w-3.5 h-3.5 text-slate-400 stroke-slate-400" />
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Services</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {order.services?.map((s, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center shadow-sm">
                      <span className="text-[13px] font-medium text-gray-800">{s.service_name}</span>
                      <span className="ml-2 text-[12px] font-mono font-bold text-blue-600">
  {/* Check for quantity, fallback to weight_kg if quantity is missing */}
  x{s.quantity || s.weight_kg}
</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconInfo className="w-3.5 h-3.5 text-slate-400 stroke-slate-400" />
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Other Info</h4>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-700">
                    <IconPhone className="w-3.5 h-3.5" />
                    <span className="text-[13px] font-medium text-gray-800">{order.customer_phone}</span>
                  </div>
                  {order.customer_address && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <IconMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="text-[13px] font-medium text-gray-800 leading-relaxed break-words flex-1">{order.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconEdit className="w-3.5 h-3.5 text-slate-400 stroke-slate-400" />
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Notes</h4>
                </div>
                {instructions ? (
                  <p className="text-[13px] font-medium text-gray-800 leading-snug italic break-words">{instructions}</p>
                ) : (
                  <span className="text-[12px] text-slate-300 italic">No special notes</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}