import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import "../../style/OrderCard.css";
import {
  IconArrowRight, IconCreditCard, IconGCash, IconInfo, IconMapPin, IconPhone,
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp,
  IconStatusProcessing, IconStatusReady, IconWallet, IconCheck,
  IconCheckWhite,
  IconCheckStroke,
  IconDoubleCheck
} from "../icons";
import CancelOrderModal from "./CancelOrderModal";

const statusConfig = {
  pending: { banner: "bg-status-pending", theme: "bg-status-pending/10 text-status-pending border border-status-pending", icon: IconStatusPending, label: "Pending", nextStatus: "in_progress" },
  in_progress: { banner: "bg-status-process", theme: "bg-status-process/10 text-status-process border border-status-process", icon: IconStatusProcessing, label: "Processing", nextStatus: "ready" },
  ready: { banner: "bg-status-ready", theme: "bg-status-ready/10 text-status-ready border border-status-ready", icon: IconStatusReady, label: "Ready", nextStatus: "completed" },
  completed: { banner: "bg-status-complete", theme: "bg-status-complete/10 text-status-complete border border-status-complete", icon: IconStatusCompleted, label: "Completed", nextStatus: 'picked_up' },
  picked_up: { banner: "bg-status-picked", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Picked Up", nextStatus: null }
};

const statusOptions = [
  { value: "in_progress", label: "Processing", icon: IconStatusProcessing },
  { value: "ready", label: "Ready", icon: IconStatusReady },
  { value: "completed", label: "Completed", icon: IconStatusCompleted },
  { value: "picked_up", label: "Picked Up", icon: IconStatusPickedUp }
];

export default function OrderCard({ order }) {
  const [showPaymentPopover, setShowPaymentPopover] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false);
  
  const dropdownRef = useRef(null);
  const paymentRef = useRef(null);

  const { 
    cancelOrder, updateOrderStatus, togglePaymentStatus, 
    isOrderStuck, isOrderLocked, parseTimestamp 
  } = useOrderStore();
  
  const { showNotification } = useNotificationStore();
  const { logActivity } = useActivityStore();

  const status = statusConfig[order.status] || statusConfig.pending;
  const isStuck = isOrderStuck(order);
  const isLocked = isOrderLocked(order);

  // --- Handover Logic ---
  const createdDate = parseTimestamp(order.created_at || order.created_date) || new Date();
  const handoverDate = order.status === 'picked_up' 
    ? parseTimestamp(order.picked_up_at || order.updated_at) 
    : null;

  const handlePaymentClick = (e) => {
    e.stopPropagation();
    if (!order.is_paid && !isLocked) {
      const rect = e.currentTarget.getBoundingClientRect();
      setIsDropUp((window.innerHeight - rect.bottom) < 160);
      setShowPaymentPopover(!showPaymentPopover);
    }
  };

  const selectPaymentMethod = async (method) => {
    try {
      await togglePaymentStatus(order.id, false, method);
      showNotification(`Settled via ${method}`, "success");
      logActivity(order, order.status, { action: 'payment_update', label: `Paid via ${method}` });
      setShowPaymentPopover(false);
    } catch (err) {
      showNotification("Update failed", "error");
    }
  };

  const handleStatusChange = async (e, newStatus) => {
    if (newStatus === "picked_up" && !order.is_paid) {
      showNotification("Payment required first!", "error");
      return setIsOpen(false);
    }
    e.stopPropagation();
    setIsOpen(false);
    try {
      await updateOrderStatus(order, newStatus);
      logActivity(order, newStatus, 'status_update');
    } catch (err) {
      showNotification("Status update failed", "error");
    }
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelOrder(order.id);
      showNotification(`Order ${order.order_number} cancelled`, "success");
      logActivity(order, 'cancelled', { action: 'delete', label: 'Order Cancelled' });
      setShowCancelModal(false);
    } catch (err) {
      showNotification("Cancellation failed", "error");
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (paymentRef.current && !paymentRef.current.contains(e.target)) setShowPaymentPopover(false);
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, showPaymentPopover]);

  return (
    <>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer rounded-2xl ${
          isStuck && order.status !== 'picked_up' ? 'border-red-300 bg-red-50/10' : 'shadow-sm'
        } ${isOpen ? "z-50 shadow-md" : isExpanded ? "z-40 shadow-lg" : "bg-app-light"}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`} />
        
        <div className="flex flex-col ml-2">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 md:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-hollow bg-white">
                  <status.icon className="w-5 h-5" />
                </div>
                {isStuck && order.status !== 'picked_up' && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                  </span>
                )}
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-dark text-sm-text uppercase truncate max-w-[150px]">{order.customer_name}</h3>
                  <span className="text-nano font-bold text-text-dark/50 uppercase  px-1.5 py-0.5 rounded">
                   {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-nano font-bold px-2 py-0.5 rounded border bg-white/50">#{order.order_number}</span>
                  <span className={`text-nano font-bold uppercase px-2 py-0.5 rounded border ${status.theme}`}>{status.label}</span>
                  
                  {/* Accurate Handover Badge */}
                  {handoverDate && (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md animate-in fade-in slide-in-from-left-2 duration-500">
                      <IconDoubleCheck className="w-3 h-3 text-green-700 stroke-green-700" />
                      <span className="text-nano font-bold uppercase">
                        {handoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {handoverDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {isStuck && order.status !== 'picked_up' && <span className="text-nano font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase">Stuck</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
              <div className="relative" ref={paymentRef}>
                <div className={`text-left lg:text-right ${isLocked || order.is_paid ? 'cursor-default' : 'cursor-pointer hover:opacity-70'}`} onClick={handlePaymentClick}>
                  <div className="flex flex-col items-start lg:items-end">
                    <div className="flex items-center gap-1.5 mb-1">
                      {order.is_paid && <span className={`text-nano font-bold px-1.5 py-0.5 rounded border uppercase ${isLocked ? 'text-slate-400 border-slate-200' : 'text-emerald-700 bg-emerald-100'}`}>{order.payment_method || 'Cash'}</span>}
                      <span className={`text-nano font-bold px-1.5 py-0.5 rounded border transition-colors ${isLocked ? 'text-slate-400 bg-slate-100' : order.is_paid ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>{order.is_paid ? "PAID" : "UNPAID"}</span>
                    </div>
                    <p className={`text-h3 font-bold ${isLocked ? 'text-slate-400' : 'text-text-dark'}`}>₱{order.total_amount?.toLocaleString()}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {showPaymentPopover && !isLocked && !order.is_paid && (
                    <motion.div initial={{ opacity: 0, y: isDropUp ? 10 : -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: isDropUp ? 10 : -10, scale: 0.95 }} className={`absolute right-0 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 overflow-hidden ${isDropUp ? "bottom-full mb-2" : "top-full mt-2"}`}>
                      {[{ label: 'Cash', icon: IconWallet }, { label: 'GCash', icon: IconGCash }, { label: 'Maya', icon: IconCreditCard }].map(({ label, icon: Icon }) => (
                        <button key={label} onClick={(e) => { e.stopPropagation(); selectPaymentMethod(label); }} className="w-full px-3 py-2 text-left text-sm font-medium text-text-dark flex items-center gap-3 transition-colors hover:bg-slate-50">
                          <div className="shrink-0"><Icon className="w-4 h-4" /></div>
                          <span>{label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1.5" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
                    disabled={isLocked} 
                    className={`h-9 px-3 text-sm-text font-medium rounded-lg border transition-all ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed" : isOpen ? "bg-app-dark text-white" : "bg-white text-text-dark border-app-dark/20"}`}
                  >
                    Update
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                        className="absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 top-full mt-1 overflow-hidden"
                      >
                        {statusOptions.map((option) => (
                          <button 
                            key={option.value} 
                            onClick={(e) => handleStatusChange(e, option.value)} 
                            className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors ${order.status === option.value ? "font-bold bg-slate-50 text-text-dark" : "font-normal text-text-dark/90"}`}
                          >
                            <span>{option.label}</span>
                            <option.icon className="w-4 h-4 opacity-60" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {status.nextStatus && (
                  <button 
                    onClick={(e) => handleStatusChange(e, status.nextStatus)} 
                    className="bg-btn-primary hover:bg-btn-primary/90 text-white pl-4 pr-3 py-1.5  rounded-lg shadow-md active:scale-95 flex flex-col items-center justify-center transition-all group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm-text font-medium">Next</span>
                      <IconArrowRight className="w-3.5 h-3.5 !text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
  {isExpanded && (
    <motion.div 
      initial={{ height: 0, opacity: 0 }} 
      animate={{ height: "auto", opacity: 1 }} 
      exit={{ height: 0, opacity: 0 }} 
      className="px-4 mb-4 overflow-hidden"
    >
      {/* 3 Columns on Laptop (md and up), 1 Column on CP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-4">
        
        {/* Column 1: Services */}
        <div className="space-y-2">
          <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5">
            <IconShirt className="w-3.5 h-3.5" /> Services
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {order.services?.map((s, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg flex items-center">
                <span className="text-sm-text font-medium text-text-dark">{s.service_name}</span>
                <span className="ml-2 text-micro font-black text-btn-primary">x{s.quantity || s.weight_kg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Contact Details */}
        <div className="space-y-2">
          <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5">
            <IconInfo className="w-3.5 h-3.5" /> Contact Details
          </h4>
          <div className="space-y-1.5 text-sm-text font-medium text-text-dark">
            <div className="flex items-center gap-2">
              <IconPhone className="w-3.5 h-3.5 opacity-60" /> 
              {order.customer_phone || "No phone"}
            </div>
            {order.customer_address && (
              <div className="flex items-start gap-2">
                <IconMapPin className="w-3.5 h-3.5 mt-0.5 opacity-60" /> 
                <span className="break-words">{order.customer_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Notes & Action */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h4 className="text-micro font-bold text-text-dark/50 uppercase">Notes</h4>
            <p className="text-sm-text font-medium text-amber-700 leading-snug italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
              {order.special_instructions || order.notes || "No notes provided."}
            </p>
          </div>

          {/* Cancel button stays at the bottom of the 3rd column */}
          {order.status === 'pending' && (
            <div className="flex justify-end pt-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }} 
                className="flex items-center gap-1.5 px-4 py-2 text-micro font-bold text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-all active:scale-95"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  )}
</AnimatePresence>
        </div>
      </div>
      <CancelOrderModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleConfirmCancel} orderNumber={order.order_number} />
    </>
  );
}