import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { silentPrint } from "../../services/printerService";
import { useSettingsStore } from "../../store/settings/useSettingsStore";

import "../../style/OrderCard.css";
import {
  IconArrowRight, IconCreditCard, IconDelivery, IconDoubleCheck,
  IconGCash, IconHandover, IconInfo, IconMapPin, IconPhone,
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp,
  IconStatusProcessing, IconStatusReady, IconWallet, IconLoading, IconReceipt
} from "../icons";
import CancelOrderModal from "./CancelOrderModal";

const statusConfig = {
  pending: { banner: "bg-status-pending", theme: "bg-status-pending/10 text-status-pending border border-status-pending", icon: IconStatusPending, label: "Pending", nextStatus: "in_progress" },
  in_progress: { banner: "bg-status-process", theme: "bg-status-process/10 text-status-process border border-status-process", icon: IconStatusProcessing, label: "Processing", nextStatus: "ready" },
  ready: { banner: "bg-status-ready", theme: "bg-status-ready/10 text-status-ready border border-status-ready", icon: IconStatusReady, label: "Ready", nextStatus: "completed" },
  completed: { banner: "bg-status-complete", theme: "bg-status-complete/10 text-status-complete border border-status-complete", icon: IconStatusCompleted, label: "Completed", nextStatus: 'picked_up' },
  picked_up: { banner: "bg-status-picked", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Picked Up", nextStatus: null },
  delivered: { banner: "bg-emerald-500", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Delivered", nextStatus: null }
};

const handoverConfig = {
  pickup: { label: "Pickup", theme: "text-amber-700 ", icon: <IconHandover className="w-4 h-4" /> },
  delivery: { label: "Delivery", theme: "text-blue-700 ", icon: <IconDelivery className="w-4 h-4" /> }
};

const statusOptions = [
  { value: "in_progress", label: "Processing", icon: IconStatusProcessing },
  { value: "ready", label: "Ready", icon: IconStatusReady },
  { value: "completed", label: "Completed", icon: IconStatusCompleted },
  { value: "picked_up", label: "Picked Up", icon: IconStatusPickedUp },
  { value: "delivered", label: "Delivered", icon: IconStatusPickedUp }
];

export default function OrderCard({ order }) {
  // --- UI States ---
  const [showPaymentPopover, setShowPaymentPopover] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isDropUp, setIsDropUp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [tempFee, setTempFee] = useState(order.delivery_fee || 0);

  // --- Refs ---
  const dropdownRef = useRef(null);
  const paymentRef = useRef(null);
  const cardRef = useRef(null); // Added to prevent weird scrolling bugs

  // --- Stores ---
  const { receiptConfig } = useSettingsStore();
  const settings = useOrderStore((state) => state.settings);
  const { 
    cancelOrder, updateOrderStatus, togglePaymentStatus, 
    isOrderStuck, isOrderLocked, parseTimestamp, updateHandoverMethod,
  } = useOrderStore();
  const { showNotification } = useNotificationStore();
  const { logActivity } = useActivityStore();

  // --- Derived Data (Memoized for Speed) ---
  const isStuck = useMemo(() => isOrderStuck(order), [order, isOrderStuck]);
  const isLocked = useMemo(() => isOrderLocked(order), [order, isOrderLocked]);
  
  const createdDate = useMemo(() => parseTimestamp(order.created_at || order.created_date) || new Date(), [order, parseTimestamp]);
  const handoverDate = useMemo(() => 
    order.status === 'picked_up' || order.status === 'delivered' 
      ? parseTimestamp(order.picked_up_at || order.updated_at) 
      : null, 
  [order, parseTimestamp]);

  const status = useMemo(() => {
    const base = statusConfig[order.status] || statusConfig.pending;
    return {
      ...base,
      nextStatus: order.handover_method === 'delivery' && order.status === 'completed' ? 'delivered' : base.nextStatus
    };
  }, [order.status, order.handover_method]);

  const filteredStatusOptions = useMemo(() => statusOptions.filter(option => {
    if (order.handover_method === 'delivery' && option.value === 'picked_up') return false;
    if (order.handover_method === 'pickup' && option.value === 'delivered') return false;
    return true;
  }), [order.handover_method]);

  // --- Handlers (Memoized to prevent unnecessary re-renders of children) ---
  const handlePaymentClick = useCallback((e) => {
    e.stopPropagation();
    if (!order.is_paid && !isLocked) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Ensure popover doesn't go off-screen
      setIsDropUp((window.innerHeight - rect.bottom) < 160);
      setShowPaymentPopover(prev => !prev);
    }
  }, [order.is_paid, isLocked]);

  const handleTogglePaid = async (e) => {
    e.stopPropagation();
    if (isLocked) return;
    try {
      const targetStatus = !order.is_paid;
      await togglePaymentStatus(order.id, targetStatus, order.payment_method || 'Cash');
      showNotification(targetStatus ? "Marked as PAID" : "Marked as UNPAID", targetStatus ? "success" : "info");
    } catch (err) {
      showNotification("Database sync failed.", "error");
    }
  };

  const selectPaymentMethod = async (method) => {
    try {
      await togglePaymentStatus(order.id, true, method); 
      showNotification(`Order settled via ${method}`, "success");
      logActivity(order, order.status, { action: 'payment_update', label: `Paid via ${method}` });
      setShowPaymentPopover(false);
    } catch (err) {
      showNotification("Payment update failed.", "error");
    }
  };

  const handleStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    const isHandover = newStatus === "picked_up" || newStatus === "delivered";
    
    if (isHandover && !order.is_paid) {
      showNotification(`Order #${order.order_number} must be PAID before handover!`, "error");
      setIsOpen(false);
      return;
    }

    if (isLocked) {
      showNotification("This order is finalized and locked.", "info");
      return;
    }

    setIsOpen(false);
    try {
      await updateOrderStatus(order, newStatus);
      logActivity(order, newStatus, { action: 'status_update', label: `Moved to ${newStatus}` });
      showNotification(`Status updated to ${newStatus}`, "success");
    } catch (err) {
      showNotification("Could not update status.", "error");
    }
  };

  const handleManualPrint = async (e) => {
    e.stopPropagation();
    setIsPrinting(true);
    try {
      await silentPrint(order, settings.defaultPrinter || 'browser', receiptConfig); 
      showNotification("Sending to printer...", "success");
    } catch (err) {
      showNotification("Print failed.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleHandoverToggle = async (e) => {
    e.stopPropagation();
    if (isLocked) return;

    if (order.handover_method === 'delivery') {
      const feeToDeduct = Number(order.delivery_fee || 0);
      const newTotal = Math.max(0, Number(order.total_amount) - feeToDeduct);
      try {
         await updateHandoverMethod(order.id, 'pickup', 0, newTotal);
         showNotification(`Switched to Pickup. ₱${feeToDeduct} removed.`, "info");
      } catch(err) {
         showNotification("Failed to switch method.", "error");
      }
    } else {
      setTempFee(order.delivery_fee || 0); // Reset temp fee before showing
      setIsEditingFee(true);
    }
  };

  const confirmDeliveryFee = async (e) => {
    e.stopPropagation();
    // 🛡️ VALIDATION: Ensure fee is a valid positive number
    const feeToAdd = Math.max(0, Number(tempFee) || 0); 
    const newTotal = Number(order.total_amount) + feeToAdd;

    try {
      await updateHandoverMethod(order.id, 'delivery', feeToAdd, newTotal);
      setIsEditingFee(false);
      showNotification(`Delivery set: +₱${feeToAdd} fee added.`, "success");
    } catch (err) {
      showNotification("Error updating fee", "error");
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

  // --- Click Outside Cleanup ---
  useEffect(() => {
    const handleClick = (e) => {
      if (paymentRef.current && !paymentRef.current.contains(e.target)) setShowPaymentPopover(false);
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
      // Optional: Cancel fee editing if they click away
      if (isEditingFee && cardRef.current && !cardRef.current.contains(e.target)) setIsEditingFee(false); 
    };
    
    // Only attach listener if a popup is actually open (Performance boost)
    if (isOpen || showPaymentPopover || isEditingFee) {
       document.addEventListener("mousedown", handleClick);
    }
    
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, showPaymentPopover, isEditingFee]);

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer rounded-2xl ${
          isStuck && order.status !== 'picked_up' && order.status !== 'delivered' ? 'border-red-300 bg-red-50/10' : 'shadow-sm'
        } ${isOpen ? "z-50 shadow-md" : isExpanded ? "z-40 shadow-lg" : "bg-app-light"}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`} />
        
        <div className="flex flex-col ml-2">
          {/* HEADER ROW */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 md:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-hollow bg-white">
                  <status.icon className="w-5 h-5" />
                </div>
                {isStuck && order.status !== 'picked_up' && order.status !== 'delivered' && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                  </span>
                )}
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-dark text-sm-text uppercase truncate max-w-[150px]">{order.customer_name}</h3>
                  <span className="text-nano font-bold text-text-dark/40 uppercase px-1.5 py-0.5 rounded">
                   {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {/* HANDOVER SECTION */}
                  {isEditingFee ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <span className="absolute text-micro left-2 top-1/2 -translate-y-1/2 text-nano font-bold text-blue-600 pointer-events-none">₱</span>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          autoFocus
                          value={tempFee}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            if ((val.match(/\./g) || []).length <= 1) setTempFee(val);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmDeliveryFee(e); }} // User-friendly Enter key submit
                          className="w-16 h-7 pl-4 pr-2 text-micro font-bold border border-blue-400 rounded-lg focus:outline-none bg-blue-50 text-blue-700 placeholder:text-blue-300"
                          placeholder="0"
                        />
                      </div>
                      <button onClick={confirmDeliveryFee} className="h-7 px-2 bg-blue-600 text-white rounded-lg text-nano font-bold hover:bg-blue-700 active:scale-95 transition-all">OK</button>
                      <button onClick={(e) => { e.stopPropagation(); setIsEditingFee(false); }} className="text-nano font-bold text-rose-600 hover:text-rose-500 px-1">Cancel</button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => e.stopPropagation()} 
                      onDoubleClick={handleHandoverToggle}
                      title="Double-click to set Delivery Fee"
                      className={`text-nano font-bold uppercase px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 select-none hover:brightness-95 shadow-sm ${
                        order.handover_method === 'delivery' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {handoverConfig[order.handover_method]?.icon}
                      {handoverConfig[order.handover_method]?.label}
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-nano font-bold px-2 py-0.5 rounded border bg-white/50">#{order.order_number}</span>
                  <span className={`text-nano font-bold uppercase px-2 py-0.5 rounded border ${status.theme}`}>{status.label}</span>
                  
                  {handoverDate && (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md animate-in fade-in slide-in-from-left-2 duration-500">
                      <IconDoubleCheck className="w-3 h-3 text-green-700 stroke-green-700" />
                      <span className="text-nano font-bold uppercase">
                        {handoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {handoverDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {isStuck && order.status !== 'picked_up' && order.status !== 'delivered' && (
                     <span className="text-nano font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase">Stuck</span>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION & PRICING ROW */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="relative flex flex-col items-start lg:items-end gap-1" ref={paymentRef}>
                
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={(e) => e.stopPropagation()} 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (isLocked) return;
                      if (order.is_paid) handleTogglePaid(e);
                      else handlePaymentClick(e);
                    }}
                    title="Double-click to change status"
                    className={`text-nano font-bold px-2 py-0.5 rounded border transition-all active:scale-95 select-none ${
                      isLocked ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed' : 
                      order.is_paid ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 cursor-pointer' : 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer'
                    }`}
                  >
                    {order.is_paid ? "PAID" : "UNPAID"}
                  </button>

                  {order.is_paid && (
                    <span className={`text-nano font-bold px-1.5 py-0.5 rounded border uppercase animate-in fade-in zoom-in duration-300 ${
                      isLocked ? 'text-slate-400 border-slate-200' : 'text-emerald-700 bg-emerald-100 border-emerald-200'
                    }`}>
                      {order.payment_method || 'Cash'}
                    </span>
                  )}
                </div>

                <div 
                  className={`flex flex-col lg:flex-row lg:items-center gap-x-2 gap-y-0.5 ${isLocked || order.is_paid ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={(e) => e.stopPropagation()} 
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!order.is_paid && !isLocked) handlePaymentClick(e);
                  }}
                >
                  {order.handover_method === 'delivery' && order.delivery_fee > 0 && (
                    <div className="flex justify-start lg:justify-end">
                      <span className="text-nano font-bold text-blue-600 tracking-tighter whitespace-nowrap pr-1 pt-1 pb-1">
                        + ₱{order.delivery_fee} DELIVERY
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-start lg:items-end">
                    <p className={`text-h3 font-bold transition-colors leading-none ${
                      isLocked ? 'text-slate-400' : 'text-text-dark group-hover/price:text-app-dark'
                    }`}>
                      ₱{Number(order.total_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {showPaymentPopover && !isLocked && !order.is_paid && (
                    <motion.div 
                      initial={{ opacity: 0, y: isDropUp ? 10 : -10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: isDropUp ? 10 : -10, scale: 0.95 }} 
                      className={`absolute right-0 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 overflow-hidden ${isDropUp ? "bottom-full mb-2" : "top-6"}`}
                    >
                      {[{ label: 'Cash', icon: IconWallet }, { label: 'GCash', icon: IconGCash }, { label: 'Card', icon: IconCreditCard }].map(({ label, icon: Icon }) => (
                        <button 
                          key={label} 
                          onClick={(e) => { e.stopPropagation(); selectPaymentMethod(label); }} 
                          className="w-full px-3 py-2 text-left text-sm font-medium text-text-dark flex items-center gap-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="shrink-0"><Icon className="w-4 h-4" /></div>
                          <span>{label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* STATUS UPDATE DROPDOWN & NEXT BUTTON */}
              <div className="flex items-center gap-1.5" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
                    disabled={isLocked} 
                    className={`h-8 px-3 text-sm-text font-medium rounded-lg border transition-all ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed" : isOpen ? "bg-app-dark text-white" : "bg-white text-text-dark border-app-dark/20"}`}
                  >
                    Update
                  </button>
                  <AnimatePresence>
                    {isOpen &&  (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        className="absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 top-full mt-1 overflow-hidden"
                      >
                        {filteredStatusOptions.map((option) => (
                          <button 
                            key={option.value} 
                            onClick={(e) => handleStatusChange(e, option.value)} 
                            className={`w-full px-3 py-2 text-left text-base-text flex items-center justify-between transition-colors ${order.status === option.value ? "font-bold bg-slate-50 text-text-dark" : "font-normal text-text-dark/90 hover:bg-slate-50"}`}
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
                    className="bg-btn-primary hover:bg-btn-primary/90 text-white pl-4 pr-3 py-1.5 rounded-lg shadow-md active:scale-95 flex flex-col items-center justify-center transition-all group"
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

          {/* EXPANDED CONTENT SECTION */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ height: { duration: 0.25, ease: "circOut" }, opacity: { duration: 0.2, ease: "linear" } }}
                className="px-4 mb-4 overflow-hidden"
              >
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
                          <span className="ml-2 text-micro font-bold text-btn-primary">x{s.quantity || s.weight_kg}</span>
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
                      <p className="text-sm-text font-medium text-text-dark/30 leading-snug italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                        {order.special_instructions || order.notes || "No notes provided."}
                      </p>
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-2">
                      {receiptConfig.showPrintReceipt && (
                        <button
                          onClick={handleManualPrint}
                          disabled={isPrinting} 
                          title="Print Receipt"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-micro font-bold transition-all active:scale-95 ${
                            isPrinting ? "bg-slate-50 text-slate-400 cursor-wait border-slate-100" : "bg-white text-text-dark border-slate-200 hover:bg-slate-50 hover:border-app-dark/20 shadow-sm"
                          }`} 
                        >
                          {isPrinting ? <IconLoading className="w-3.5 h-3.5 animate-spin" /> : <IconReceipt className="w-3.5 h-3.5 opacity-60" />}
                          <span>{isPrinting ? "Printing..." : "Print Receipt"}</span>
                        </button>
                      )}

                      {order.status === 'pending' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }} 
                          className="flex items-center gap-1.5 px-4 py-2 text-micro font-bold text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-all active:scale-95"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <CancelOrderModal 
        isOpen={showCancelModal} 
        onClose={() => setShowCancelModal(false)} 
        onConfirm={handleConfirmCancel} 
        orderNumber={order.order_number} 
      />
    </>
  );
}