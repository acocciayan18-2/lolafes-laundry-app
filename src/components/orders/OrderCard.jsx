import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconPhone, 
  IconArrowRight, IconMapPin, IconInfo, IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp, IconStatusProcessing, IconStatusReady
} from "../icons";
import "../../style/OrderCard.css";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { useActivityStore } from "../../store/activities/useActivityStore";

const IconEdit = ({ className }) => (
  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 20h4L18.5 9.5a2.829 2.829 0 0 0-4-4L4 16v4Z"></path>
    <path d="m13.5 6.5 4 4"></path>
  </svg>
);

const statusConfig = {
  pending: { banner: "bg-status-pending", theme: "bg-status-pending/10 text-status-pending border border-status-pending", icon: IconStatusPending, label: "Pending", nextStatus: "in_progress" },
  in_progress: { banner: "bg-status-process", theme: "bg-status-process/10 text-status-process border border-status-process", icon: IconStatusProcessing, label: "Processing", nextStatus: "ready" },
  ready: { banner: "bg-status-ready", theme: "bg-status-ready/10 text-status-ready border border-status-ready",icon: IconStatusReady, label: "Ready", nextStatus: "picked_up" },
  completed: { banner: "bg-status-complete",theme: "bg-status-complete/10 text-status-complete border border-status-complete", icon: IconStatusCompleted, label: "Completed", nextStatus: null },
  picked_up: { banner: "bg-status-picked", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Picked Up", nextStatus: null }
};

const statusOptions = [
  // { value: "pending", label: "Pending", icon: IconStatusPending },
  { value: "in_progress", label: "Processing", icon: IconStatusProcessing },
  { value: "ready", label: "Ready", icon: IconStatusReady },
  { value: "completed", label: "Completed", icon: IconStatusCompleted },
  { value: "picked_up", label: "Picked Up", icon: IconStatusPickedUp }
];

export default function OrderCard({ order }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false);
  const dropdownRef = useRef(null);

  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const togglePaymentStatus = useOrderStore((state) => state.togglePaymentStatus);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  const status = statusConfig[order.status] || statusConfig.pending;
  const instructions = order.special_instructions || order.notes;

  const getFormattedDate = (dateObj) => {
    const d = dateObj?.seconds ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
      showNotification("Cannot pick up unpaid orders!", "error");
      setIsOpen(false);
      return;
    }
    e.stopPropagation();
    setIsOpen(false);
    try {
      await updateOrderStatus(order.id, newStatus);
      logActivity(order, newStatus, 'status_update');
    } catch (err) {
      showNotification("Failed to update status.", "error");
    }
  };

  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const handlePaymentToggle = async (e) => {
    e.stopPropagation();
    if (isUpdatingPayment) return;
    setIsUpdatingPayment(true);
    try {
      await togglePaymentStatus(order.id, order.is_paid);
      const paymentAction = !order.is_paid ? "Payment Received" : "Payment Reversed";
      showNotification(paymentAction, "success");
      logActivity({ ...order, customer_name: order.customer_name }, order.status, { 
        action: 'payment_update', 
        label: paymentAction 
      });
    } catch (err) {
      showNotification("Failed to update payment.", "error");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer !shadow-sm rounded-2xl ${
        isOpen ? "z-50 shadow-md" : 
        isExpanded ? "z-40 shadow-lg" : "bg-app-light"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`} />
      
      <div className="flex flex-col ml-2">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 md:p-4">
          {/* Customer Info Section */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-hollow bg-white`}>
              <status.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* NAME: text-base-text */}
                <h3 className="font-bold text-text-dark text-sm-text  tracking-tight">{order.customer_name}</h3>
                {/* TIMESTAMP: text-nano */}
                <span className="text-nano font-bold text-text-dark/70 uppercase">
                  {dateStamp} <span className="mx-0.5 opacity-30">|</span> {timeStamp}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* ORDER ID: text-nano */}
                <span className="text-nano font-bold text-text-dark px-2 py-0.5 rounded border uppercase bg-white/50">{order.order_number}</span>
                {/* STATUS: text-nano */}
                <span className={`text-nano font-bold uppercase px-2 py-0.5 rounded border ${status.theme}`}>{status.label}</span>
              </div>
            </div>
          </div>

          {/* Payment & Action Section */}
          <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
            <div className="text-left lg:text-right cursor-pointer hover:opacity-80 transition-opacity" onClick={handlePaymentToggle}>
              {/* PAID BADGE: text-nano */}
              <span className={`text-nano font-bold px-1.5 py-0.5 rounded mb-1 inline-block border ${order.is_paid ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-500 bg-red-50 border-red-500'}`}>
                {order.is_paid ? "PAID" : "UNPAID"}
              </span>
              {/* PRICE: text-h3 */}
              <p className="text-h3 font-bold text-text-dark leading-none">₱{order.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="flex items-center gap-1.5" ref={dropdownRef}>
              <div className="relative">
                {/* UPDATE BUTTON: text-sm-text */}
                <button onClick={toggleDropdown} className={`h-8 px-3 text-sm-text font-medium rounded-lg border transition-all ${isOpen ? "bg-app-dark text-white" : "bg-white text-text-dark border-app-dark/20 "}`}>
                  Update
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 ${isDropUp ? "bottom-full mb-2" : "top-full mt-1"}`}
                    >
                      {statusOptions.map((option) => (
                        <button key={option.value} onClick={(e) => handleStatusChange(e, option.value)} className={`w-full px-3 py-2 text-left text-base-text font-normal flex items-center justify-between ${order.status === option.value ? "bg-blue-50 text-blue-600" : "text-text-dark hover:bg-slate-50"}`}>
                          {option.label}
                          <option.icon className="w-4 h-4 opacity-70" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {status.nextStatus && (
                <button onClick={(e) => handleStatusChange(e, status.nextStatus)} className="bg-btn-primary hover:bg-btn-primary/80 text-white px-4 h-8 rounded-lg text-sm-text font-medium flex items-center gap-1.5 shadow-md active:scale-95 ">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconShirt className="w-3.5 h-3.5 text-text-dark/50" />
                  {/* EXPANDED HEADER: text-micro */}
                  <h4 className="text-micro font-bold text-text-dark/50 uppercase ">Services</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {order.services?.map((s, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center shadow-sm">
                      {/* SERVICE NAME: text-sm-text */}
                      <span className="text-sm-text font-medium text-text-dark">{s.service_name}</span>
                      {/* SERVICE QTY: text-micro */}
                      <span className="ml-2 text-micro  font-bold text-btn-primary">
                        x{s.quantity || s.weight_kg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconInfo className="w-3.5 h-3.5 text-text-dark/50" />
                  <h4 className="text-micro font-bold text-text-dark/50 uppercase ">Other Info</h4>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <IconPhone className="w-3.5 h-3.5 text-text-dark/60" />
                    {/* DETAILS: text-sm-text */}
                    <span className="text-sm-text font-medium text-text-dark">{order.customer_phone}</span>
                  </div>
                  {order.customer_address && (
                    <div className="flex items-start gap-2">
                      <IconMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-text-dark/60" />
                      <span className="text-sm-text font-medium text-text-dark leading-relaxed break-words flex-1">{order.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <IconEdit className="w-3.5 h-3.5 text-text-dark/50" />
                  <h4 className="text-micro font-bold text-text-dark/50 uppercase ">Notes</h4>
                </div>
                {instructions ? (
                  <p className="text-sm-text font-medium text-text-dark leading-snug italic break-words">{instructions}</p>
                ) : (
                  <span className="text-micro text-text-dark/40 italic">No special notes</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}