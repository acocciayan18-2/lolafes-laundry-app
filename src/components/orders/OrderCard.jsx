import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useActivityStore } from "../../store/activities/useActivityStore";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { silentPrint } from "../../services/printerService";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { usePaymentSettingsStore } from "../../store/settings/usePaymentSettingsStore"; 
import PaymentUpdateModal from "./PaymentUpdateModal";
import ChangeHandoverModal from "./ChangeHandoverModal"; 
import CompleteOrderModal from "./CompleteOrderModal";

import "../../style/OrderCard.css";
import {
  IconArrowRight, IconDelivery, IconDoubleCheck,
  IconHandover, IconInfo, IconMapPin, IconPhone,
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp,
  IconStatusProcessing, IconStatusReady, IconLoading, IconReceipt,
  IconEditPen
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

export default function OrderCard({ order, tick }) {
  const [showPaymentPopover, setShowPaymentPopover] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState(order.special_instructions || order.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const dropdownRef = useRef(null);
  const paymentRef = useRef(null);
  const cardRef = useRef(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { methods, fetchPaymentMethods } = usePaymentSettingsStore(); 
  const { receiptConfig, systemConfig } = useSettingsStore();
  const settings = useOrderStore((state) => state.settings);
  const { 
    cancelOrder, updateOrderStatus, togglePaymentStatus, isOrderUnclaimed,
    isOrderStuck, isOrderLocked, parseTimestamp, updateHandoverMethod, updateOrderNotes
  } = useOrderStore();
  const { showNotification } = useNotificationStore();
  const { logActivity } = useActivityStore();

  // 1. LOGGING: Notes Auto-save
  const handleSaveNotes = async (e) => {
    if (e) e.stopPropagation();
    const originalNotes = order.special_instructions || order.notes || "";
    const cleanTempNotes = tempNotes.trim();

    if (cleanTempNotes === originalNotes.trim()) {
      setIsEditingNotes(false);
      return; 
    }

    setIsSavingNotes(true);
    try {
      await updateOrderNotes(order.id, cleanTempNotes);
      // ✨ LOG ACTIVITY
      logActivity(order, order.status, { action: 'notes_update', label: `Updated notes: "${cleanTempNotes.substring(0, 20)}..."` });
      showNotification("Notes auto-saved.", "success");
      setIsEditingNotes(false);
    } catch (error) {
      showNotification("Failed to save notes.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ✨ FIXED: Removed handleTogglePaid entirely since it's no longer used

  // 3. LOGGING: Manual Print
  const handleManualPrint = async (e) => {
    e.stopPropagation();
    setIsPrinting(true);
    try {
      await silentPrint(order, settings.defaultPrinter || 'browser', receiptConfig); 
      
      // ✨ LOG ACTIVITY
      logActivity(order, order.status, { action: 'print', label: "Reprinted Receipt" });
      
      showNotification("Sending to printer...", "success");
    } catch (err) {
      showNotification("Print failed.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  // 4. LOGGING: Handover Method Change
  const handleConfirmHandoverChange = async (newMethod, appliedFee, newTotal) => {
    try {
      await updateHandoverMethod(order.id, newMethod, appliedFee, newTotal);
      
      // ✨ LOG ACTIVITY
      logActivity(order, order.status, { 
        action: 'handover_update', 
        label: `Switched to ${newMethod.toUpperCase()} (Fee: ₱${appliedFee})` 
      });

      setShowHandoverModal(false);
      showNotification(`Handover updated to ${newMethod}.`, "success");
    } catch (err) {
      showNotification("Failed to update handover.", "error");
    }
  };

  // 5. CORRECT HANDLING: Cancel Order & Loyalty Points
  const handleConfirmCancel = async (reason) => {
    try {
      // Just pass the ID and the reason. The database will perfectly reverse the points!
      await cancelOrder(order.id, reason); 

      logActivity(order, "cancelled", { 
        action: 'cancel', 
        label: `Cancelled: ${reason}` 
      });

      showNotification(`Order cancelled. Balance adjusted.`, "success");
      setShowCancelModal(false);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };
  
  // ACTIVITY LOGGER

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const unsubscribe = fetchPaymentMethods();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [fetchPaymentMethods]);

  const isStuck = isOrderStuck(order);
  const isUnclaimed = isOrderUnclaimed(order);
  const isLocked = isOrderLocked(order);
  
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

  

  const handleCancelNotesEdit = (e) => {
    if (e) e.stopPropagation();
    setTempNotes(order.special_instructions || order.notes || "");
    setIsEditingNotes(false);
  };

  const handlePaymentClick = useCallback((e) => {
    e.stopPropagation();
    if (!order.is_paid && !isLocked) {
      setShowPaymentModal(true); 
    }
  }, [order.is_paid, isLocked]);

  

  const selectPaymentMethod = async (methodName) => {
    try {
      await togglePaymentStatus(order.id, true, methodName);
      // Already had logging, kept intact
      logActivity(order, order.status, { action: 'payment_update', label: `Paid via ${methodName}` });
      showNotification(`Order #${order.order_number} settled via ${methodName}`, "success");
      setShowPaymentModal(false); 
    } catch (err) {
      showNotification("Payment update failed.", "error");
    }
  };

  const statusLabels = {
    pending: "Pending", in_progress: "Processing", ready: "Ready",
    completed: "Completed", picked_up: "Picked Up", delivered: "Delivered", cancelled: "Cancelled"
  };

  const cardStyles = useMemo(() => {
    if (isUnclaimed) return "border-red-500 bg-red-50/5 shadow-red-100";
    if (isStuck) return "bg-orange-50/5 shadow-orange-100";
    return "border-gray-200 shadow-sm";
  }, [isStuck, isUnclaimed]);

  const depthStyles = isOpen ? "z-50 shadow-md" : isExpanded ? "z-40 shadow-lg" : "bg-app-light";

  const handleStatusChange = async (e, newStatus) => {
   e.stopPropagation();
    const friendlyStatus = statusLabels[newStatus] || newStatus;
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

    // ✨ NEW LOGIC: Intercept "completed" status
    if (newStatus === "completed") {
      const needsConfirmation = systemConfig?.confirmCompletion ?? true;

      if (needsConfirmation) {
        setIsOpen(false);
        setShowCompleteModal(true);
        return;
      } else {
        // Instant update if setting is disabled
        executeStatusUpdate("completed", "Completed", false); 
        return;
      }
    }

    // Proceed normally for all other statuses
    executeStatusUpdate(newStatus, friendlyStatus);
  };

  const executeStatusUpdate = async (newStatus, friendlyStatus, sendSms = false) => {
    setIsOpen(false);
    try {
      await updateOrderStatus(order, newStatus);
      logActivity(order, newStatus, { action: 'status_update', label: `Moved to ${friendlyStatus}` });
      showNotification(`Status updated to ${friendlyStatus}`, "success");
      
      // Handle SMS if requested (Using the same logic we discussed for UnclaimedOrders)
      if (sendSms && order.customer_phone) {
        import('../../services/smsService').then(service => {
          service.sendStatusSMS(order.customer_phone, order.customer_name, order.order_number, "ready for pickup/delivery");
        });
      }
    } catch (err) {
      showNotification("Could not update status.", "error");
    }
  };

  

  useEffect(() => {
    const handleClick = (e) => {
      if (paymentRef.current && !paymentRef.current.contains(e.target)) setShowPaymentPopover(false);
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen || showPaymentPopover) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, showPaymentPopover]);

  return (
    <>
      <div
       ref={cardRef}
       onClick={() => setIsExpanded(!isExpanded)}
       className={`group relative bg-white border transition-all duration-300 mb-3 cursor-pointer rounded-2xl ${cardStyles} ${depthStyles}`}
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
                {(isStuck || isUnclaimed) && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 z-10">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUnclaimed ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-white ${isUnclaimed ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 
                    title={order.customer_name} 
                    className="font-bold text-text-dark text-sm-text truncate max-w-[200px]"
                  >
                    {order.customer_name}
                  </h3>
                  <span className="text-nano font-bold text-text-dark/40 uppercase px-1.5 py-0.5 rounded">
                   {createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLocked) setShowHandoverModal(true);
                    }} 
                    className={`text-nano font-medium uppercase  px-1 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                      isLocked ? 'cursor-default opacity-80' : 'hover:scale-105 active:scale-95'
                    } ${
                      order.handover_method === 'delivery' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {handoverConfig[order.handover_method]?.icon}
                    {handoverConfig[order.handover_method]?.label}
                  </button>

                </div>
                
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-nano font-bold px-2 py-0.5 rounded border bg-white/50">#{order.order_number}</span>
                  <span className={`text-nano font-bold uppercase px-2 py-0.5 rounded border ${status.theme}`}>{status.label}</span>
                  {handoverDate && (
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                      <IconDoubleCheck className="w-3 h-3 text-green-700" />
                      <span className="text-nano font-bold uppercase">
                        {handoverDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} | {handoverDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION & PRICING ROW */}
            <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="relative flex flex-col items-start lg:items-end gap-1" ref={paymentRef}>
    
   <div className="flex items-center gap-1.5">
  <button 
    onClick={(e) => {
      e.stopPropagation();
      // Only allow click if it is UNPAID and NOT LOCKED
      if (!order.is_paid && !isLocked) {
        handlePaymentClick(e);
      }
    }}
    // ✨ Disable button if locked OR already paid
    disabled={isLocked || order.is_paid} 
    className={`text-nano font-bold px-2 py-0.5 rounded border transition-all ${
      order.is_paid
        // Paid state: Static badge, no hover/active effects
        ? 'text-emerald-600 bg-emerald-50 border-emerald-200 cursor-default' 
        // Unpaid state: Clickable button
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
      {/* DELIVERY FEE */}
      {order.handover_method === 'delivery' && order.delivery_fee > 0 && (
        <span className="text-nano font-bold text-blue-600 tracking-tighter whitespace-nowrap lg:pt-0.5">
          + ₱{order.delivery_fee} DELIVERY
        </span>
      )}

      {/* TOTAL AMOUNT */}
      <p className={`text-h3 font-bold transition-colors leading-none ${isLocked ? 'text-slate-400' : 'text-text-dark'}`}>
        ₱{Number(order.total_amount || 0).toLocaleString()}
      </p>
    </div>

    {/* PAYMENT MODAL */}
    <AnimatePresence>
      {!order.is_paid && showPaymentModal && (
        <PaymentUpdateModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={selectPaymentMethod}
          orderNumber={order.order_number}
          methods={methods}
        />
      )}
    </AnimatePresence>
  </div>

              {/* STATUS ACTIONS */}
              <div className="flex items-center gap-1.5" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
                    disabled={isLocked} 
                    className={`h-8 px-3 text-sm-text font-medium rounded-lg border transition-all ${isLocked ? "bg-slate-100 text-slate-400" : isOpen ? "bg-app-dark/5 " : "bg-white text-text-dark border-app-dark/20"}`}
                  >
                    Update
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        className="absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1 top-full mt-1 overflow-hidden"
                      >
                        {filteredStatusOptions.map((option) => (
                          <button 
                            key={option.value} 
                            onClick={(e) => {
                              if (order.status === option.value) return;
                              handleStatusChange(e, option.value);
                            }} 
                            className={`w-full px-3 py-2 text-left text-sm-text flex items-center justify-between transition-colors ${
                              order.status === option.value 
                                ? "font-bold bg-slate-50 pointer-events-none" 
                                : "font-normal hover:bg-slate-50"
                            }`}
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
                    className="bg-btn-primary hover:bg-btn-primary/90 text-white pl-4 pr-3 py-1.5 rounded-lg shadow-md active:scale-95 flex items-center gap-1.5 transition-all group"
                  >
                    <span className="text-sm-text font-medium">Next</span>
                    <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* EXPANDED CONTENT SECTION */}
            {isExpanded && (
              <div 
                className="px-4 mb-4 overflow-hidden"
              >
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-4">
                  <div className="space-y-2">
                    <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5"><IconShirt className="w-3.5 h-3.5" /> Services</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {order.services?.map((s, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg flex items-center">
                          <span className="text-sm-text font-medium">{s.service_name}</span>
                          <span className="ml-2 text-micro font-bold text-btn-primary">x{s.quantity || s.weight_kg}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5"><IconInfo className="w-3.5 h-3.5" /> Contact Details</h4>
                    <div className="space-y-1.5 text-sm-text font-medium text-text-dark">
                      <div className="flex items-center gap-2"><IconPhone className="w-3.5 h-3.5 opacity-60" /> {order.customer_phone || "No phone"}</div>
                      {order.customer_address && (
                        <div className="flex items-start gap-2">
                          <IconMapPin className="w-3.5 h-3.5 mt-0.5 opacity-60" /> 
                          <span className="break-words">{order.customer_address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        
                        <h4 className="text-micro font-bold text-text-dark/50 uppercase flex items-center gap-1.5"> <IconEditPen className="w-3.5 h-3.5"/>Notes</h4>
                        
                      </div>
                      
                      {isEditingNotes ? (
                        <div className="relative animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            onBlur={handleSaveNotes} 
                            disabled={isSavingNotes}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') handleCancelNotesEdit(e);
                            }}
                            className={`w-full text-sm-text font-medium !text-amber-700 leading-snug italic bg-amber-50 p-2.5 rounded-xl border border-amber-400 focus:border-amber-500 outline-none resize-none min-h-[80px] transition-all shadow-sm ${isSavingNotes ? 'opacity-50' : ''}`}
                            placeholder="Add notes or special instructions..."
                          />
                          
                          {isSavingNotes && (
                            <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1 shadow-sm">
                              <IconLoading className="w-4 h-4 animate-spin text-amber-600" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p 
                          onClick={(e) => e.stopPropagation()} 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!isLocked) setIsEditingNotes(true);
                          }}
                          className={`text-sm-text font-medium !text-amber-700 leading-snug italic bg-amber-50/50 p-2.5 rounded-xl border transition-colors select-none
                            ${(!order.special_instructions && !order.notes) ? 'opacity-30 border-dashed border-amber-200 hover:opacity-100 cursor-text' : 'border-amber-100/50 hover:border-amber-300 cursor-text'}`}
                        >
                          {order.special_instructions || order.notes || "No notes provided"}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-2">
                      {receiptConfig.showPrintReceipt && (
                        <button
                          onClick={handleManualPrint}
                          disabled={isPrinting} 
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-micro font-bold transition-all ${isPrinting ? "bg-slate-50 text-slate-400" : "bg-white border-slate-200 shadow-sm"}`} 
                        >
                          {isPrinting ? <IconLoading className="w-3.5 h-3.5 animate-spin" /> : <IconReceipt className="w-3.5 h-3.5 opacity-60" />}
                          <span>{isPrinting ? "Printing..." : "Print"}</span>
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }} className="flex items-center gap-1.5 px-4 py-2 text-micro font-bold text-red-500 hover:bg-red-50 rounded-xl border border-red-100">Cancel Order</button>
                      )}
                    </div>
                  </div>
                  </div>
              </div>
            )}
          
        </div>
      </div>
      
      {/* MODALS */}
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
        onConfirm={async (sendSms) => {
          await executeStatusUpdate("completed", "Completed", sendSms);
          setShowCompleteModal(false);
        }}
      />
    </>
  );
}