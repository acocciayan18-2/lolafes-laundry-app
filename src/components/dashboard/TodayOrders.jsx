import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useTodayOrdersStore } from "../../store/orders/useTodayOrdersStore";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import { useActivityStore } from "../../store/activities/useActivityStore";
import {
  IconClose, IconShirt, IconStatusCompleted, IconStatusPending,
  IconStatusPickedUp, IconStatusProcessing, IconStatusReady,
  IconPhone, IconEyeOpen, IconEyeClosed, IconMapPin, IconHandover, IconDelivery 
} from '../icons';
import CompleteOrderModal from "../orders/CompleteOrderModal";

// ==========================================
// CONFIGURATION & CONSTANTS (Frozen)
// ==========================================
const statusConfig = Object.freeze({
  pending: { label: "Pending", banner: "bg-status-pending", theme: "text-status-pending bg-status-pending/10 border-status-pending/70", icon: IconStatusPending },
  in_progress: { label: "Processing", banner: "bg-status-process", theme: "text-status-process bg-status-process/10 border-status-process/70", icon: IconStatusProcessing },
  ready: { label: "Ready", banner: "bg-status-ready", theme: "text-status-ready bg-status-ready/10 border-status-ready/20", icon: IconStatusReady },
  completed: { label: "Completed", banner: "bg-status-complete", theme: "text-status-complete bg-status-complete/10 border-status-complete/70", icon: IconStatusCompleted },
  picked_up: { label: "Picked Up", banner: "bg-status-picked", theme: "text-status-picked bg-status-picked/10 border-status-picked/70", icon: IconStatusPickedUp },
  delivered: { label: "Delivered", banner: "bg-emerald-500", theme: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: IconStatusPickedUp }
});

// ==========================================
// DATA GUARDS & SANITIZATION
// ==========================================

const getSafeDate = (ts) => {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return "No contact information";
  return phone.replace(/.(?=.{4})/g, '•');
};

const maskAddress = (address) => {
  if (!address || typeof address !== 'string') return "No address provided";
  return "••••• Hidden for privacy";
};

const safeMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component OrderCard
 * @description Memoized list item (Clean, unexpanded view)
 */
const OrderCard = React.memo(({ order, isLocked, unclaimed, stuck, onClick }) => {
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const isDelivered = order.status === 'picked_up' && order.handover_method === 'delivery';

  return (
    <motion.button 
      layout
      onClick={onClick}
      disabled={isLocked}
      aria-label={`Order ${order.order_number} for ${order.customer_name}. Status: ${isDelivered ? 'Delivered' : cfg.label}`}
      className={`w-full text-left relative overflow-hidden rounded-xl bg-white border transition-all p-3.5 mb-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/40
        ${isLocked ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : 'hover:border-app-dark/20 hover:shadow-md active:scale-[0.98]'}
        ${unclaimed ? 'border-rose-200' : 'border-slate-100'}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.banner} transition-all group-hover:w-2`} aria-hidden="true" />

      <div className="flex justify-between items-start mb-1 pl-1.5">
        <div className="min-w-0 pr-3 flex items-center gap-1.5">
           <h3 className="text-sm-text font-bold text-text-dark truncate" title={order.customer_name}>
            {order.customer_name || "Unknown Customer"}
          </h3>
          {/* ✨ FIX: Show Walk-In pill in the list view */}
          {order.is_walk_in && (
            <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
          )}
        </div>
        <span className={`text-nano font-bold px-2 py-0.5 rounded-[4px] border uppercase shrink-0 ${cfg.theme}`}>
          {isDelivered ? "Delivered" : cfg.label}
        </span>
      </div>

      <div className="flex items-end justify-between pl-1.5 ">
        <div className="flex items-center gap-2 text-micro  text-text-dark/70">
          <span>#{order.order_number || "---"}</span>
          <span aria-hidden="true">•</span>
          <span className="uppercase">{order.handover_method || "pickup"}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!order.is_paid && (
            <span className="text-nano text-rose-500 uppercase tracking-tighter rounded px-1" aria-label="Order is unpaid">
              Unpaid
            </span>
          )}

          {(stuck || unclaimed) && (
            <span 
              className={`flex h-2 w-2 rounded-full animate-pulse ${unclaimed ? 'bg-rose-500' : 'bg-orange-500'}`} 
              aria-label={unclaimed ? "Urgent: Unclaimed" : "Warning: Order Stuck"}
            />
          )}

          <span className="text-sm-text font-bold text-text-dark" aria-label={`Total amount: ₱${Number(order.total_amount || 0).toFixed(2)}`}>
            ₱{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </motion.button>
  );
});
OrderCard.displayName = "OrderCard";


// ==========================================
// MAIN COMPONENT
// ==========================================

export default function TodayOrders({ orders = [], isLoading }) {
  // --- GLOBAL STATE ---
  const { selectedOrder, setSelectedOrder, isUpdating, executeStatusUpdate, validate } = useTodayOrdersStore();
  const { isOrderStuck, isOrderUnclaimed, isOrderLocked } = useOrderStore(); 
  const { systemConfig } = useSettingsStore();
  const logActivity = useActivityStore((state) => state.logActivity); 

  // --- LOCAL STATE ---
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);

  // --- REFS ---
  const modalRef = useRef(null);
  const isMounted = useRef(false);

  // --- LIFECYCLE & EFFECTS ---

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    setIsPiiRevealed(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (!selectedOrder) return;

    const handleEsc = (e) => { 
      if (e.key === 'Escape' && !isUpdating && !showCompleteModal) {
        setSelectedOrder(null);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);
    
    modalRef.current?.focus();
    
    return () => {
      document.body.style.overflow = originalOverflow; 
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedOrder, isUpdating, showCompleteModal, setSelectedOrder]);

  // --- DATA AGGREGATION (MEMOIZED) ---

  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return [...orders].sort((a, b) => {
      const aTerminal = ['picked_up', 'delivered'].includes(a?.status) ? 1 : 0;
      const bTerminal = ['picked_up', 'delivered'].includes(b?.status) ? 1 : 0;
      return aTerminal - bTerminal;
    });
  }, [orders]);

  const financialMetrics = useMemo(() => {
    if (!selectedOrder) return null;
    
    const deliveryFee = safeMoney(selectedOrder.delivery_fee);
    const totalAmount = safeMoney(selectedOrder.total_amount);
    const hasDeliveryFee = selectedOrder.handover_method === 'delivery' && deliveryFee > 0;
    
    const isCashPayment = Boolean(selectedOrder.payment_method && String(selectedOrder.payment_method).toLowerCase().includes('cash'));
    const tenderedAmount = safeMoney(selectedOrder.amount_tendered || totalAmount);
    const changeDue = safeMoney(selectedOrder.change_due || 0);
    const showCashDetails = selectedOrder.is_paid && isCashPayment;

    return { totalAmount, deliveryFee, hasDeliveryFee, isCashPayment, tenderedAmount, changeDue, showCashDetails };
  }, [selectedOrder]);


  // --- HANDLERS (MEMOIZED) ---

  const executeStatusUpdateCall = useCallback(async (newStatus, sendSms = false) => {
    if (!selectedOrder || isUpdating) return;
    
    const { customer_phone, customer_name, order_number, is_walk_in } = selectedOrder;
    setPendingStatus(newStatus);
    
    try {
      const success = await executeStatusUpdate(newStatus);
      
      if (success) {
        if (typeof logActivity === 'function') {
          logActivity(selectedOrder, newStatus, { label: `Status updated to ${newStatus}`, action: 'status_update' });
        }

        // ✨ FIX: Double-check that it is NOT a walk-in before opening the SMS gateway
        if (sendSms && !is_walk_in && customer_phone) {
          import('../../services/smsService')
            .then(s => s.sendStatusSMS(customer_phone, customer_name, order_number, "ready"))
            .catch(err => console.error("[SMS Service] Failure:", err)); 
        }
        
        if (isMounted.current) {
          setShowCompleteModal(false);
          setSelectedOrder(null);
        }
      }
    } catch (error) {
      console.error("[TodayOrders] Status Update Failed:", error);
    } finally { 
      if (isMounted.current) setPendingStatus(null); 
    }
  }, [selectedOrder, isUpdating, executeStatusUpdate, logActivity, setSelectedOrder]);

  const handleUpdate = useCallback(async (newStatus) => {
    if (newStatus === "completed") {
      if (systemConfig?.confirmCompletion ?? true) {
        setShowCompleteModal(true);
        return;
      }
    }
    await executeStatusUpdateCall(newStatus, false);
  }, [systemConfig?.confirmCompletion, executeStatusUpdateCall]);

  const handleCloseModal = useCallback(() => {
    if (!isUpdating) setSelectedOrder(null);
  }, [isUpdating, setSelectedOrder]);


  // --- RENDER ---
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden relative" aria-label="Today's Orders">
      
      <header className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow" aria-hidden="true">
            <IconShirt className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
        </div>
        {orders?.length > 0 && (
          <span 
            className="bg-app-dark/5 text-text-dark text-micro  px-2 py-0.5 rounded-full" 
            aria-label={`${orders.length} orders total`}
          >
            {orders.length}
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar mb-4" role="list">
        {isLoading ? (
           <div className="py-10 text-center text-sm-text text-gray-400 italic" aria-live="polite">Loading orders...</div>
        ) : sortedOrders.length > 0 ? (
          <div className="space-y-1">
            {sortedOrders.map((order) => {
              if (!order || !order.id) return null; 
              return (
                <OrderCard 
                  key={order.id}
                  order={order}
                  isLocked={isOrderLocked(order)}
                  unclaimed={isOrderUnclaimed(order)}
                  stuck={isOrderStuck(order)}
                  onClick={() => !isOrderLocked(order) && setSelectedOrder(order)}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-10 opacity-30" role="status">
            <IconShirt className="w-8 h-8 mb-2" aria-hidden="true" />
            <p className="text-sm-text ">No Orders Today</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && !showCompleteModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm" 
            onClick={handleCloseModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-order-title"
          >
            <motion.div 
              ref={modalRef}
              tabIndex={-1}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh] focus:outline-none" 
            >
              
              <header className="bg-slate-50/80 pt-5 pb-3 px-4 text-center relative border-b border-slate-100 shrink-0">
                <button 
                  onClick={handleCloseModal} 
                  disabled={isUpdating} 
                  className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-lg"
                  aria-label="Close Order Details"
                >
                  <IconClose className="w-5 h-5 text-text-dark" aria-hidden="true"/>
                </button>
                <div className="w-10 h-10 flex items-center justify-center mx-auto mb-1">
                   <IconShirt className="w-6 h-6 text-app-dark" aria-hidden="true"/>
                </div>
                {/* ✨ FIX: Show Walk-In pill in the Expanded Modal header */}
                <h3 id="modal-order-title" className="text-h3 font-bold text-text-dark leading-tight truncate px-6 flex items-center justify-center gap-2" title={selectedOrder.customer_name}>
                  {selectedOrder.customer_name || "Unknown Customer"}
                  {selectedOrder.is_walk_in && (
                    <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
                  )}
                </h3>
                
                <div className="flex flex-wrap items-center justify-center  mt-1 text-micro  capitalize text-text-dark/70">
                  <time dateTime={getSafeDate(selectedOrder.created_at || selectedOrder.created_date).toISOString()}>
                    {getSafeDate(selectedOrder.created_at || selectedOrder.created_date).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </time>
                </div>
              </header>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
                
                {/* PII Protection Box */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
                  {/* Disable eye toggle completely if it's a walk-in, as there's nothing to reveal */}
                  {!selectedOrder.is_walk_in && (
                    <button 
                      onClick={() => setIsPiiRevealed(!isPiiRevealed)}
                      className="absolute top-2 right-2 p-1.5 text-text-dark/40 hover:text-app-dark transition-colors focus:outline-none rounded-lg hover:bg-slate-200"
                      aria-label={isPiiRevealed ? "Hide Customer Information" : "Reveal Customer Information"}
                      aria-pressed={isPiiRevealed}
                    >
                      {isPiiRevealed ? <IconEyeClosed className="w-4 h-4" aria-hidden="true"/> : <IconEyeOpen className="w-4 h-4" aria-hidden="true"/>}
                    </button>
                  )}

                  <div className="flex justify-between items-center pr-8">
                    <div className="flex items-center gap-2.5">
                      <IconPhone className="w-4 h-4 text-text-dark/70" aria-hidden="true"/>
                      <span className="text-sm-text  text-text-dark/70">Phone</span>
                    </div>
                    {/* ✨ FIX: Show 'Anonymous (No Phone)' if Walk-In, otherwise respect masking */}
                    <span className="text-sm-text  text-text-dark" aria-live="polite">
                      {selectedOrder.is_walk_in ? (
                        <span className="italic opacity-70">Anonymous (No Phone)</span>
                      ) : isPiiRevealed ? (
                        selectedOrder.customer_phone || "N/A"
                      ) : (
                        maskPhone(selectedOrder.customer_phone)
                      )}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start pr-8">
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <div className="w-4 flex justify-center"><IconMapPin className="w-3.5 h-3.5 text-text-dark/70" aria-hidden="true" /></div>
                      <span className="text-sm-text  text-text-dark/70">Address</span>
                    </div>
                    <span className="text-sm-text  text-text-dark text-right pl-2 leading-snug" aria-live="polite">
                      {isPiiRevealed ? (selectedOrder.customer_address || "No address provided") : maskAddress(selectedOrder.customer_address)}
                    </span>
                  </div>
                </div>

                {/* Logistics Summary */}
                <div className="px-2 space-y-2.5">
                   <div className="flex justify-between items-center mt-2">
                    <span className="text-sm-text  text-text-dark/70 ">Order No.</span>
                    <span className="text-sm-text  text-text-dark">#{selectedOrder.order_number || "---"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm-text  text-text-dark/70">
                    <div className="flex items-center gap-2">
                      {selectedOrder.handover_method === 'delivery' ? <IconDelivery className="w-4 h-4" aria-hidden="true"/> : <IconHandover className="w-4 h-4" aria-hidden="true"/>}
                      <span>Handover</span>
                    </div>
                    <span className="text-text-dark capitalize">{selectedOrder.handover_method || "pickup"}</span>
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm-text  text-text-dark/70 mt-0.5 whitespace-nowrap">
                      Services
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5" role="list">
                      {Array.isArray(selectedOrder.services) && selectedOrder.services.length > 0 ? (
                        selectedOrder.services.map((svc, idx) => (
                          <span 
                            key={idx} 
                            role="listitem" 
                            className="text-sm-text  text-text-dark bg-slate-50 px-2 py-1 rounded-md border border-slate-200"
                          >
                            {svc.quantity || 1}x {svc.service_name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm-text  text-text-dark/70 italic">
                          No services listed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FINANCIAL SUMMARY */}
                {financialMetrics && (
                  <div className={`p-4 rounded-2xl border transition-colors ${selectedOrder.is_paid ? 'bg-emerald-50/40 border-emerald-200/50' : 'bg-rose-50/50 border-rose-100'}`} aria-label="Financial Breakdown">
                    
                    {financialMetrics.hasDeliveryFee && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-micro  text-text-dark/60">Includes Delivery</span>
                        <span className="text-micro font-bold text-blue-600">
                          + ₱{financialMetrics.deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm-text  text-text-dark/70">Total Amount</span>
                      <span className="text-h3 font-bold text-text-dark tracking-tight">
                        ₱{financialMetrics.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm-text  text-text-dark/70">Payment Status</span>
                      <div className="flex items-center gap-1.5">
                         <span className={`text-micro font-bold uppercase tracking-wider ${selectedOrder.is_paid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {selectedOrder.is_paid ? `Paid ${selectedOrder.payment_method ? `(${selectedOrder.payment_method})` : ''}` : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    {financialMetrics.showCashDetails && (
                      <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm-text  text-emerald-800/70">Tendered</span>
                          <span className="text-sm-text font-bold text-text-dark">
                            ₱{financialMetrics.tenderedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm-text  text-emerald-800/70">Change Due</span>
                          <span className="text-sm-text font-bold text-emerald-600">
                            ₱{financialMetrics.changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="h-px bg-slate-100 my-4" aria-hidden="true" />

                {/* Update Actions */}
                <fieldset className="space-y-2 m-0 p-0 border-none">
                  <legend className="text-micro text-text-dark/40 mb-2 px-1 w-full text-left">Update Status</legend>
                  {Object.entries(statusConfig).filter(([k]) => k !== 'pending' && k !== 'delivered').map(([key, cfg]) => {
                    const isCurrent = selectedOrder.status === key;
                    const { allowed } = validate(selectedOrder, key);
                    const isThisButtonLoading = pendingStatus === key;
                    
                    return (
                      <button
                        key={key}
                        disabled={isUpdating || isCurrent || !allowed}
                        onClick={() => handleUpdate(key)}
                        aria-busy={isThisButtonLoading}
                        aria-pressed={isCurrent}
                        className={`relative w-full flex items-center gap-4 p-2 rounded-2xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark/60
                          ${isCurrent ? `${cfg.banner} text-white border-transparent shadow-md translate-x-1` 
                                      : `bg-white border-slate-200 text-text-dark hover:bg-slate-50`}
                          ${(!allowed && !isCurrent) ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                        `}
                      >
                        <div className={`p-1.5 rounded-xl ${isCurrent ? 'bg-white/20' : 'bg-slate-100'}`}>
                          <cfg.icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-text-dark/70'}`} aria-hidden="true" />
                        </div>
                        <span className="text-sm-text  uppercase flex-1 text-left tracking-wide">
                          {isThisButtonLoading ? "Updating..." : (key === 'picked_up' && selectedOrder.handover_method === 'delivery' ? "Delivered" : cfg.label)}
                        </span>
                        {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse pr-2" aria-hidden="true"/>}
                      </button>
                    );
                  })}
                </fieldset>
                
                {!selectedOrder.is_paid && (
                  <p className="text-micro text-rose-500 font-bold text-center mt-3 uppercase tracking-wide" role="alert">
                    Payment Required for Handover
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CompleteOrderModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        orderNumber={selectedOrder?.order_number}
        customerName={selectedOrder?.customer_name}
        isWalkIn={selectedOrder?.is_walk_in} // ✨ FIX: Connected the Walk-In Prop!
        onConfirm={async (sendSms) => await executeStatusUpdateCall("completed", sendSms)}
      />
    </section>
  );
}