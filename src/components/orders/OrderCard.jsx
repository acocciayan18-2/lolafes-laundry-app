import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { silentPrint } from "../../services/printerService";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { usePaymentSettingsStore } from "../../store/settings/usePaymentSettingsStore"; 

import PaymentUpdateModal from "./PaymentUpdateModal";
import ChangeHandoverModal from "./ChangeHandoverModal"; 
import CompleteOrderModal from "./CompleteOrderModal";
import CancelOrderModal from "./CancelOrderModal";

// import "../../style/OrderCard.css";
import {
  IconArrowRight, IconDelivery, IconDoubleCheck,
  IconHandover, IconInfo, IconMapPin, IconPhone,
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp,
  IconStatusProcessing, IconStatusReady, IconLoading, IconReceipt,
  IconEditPen, IconBan
} from "../icons";

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const statusConfig = Object.freeze({
  pending: { banner: "bg-status-pending", theme: "bg-status-pending/10 text-status-pending border border-status-pending", icon: IconStatusPending, label: "Pending", nextStatus: "in_progress" },
  in_progress: { banner: "bg-status-process", theme: "bg-status-process/10 text-status-process border border-status-process", icon: IconStatusProcessing, label: "Processing", nextStatus: "ready" },
  ready: { banner: "bg-status-ready", theme: "bg-status-ready/10 text-status-ready border border-status-ready", icon: IconStatusReady, label: "Ready", nextStatus: "completed" },
  completed: { banner: "bg-status-complete", theme: "bg-status-complete/10 text-status-complete border border-status-complete", icon: IconStatusCompleted, label: "Completed", nextStatus: 'picked_up' },
  picked_up: { banner: "bg-status-picked", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Picked Up", nextStatus: null },
  delivered: { banner: "bg-status-picked", theme: "bg-status-picked/10 text-status-picked border border-status-picked", icon: IconStatusPickedUp, label: "Delivered", nextStatus: null }
});

const handoverConfig = Object.freeze({
  pickup: { label: "Pickup", theme: "text-amber-700", icon: <IconHandover className="w-4 h-4" aria-hidden="true" /> },
  delivery: { label: "Delivery", theme: "text-blue-700", icon: <IconDelivery className="w-4 h-4" aria-hidden="true" /> }
});

const statusOptions = Object.freeze([
  { value: "in_progress", label: "Processing", icon: IconStatusProcessing },
  { value: "ready", label: "Ready", icon: IconStatusReady },
  { value: "completed", label: "Completed", icon: IconStatusCompleted },
  { value: "picked_up", label: "Picked Up", icon: IconStatusPickedUp },
  { value: "delivered", label: "Delivered", icon: IconStatusPickedUp }
]);

const statusLabels = Object.freeze({
  pending: "Pending", in_progress: "Processing", ready: "Ready",
  completed: "Completed", picked_up: "Picked Up", delivered: "Delivered", cancelled: "Cancelled"
});

const safeMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function OrderCard({ order, tick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState(order?.special_instructions || order?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const dropdownRef = useRef(null);
  const paymentRef = useRef(null);
  const cardRef = useRef(null);
  const isMounted = useRef(false);

  const { receiptConfig, systemConfig } = useSettingsStore();
  const settings = useOrderStore((state) => state.settings);
  const { 
    cancelOrder, updateOrderStatus, togglePaymentStatus, isOrderUnclaimed,
    isOrderStuck, isOrderLocked, parseTimestamp, updateHandoverMethod, updateOrderNotes
  } = useOrderStore();
  const { showNotification } = useNotificationStore();
  const { logActivity } = useActivityStore();

  const methods = usePaymentSettingsStore((state) => state.methods);
  const fetchPaymentMethods = usePaymentSettingsStore((state) => state.fetchPaymentMethods);

  useEffect(() => {
    isMounted.current = true;
    let unsubscribe = null;
    
    if (!methods || methods.length === 0) {
       unsubscribe = fetchPaymentMethods();
    }
    
    return () => { 
      isMounted.current = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isStuck = useMemo(() => isOrderStuck(order), [order, isOrderStuck]);
  const isUnclaimed = useMemo(() => isOrderUnclaimed(order), [order, isOrderUnclaimed]);
  const isLocked = useMemo(() => isOrderLocked(order), [order, isOrderLocked]);
  
  const createdDate = useMemo(() => parseTimestamp(order?.created_at || order?.created_date) || new Date(), [order, parseTimestamp]);
  const handoverDate = useMemo(() => 
    order?.status === 'picked_up' || order?.status === 'delivered' 
      ? parseTimestamp(order.picked_up_at || order.updated_at) 
      : null, 
  [order, parseTimestamp]);

  const status = useMemo(() => {
    const base = statusConfig[order?.status] || statusConfig.pending;
    return {
      ...base,
      nextStatus: order?.handover_method === 'delivery' && order?.status === 'completed' ? 'delivered' : base.nextStatus
    };
  }, [order?.status, order?.handover_method]);

  const filteredStatusOptions = useMemo(() => statusOptions.filter(option => {
    if (order?.handover_method === 'delivery' && option.value === 'picked_up') return false;
    if (order?.handover_method === 'pickup' && option.value === 'delivered') return false;
    return true;
  }), [order?.handover_method]);

  const cardStyles = useMemo(() => {
    if (isUnclaimed) return "border-red-500 bg-red-50/5 shadow-red-100 shadow-sm";
    if (isStuck) return "bg-orange-50/5 shadow-sm";
    return "border-gray-200 shadow-sm";
  }, [isStuck, isUnclaimed]);

  const depthStyles = isOpen ? "z-50 shadow-md" : isExpanded ? "z-40 shadow-lg" : "bg-app-light";

  const activePaymentMethods = useMemo(() => {
    if (!Array.isArray(methods) || methods.length === 0) {
      return [{ id: 'fallback-cash', name: 'Cash', isActive: true }];
    }
    return methods.filter(method => method && method.isActive !== false);
  }, [methods]);

  const handleToggleExpand = useCallback((e) => {
    if (e.target === cardRef.current || e.target.closest('.card-trigger-area')) {
      setIsExpanded(prev => !prev);
    }
  }, []);

  const handleSaveNotes = useCallback(async (e) => {
    if (e) e.stopPropagation();
    const originalNotes = order?.special_instructions || order?.notes || "";
    const cleanTempNotes = tempNotes.trim().substring(0, 500);

    if (cleanTempNotes === originalNotes.trim()) {
      setIsEditingNotes(false);
      return; 
    }

    setIsSavingNotes(true);
    try {
      await updateOrderNotes(order.id, cleanTempNotes);
      logActivity(order, order.status, { action: 'notes_update', label: `Updated notes: "${cleanTempNotes.substring(0, 20)}..."` });
      showNotification("Notes auto-saved.", "success");
      if (isMounted.current) setIsEditingNotes(false);
    } catch (error) {
      showNotification("Failed to save notes.", "error");
    } finally {
      if (isMounted.current) setIsSavingNotes(false);
    }
  }, [order, tempNotes, updateOrderNotes, logActivity, showNotification]);

  const handleCancelNotesEdit = useCallback((e) => {
    if (e) e.stopPropagation();
    setTempNotes(order?.special_instructions || order?.notes || "");
    setIsEditingNotes(false);
  }, [order]);

  const handleManualPrint = useCallback(async (e) => {
    e.stopPropagation();
    setIsPrinting(true);
    try {
      await silentPrint(order, settings.defaultPrinter || 'browser', receiptConfig); 
      logActivity(order, order.status, { action: 'print', label: "Reprinted Receipt" });
      showNotification("Sending to printer...", "success");
    } catch (err) {
      showNotification("Print failed.", "error");
    } finally {
      if (isMounted.current) setIsPrinting(false);
    }
  }, [order, settings.defaultPrinter, receiptConfig, logActivity, showNotification]);

  const handleConfirmHandoverChange = useCallback(async (newMethod, appliedFee, newTotal) => {
    try {
      await updateHandoverMethod(order.id, newMethod, appliedFee, newTotal);
      logActivity(order, order.status, { action: 'handover_update', label: `Switched to ${newMethod.toUpperCase()} (Fee: ₱${appliedFee})` });
      if (isMounted.current) setShowHandoverModal(false);
      showNotification(`Handover updated to ${newMethod}.`, "success");
    } catch (err) {
      showNotification("Failed to update handover.", "error");
    }
  }, [order, updateHandoverMethod, logActivity, showNotification]);

  const handleConfirmCancel = useCallback(async (reason) => {
    try {
      await cancelOrder(order.id, reason); 
      logActivity(order, "cancelled", { action: 'cancel', label: `Cancelled: ${reason}` });
      showNotification(`Order cancelled.`, "success");
      if (isMounted.current) setShowCancelModal(false);
    } catch (err) {
      showNotification(err.message, "error");
    }
  }, [order, cancelOrder, logActivity, showNotification]);

  const handlePaymentClick = useCallback((e) => {
    e.stopPropagation();
    if (!order?.is_paid && !isLocked) setShowPaymentModal(true); 
  }, [order?.is_paid, isLocked]);

  const selectPaymentMethod = useCallback(async (methodName, finalTendered) => {
    if (!order?.id) {
      showNotification("Critical Error: Order ID missing.", "error");
      return;
    }

    if (isLocked) {
      showNotification("Cannot update payment on a finalized order.", "error");
      return;
    }

    try {
      await togglePaymentStatus(order.id, true, methodName, finalTendered);
      
      logActivity(order, order.status, { 
        action: 'payment_update', 
        label: `Paid via ${methodName} (₱${finalTendered})` 
      });
      
      showNotification(`Order #${order.order_number} settled via ${methodName}`, "success");
      
      if (isMounted.current) {
        setShowPaymentModal(false); 
      }
    } catch (err) {
      console.error("[OrderCard] Payment update failed:", err);
      showNotification(err?.message || "Payment update failed. Please try again.", "error");
    }
  }, [order, isLocked, togglePaymentStatus, logActivity, showNotification]);

  const executeStatusUpdate = useCallback(async (newStatus, friendlyStatus, sendSms = false) => {
    if (isMounted.current) setIsOpen(false);
    try {
      await updateOrderStatus(order, newStatus);
      logActivity(order, newStatus, { action: 'status_update', label: `Moved to ${friendlyStatus}` });
      showNotification(`Status updated to ${friendlyStatus}`, "success");
      
      // ✨ FIX: Double-lock the SMS trigger to strictly exclude walk-ins.
      if (sendSms && !order?.is_walk_in && order?.customer_phone) {
        import('../../services/smsService').then(service => {
          service.sendStatusSMS(order.customer_phone, order.customer_name, order.order_number, "completed");
        });
      }
    } catch (err) {
      showNotification("Could not update status.", "error");
    }
  }, [order, updateOrderStatus, logActivity, showNotification]);

  const handleStatusChange = useCallback(async (e, newStatus) => {
    e.stopPropagation();
    const friendlyStatus = statusLabels[newStatus] || newStatus;
    const isHandover = newStatus === "picked_up" || newStatus === "delivered";
    
    if (isHandover && !order?.is_paid) {
      showNotification(`Order #${order.order_number} must be PAID before handover!`, "error");
      setIsOpen(false);
      return;
    }

    if (isLocked) {
      showNotification("This order is finalized and locked.", "info");
      return;
    }

    if (newStatus === "completed") {
      const needsConfirmation = systemConfig?.confirmCompletion ?? true;
      if (needsConfirmation) {
        setIsOpen(false);
        setShowCompleteModal(true);
        return;
      } else {
        await executeStatusUpdate("completed", "Completed", false); 
        return;
      }
    }

    await executeStatusUpdate(newStatus, friendlyStatus);
  }, [order, isLocked, systemConfig?.confirmCompletion, executeStatusUpdate, showNotification]);

  if (!order) return null;

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`Order ${order.order_number} for ${order.customer_name}. Status: ${status.label}. Click to ${isExpanded ? "collapse" : "expand"}.`}
        className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer rounded-2xl outline-none  ${cardStyles} ${depthStyles}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl ${status.banner}`} aria-hidden="true" />
        
        <div className="flex flex-col ml-2 card-trigger-area">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 p-3 md:p-4 card-trigger-area">
            <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto card-trigger-area">
              <div className="relative shrink-0 card-trigger-area">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-hollow bg-white" aria-hidden="true">
                  <status.icon className="w-5 h-5" />
                </div>
                {(isStuck || isUnclaimed) && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 z-10" aria-label={isUnclaimed ? "Unclaimed Warning" : "Stuck Order Warning"}>
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUnclaimed ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-white ${isUnclaimed ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex flex-col gap-1 w-full card-trigger-area">
                <div className="flex flex-wrap items-center gap-2 w-full card-trigger-area">
                  <h3 
                    title={order.customer_name} 
                    className={`font-bold text-text-dark text-sm-text transition-all card-trigger-area flex items-center gap-1.5 ${
                      isExpanded ? 'whitespace-normal break-words w-full sm:w-auto' : 'truncate max-w-[170px] sm:max-w-[200px]'
                    }`}
                  >
                    {order.customer_name}
                    {/* ✨ FIX: Visual Walk-In Indicator */}
                    {order.is_walk_in && (
                      <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
                    )}
                  </h3>
                  
                  <div className="flex flex-wrap justify-center gap-x-1 shrink min-w-[70px] text-nano leading-[1.2] font-bold text-text-dark/40 uppercase card-trigger-area">
                    <time dateTime={createdDate.toISOString()} className="whitespace-nowrap">
                      {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                    <time dateTime={createdDate.toISOString()} className="whitespace-nowrap">
                      {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLocked) setShowHandoverModal(true);
                    }} 
                    aria-label={`Change Handover Method. Current: ${order.handover_method}`}
                    disabled={isLocked}
                    className={`shrink-0 text-nano  uppercase px-1.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${
                      isLocked ? 'cursor-default opacity-80' : 'hover:scale-105 active:scale-95'
                    } ${
                      order.handover_method === 'delivery' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {handoverConfig[order.handover_method]?.icon}
                    {handoverConfig[order.handover_method]?.label}
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5 card-trigger-area">
                  <span className="text-nano font-bold px-2 py-0.5 rounded border bg-white/50 card-trigger-area">#{order.order_number}</span>
                  <span className={`text-nano font-bold uppercase px-2 py-0.5 rounded border card-trigger-area ${status.theme}`}>{status.label}</span>
                  {handoverDate && (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md card-trigger-area">
                      <IconDoubleCheck className="w-3 h-3 text-green-700" aria-hidden="true" />
                      <time dateTime={handoverDate.toISOString()} className="text-nano font-bold uppercase">
                        {handoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {handoverDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="relative flex flex-col items-start lg:items-end gap-1" ref={paymentRef}>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={handlePaymentClick}
                    disabled={isLocked || order.is_paid} 
                    aria-label={`Payment Status: ${order.is_paid ? "Paid" : "Unpaid"}. Click to update.`}
                    className={`text-nano font-bold px-2 py-0.5 rounded border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${
                      order.is_paid
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200 cursor-default' 
                        : 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100 cursor-pointer active:scale-95' 
                    } ${isLocked && !order.is_paid ? 'opacity-80 cursor-default hover:bg-red-50 active:scale-100' : ''}`}
                  >
                    {order.is_paid ? "PAID" : "UNPAID"}
                  </button>

                  {order.is_paid && (
                    <span className="text-nano font-bold px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-100 text-emerald-700 uppercase animate-in fade-in zoom-in duration-300">
                      {order.payment_method || 'Cash'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2">
                  {order.handover_method === 'delivery' && order.delivery_fee > 0 && (
                    <span className="text-nano font-bold text-blue-600 tracking-tighter whitespace-nowrap lg:pt-0.5">
                      + ₱{safeMoney(order.delivery_fee)} DELIVERY
                    </span>
                  )}
                  <p className={`text-h3 font-bold transition-colors leading-none ${isLocked ? 'text-slate-400' : 'text-text-dark'}`}>
                    ₱{safeMoney(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
                    disabled={isLocked} 
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    className={`h-8 px-3 text-sm-text  rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/50 ${isLocked ? "bg-slate-100 text-slate-400" : isOpen ? "bg-app-dark/5 " : "bg-white text-text-dark border-app-dark/20"}`}
                  >
                    Update
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        role="menu"
                        className="absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 top-full mt-1 overflow-hidden"
                      >
                        {filteredStatusOptions.map((option) => (
                          <button 
                            key={option.value} 
                            role="menuitem"
                            onClick={(e) => {
                              if (order.status === option.value) return;
                              handleStatusChange(e, option.value);
                            }} 
                            className={`w-full px-3 py-2 text-left text-sm-text flex items-center justify-between transition-colors focus:outline-none focus-visible:bg-slate-100 ${
                              order.status === option.value 
                                ? "font-bold bg-slate-50 pointer-events-none" 
                                : "font-normal hover:bg-slate-50"
                            }`}
                          >
                            <span>{option.label}</span>
                            <option.icon className="w-4 h-4 opacity-60" aria-hidden="true" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {status.nextStatus && (
                  <button 
                    onClick={(e) => handleStatusChange(e, status.nextStatus)}
                    aria-label={`Advance status to ${statusLabels[status.nextStatus]}`}
                    className="bg-btn-primary hover:bg-btn-primary/90 text-white pl-4 pr-3 py-1.5 rounded-lg shadow-md active:scale-95 flex items-center gap-1.5 transition-all group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-btn-primary"
                  >
                    <span className="text-sm-text ">Next</span>
                    <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="px-4 mb-4 overflow-hidden cursor-default" onClick={e => e.stopPropagation()}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-4">
                
                <div className="space-y-4 flex flex-col h-full">
                  <div>
                    <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5">
                      <IconShirt className="w-3.5 h-3.5" aria-hidden="true"/> Services
                    </h4>
                    <ul className="flex flex-wrap gap-1.5 list-none p-0 mt-2">
                      {Array.isArray(order.services) && order.services.map((s, idx) => (
                        <li key={s.id || idx} className="bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg flex items-center">
                          <span className="text-sm-text ">{s.service_name}</span>
                          <span className="ml-2 text-micro font-bold text-btn-primary">x{s.quantity || s.weight_kg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm" aria-label="Payment Breakdown">
                    <h4 className="text-micro font-bold text-text-dark/50 uppercase mb-2 tracking-wider">Payment Summary</h4>
                    <div className="space-y-1.5 text-sm-text">
                      <div className="flex justify-between">
                        <span className="text-text-dark/70">Subtotal/Total:</span>
                        <span className="font-bold text-text-dark">
                          ₱{safeMoney(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {order.is_paid && String(order.payment_method).toLowerCase().includes('cash') && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-text-dark/70">Amount Tendered:</span>
                            <span className="font-bold text-text-dark">
                              ₱{safeMoney(order.amount_tendered || order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                            <span className="text-text-dark/70 font-normal">Change Due:</span>
                            <span className="font-bold text-emerald-600">
                              ₱{safeMoney(order.change_due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5"><IconInfo className="w-3.5 h-3.5" aria-hidden="true"/> Contact Details</h4>
                  <address className="space-y-1.5 text-sm-text  text-text-dark not-italic">
                    <div className="flex items-center gap-2">
                      <IconPhone className="w-3.5 h-3.5 opacity-60" aria-hidden="true"/> 
                      {/* ✨ FIX: Anonymous fallback for phone number UI */}
                      {order.is_walk_in ? (
                        <span className="italic opacity-70">Anonymous (No Phone)</span>
                      ) : (
                        <span>{order.customer_phone || "No phone"}</span>
                      )}
                    </div>
                    {order.customer_address && (
                      <div className="flex items-start gap-2">
                        <IconMapPin className="w-3.5 h-3.5 mt-0.5 opacity-60" aria-hidden="true"/> 
                        <span className="break-words">{order.customer_address}</span>
                      </div>
                    )}
                  </address>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5"><IconEditPen className="w-3.5 h-3.5" aria-hidden="true"/>Notes</h4>
                    </div>
                    
                    {isEditingNotes ? (
                      <div className="relative animate-in fade-in zoom-in-95 duration-200">
                        <label htmlFor={`notes-${order.id}`} className="sr-only">Edit Notes</label>
                        <textarea
                          id={`notes-${order.id}`}
                          autoFocus
                          value={tempNotes}
                          maxLength={500}
                          onChange={(e) => setTempNotes(e.target.value)}
                          onBlur={handleSaveNotes} 
                          disabled={isSavingNotes}
                          onKeyDown={(e) => { if (e.key === 'Escape') handleCancelNotesEdit(e); }}
                          className={`w-full text-sm-text  !text-amber-700 leading-snug italic bg-amber-50 p-2.5 rounded-xl border border-amber-400 focus:border-amber-50 outline-none resize-none min-h-[80px] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 ${isSavingNotes ? 'opacity-50 cursor-wait' : ''}`}
                          placeholder="Add notes or special instructions..."
                        />
                        {isSavingNotes && (
                          <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1 shadow-sm">
                            <IconLoading className="w-4 h-4 animate-spin text-amber-600" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (!isLocked) setIsEditingNotes(true);
                        }}
                        tabIndex={isLocked ? -1 : 0}
                        onKeyDown={(e) => {
                          if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setIsEditingNotes(true);
                          }
                        }}
                        className={`text-sm-text  !text-amber-700 leading-snug italic bg-amber-50/50 p-2.5 rounded-xl border transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                          ${(!order.special_instructions && !order.notes) ? 'opacity-30 border-dashed border-amber-200 hover:opacity-100 cursor-text' : 'border-amber-100/50 hover:border-amber-300 cursor-text'}`}
                      >
                        {order.special_instructions || order.notes || "No notes provided."}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-2 mt-2 !mb-1 ">
                    {receiptConfig?.showPrintReceipt && (
                      <button
                        onClick={handleManualPrint}
                        disabled={isPrinting} 
                        aria-busy={isPrinting}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-micro  transition-all focus:outline-none focus:ring-0  ${isPrinting ? "bg-slate-50 text-slate-400" : "bg-white border-slate-200 shadow-sm hover:bg-slate-50"}`} 
                      >
                        {isPrinting ? <IconLoading className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <IconReceipt className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
                        <span>{isPrinting ? "Printing..." : "Print"}</span>
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }} 
                        className="flex items-center gap-1.5 px-3 py-2 text-micro  text-red-500 hover:bg-red-50 rounded-xl border border-red-100 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <IconBan className="w-3.5 h-3.5 opacity-60 text-red-500  stroke-red-500" aria-hidden="true" />
                        <p>Cancel</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <PaymentUpdateModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={selectPaymentMethod}
        totalAmount={order.total_amount}
        orderNumber={order.order_number}        
        paymentMethods={activePaymentMethods}   
      />

      <ChangeHandoverModal 
        isOpen={showHandoverModal} 
        onClose={() => setShowHandoverModal(false)} 
        onConfirm={handleConfirmHandoverChange} 
        currentMethod={order.handover_method} 
        currentTotal={order.total_amount} 
        currentFee={order.delivery_fee} 
      />

      <CancelOrderModal 
        isOpen={showCancelModal} 
        onClose={() => setShowCancelModal(false)} 
        onConfirm={handleConfirmCancel} 
        orderNumber={order.order_number} 
      />

      <CompleteOrderModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        orderNumber={order.order_number}
        customerName={order.customer_name}
        isWalkIn={order.is_walk_in} // ✨ FIX: Plumbed down to the modal
        onConfirm={async (sendSms) => {
          await executeStatusUpdate("completed", "Completed", sendSms);
          if (isMounted.current) setShowCompleteModal(false);
        }}
      />
    </>
  );
}