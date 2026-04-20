import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import  { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import { useOrderStore } from '../../store/orders/useOrderStore';
import { useUnclaimedStore } from '../../store/orders/useUnclaimedStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { usePaymentSettingsStore } from '../../store/settings/usePaymentSettingsStore';
import { useActivityStore } from '../../store/activities/useActivityStore'; 
import {
  IconAlertCircle, IconArrowRight, IconClose, IconMapPin, IconPhone, IconEyeOpen, IconEyeClosed
} from '../icons';
import PaymentUpdateModal from '../orders/PaymentUpdateModal'; 

// ==========================================
// UTILITY HELPERS (Pure Functions)
// ==========================================
const getSafeDate = (ts) => {
  if (!ts) return new Date();
  if (typeof ts === 'number') return new Date(ts);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts.toDate === 'function') return ts.toDate();
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const maskPhone = (phone) => typeof phone === 'string' ? phone.replace(/.(?=.{4})/g, '•') : "No contact information";
const maskAddress = (address) => address ? "••••• Hidden for privacy" : "No address provided";

const getCleanPhoneForLink = (phone) => typeof phone === 'string' ? phone.replace(/[^\d+]/g, '') : '';

const formatOverdueTime = (readyDate) => {
  const diffMs = Math.max(0, Date.now() - readyDate.getTime()); 
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h Overdue`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m Overdue`;
  if (diffMins > 0) return `${diffMins}m Overdue`;
  return `${diffSecs}s Overdue`; 
};

// ==========================================
// SWIPE COMPONENT (Memoized for Performance)
// ==========================================
const SwipeToConfirm = memo(({ onConfirm, onOpenPaymentModal, isDisabled, isUpdating }) => {
  const containerRef = useRef(null); 
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 100], [1, 0]);

  if (isDisabled) {
    return (
      <button 
        onClick={onOpenPaymentModal}
        disabled={isUpdating}
        className="relative h-12 w-full rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center justify-center text-base-text  text-app-dark shadow-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
      >
        {isUpdating ? "Processing..." : "Process Payment First"}
      </button>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="relative h-12 w-full rounded-full p-1 transition-all mb-1 border overflow-hidden bg-app-dark shadow-lg border-app-dark"
    >
      <button 
        onClick={onConfirm}
        disabled={isUpdating}
        className="sr-only focus:not-sr-only focus:absolute focus:inset-0 focus:z-50 focus:bg-emerald-600 focus:text-white focus:rounded-full focus:flex focus:items-center focus:justify-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        Press Enter to Claim Order
      </button>

      <motion.div 
        style={{ opacity: textOpacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <span className="text-sm-text font-normal text-white">
          {isUpdating ? "Processing..." : "Slide to Claim"}
        </span>
      </motion.div>

      {!isUpdating ? (
        <motion.div
          drag="x"
          dragConstraints={containerRef} 
          dragElastic={0} 
          dragSnapToOrigin
          onDragEnd={(_, info) => { 
            const containerWidth = containerRef.current?.offsetWidth || 0;
            const threshold = containerWidth * 0.7;
            if (info.offset.x > threshold) {
              if (!isDisabled) onConfirm(); 
            }
          }}
          style={{ x }}
          aria-hidden="true"
          className="relative z-10 h-full aspect-square bg-emerald-500 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-400 transition-colors"
        >
          <IconArrowRight className="w-4 h-4 text-white" />
        </motion.div>
      ) : (
        <div className="h-full aspect-square rounded-full flex items-center justify-center bg-emerald-500" aria-hidden="true">
           <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});
SwipeToConfirm.displayName = 'SwipeToConfirm';

// ==========================================
// MAIN DASHBOARD WIDGET
// ==========================================
const UnclaimedOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const orders = useOrderStore(useCallback((state) => state.orders, []));
  const isLoading = useOrderStore(useCallback((state) => state.isLoading, []));
  const togglePaymentStatus = useOrderStore(useCallback((state) => state.togglePaymentStatus, []));

  const unclaimedOrders = useUnclaimedStore(useCallback((state) => state.unclaimedOrders, []));
  const computeUnclaimed = useUnclaimedStore(useCallback((state) => state.computeUnclaimed, []));
  const markAsClaimed = useUnclaimedStore(useCallback((state) => state.markAsClaimed, []));
  
  const allPaymentMethods = usePaymentSettingsStore(useCallback((state) => state.methods, [])); 
  const logActivity = useActivityStore(useCallback((state) => state.logActivity, [])); 
  const showNotification = useNotificationStore(useCallback((state) => state.showNotification, []));

  const safeUnclaimedOrders = Array.isArray(unclaimedOrders) ? unclaimedOrders : [];

  const activePaymentMethods = useMemo(() => {
    if (!Array.isArray(allPaymentMethods)) return [{ id: 'fallback', name: 'Cash' }];
    const active = allPaymentMethods.filter(m => m?.isActive);
    return active.length > 0 ? active : [{ id: 'fallback', name: 'Cash' }];
  }, [allPaymentMethods]);

  useEffect(() => {
    setIsPiiRevealed(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (orders.length > 0) computeUnclaimed(orders);
  }, [orders, computeUnclaimed]);

  useEffect(() => {
    const ticker = setInterval(() => {
      const currentOrders = useOrderStore.getState().orders;
      if (currentOrders.length > 0) {
        useUnclaimedStore.getState().computeUnclaimed(currentOrders);
      }
    }, 5000); 
    return () => clearInterval(ticker);
  }, []);

  const escGuardRef = useRef({ isUpdating, showPaymentModal });
  useEffect(() => {
    escGuardRef.current = { isUpdating, showPaymentModal };
  }, [isUpdating, showPaymentModal]);

  useEffect(() => {
    if (!selectedOrder || typeof document === 'undefined') return;

    const previousFocus = document.activeElement;

    const handleEsc = (e) => {
      if (e.key === 'Escape' && !escGuardRef.current.isUpdating && !escGuardRef.current.showPaymentModal) {
        setSelectedOrder(null);
      }
    };

    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden'; 

    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEsc);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [selectedOrder]); 

  const handleClaim = useCallback(async (order) => {
    if (!order || !order.is_paid) return; 
    
    setIsUpdating(true);
    try {
      await markAsClaimed(order);
      
      logActivity?.(order, 'claimed', { 
        label: `Claimed overdue order`, 
        action: 'status_update' 
      });

      showNotification("Order successfully claimed", "success");
      setSelectedOrder(null);
    } catch (err) {
      showNotification(err.message || "Failed to claim order", "error");
    } finally {
      setIsUpdating(false);
    }
  }, [markAsClaimed, showNotification, logActivity]);

  const handlePaymentConfirm = useCallback(async (methodName, tenderedAmount) => {
    if (!selectedOrder) return;
    
    try {
      const safeTenderedAmount = Number(tenderedAmount) || Number(selectedOrder.total_amount) || 0;

      await togglePaymentStatus(selectedOrder.id, true, methodName, safeTenderedAmount);
      
      logActivity?.(selectedOrder, 'paid', { 
        label: `Payment collected via ${methodName} (₱${safeTenderedAmount.toLocaleString()})`, 
        action: 'payment_update' 
      });

      setSelectedOrder(prev => prev ? { 
        ...prev, 
        is_paid: true, 
        payment_method: methodName,
        amount_tendered: safeTenderedAmount 
      } : null);

      showNotification(`Payment processed via ${methodName}. You may now claim the order.`, "success");
      setShowPaymentModal(false);
    } catch (err) {
      throw new Error(err.message || "Payment failed"); 
    }
  }, [selectedOrder, togglePaymentStatus, logActivity, showNotification]);

  // ✨ FIXED: Removed the early return that was hiding the widget entirely
  // if (isLoading || safeUnclaimedOrders.length === 0) return null;

  return (
    // ✨ FIXED: Removed mt-4 so it aligns perfectly with the grid in Dashboard.jsx
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 flex flex-col  min-h-[200px] max-h-[350px] overflow-hidden relative">
      
      {/* HEADER */}
      <div className="px-5 py-4 border-b border-app-dark/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 pl-2">
                  <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow" aria-hidden="true">
                    <IconAlertCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-base-text font-bold text-text-dark/90">Unclaimed Laundry</h2>
                </div>
            {safeUnclaimedOrders.length > 0 && (
              <span className="bg-app-dark/5 text-text-dark text-micro  px-2 py-0.5 rounded-full" aria-label={`${safeUnclaimedOrders.length} overdue orders`}>
                {safeUnclaimedOrders.length}
              </span>
            )}
      </div>

      {/* BODY / LIST */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {/* ✨ ADDED: Proper Loading & Empty States */}
        {isLoading ? (
           <div className="h-full flex flex-col items-center justify-center opacity-70 py-10">
             <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-500 rounded-full animate-spin mb-3"></div>
             <p className="text-sm-text text-text-dark/70 font-medium">Loading orders...</p>
           </div>
        ) : safeUnclaimedOrders.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
             <IconAlertCircle className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
             <p className="text-base-text text-text-dark ">No overdue orders</p>
             <p className="text-micro text-text-dark/70 mt-1">All orders are on schedule.</p>
           </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {safeUnclaimedOrders.map((order) => {
                if (!order || !order.id) return null;
                
                const readyDate = getSafeDate(order.completed_at || order.updated_at);
                const overdueLabel = formatOverdueTime(readyDate);

                return (
                  <motion.button
                    layout
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    aria-label={`View order ${order.order_number} for ${order.customer_name}`}
                    className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 group p-3.5 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 transition-all group-hover:bg-rose-400 group-hover:w-1.5" aria-hidden="true" />

                    <div className="flex items-start justify-between mb-1 pl-2">
                      <div className="min-w-0 pr-3 flex items-center gap-1.5">
                        <h3 className="text-sm-text  text-text-dark truncate">
                          {order.customer_name || "Unknown Customer"}
                        </h3>
                        {order.is_walk_in && (
                          <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center">
                        <span className="text-micro  text-rose-500">
                          {overdueLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pl-2 mt-2">
                      <div className="flex flex-col gap-1.5">
                         <div className="flex items-center gap-2 text-micro  text-text-dark/50">
                          <span>#{order.order_number || "---"}</span>
                          <span aria-hidden="true">•</span>
                          <span className="uppercase">{order.handover_method || "pickup"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-sm-text font-bold text-text-dark">
                          ₱{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selected Order Modal (Popup Card) */}
      <AnimatePresence>
        {selectedOrder && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4  bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!isUpdating && !showPaymentModal) setSelectedOrder(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-customer-name"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90dvh] relative flex flex-col shadow-2xl"
            >
              <div className="bg-rose-50/50 pt-4 pb-3 px-3 text-center relative border-b border-rose-100/50">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  disabled={isUpdating}
                  className="absolute top-4 right-4 p-2 disabled:opacity-50 focus:outline-none  rounded-full transition-colors hover:bg-rose-100/50"
                  aria-label="Close modal"
                >
                  <IconClose className="w-5 h-5 text-text-dark/70" />
                </button>

                <div className="text-rose-500 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <IconAlertCircle className="w-8 h-8" />
                </div>
                <h3 id="modal-customer-name" className="text-h3  text-text-dark leading-tight truncate px-8 flex items-center justify-center gap-2">
                  {selectedOrder.customer_name || "Unknown"}
                  {selectedOrder.is_walk_in && (
                    <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
                  )}
                </h3>
                <p className="text-micro  text-rose-500 mt-1">
                  Unclaimed Laundry
                </p>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
                
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
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
                      <IconPhone className="w-4 h-4 text-text-dark/70" aria-hidden="true" />
                      <span className="text-sm-text  text-text-dark/70">Phone</span>
                    </div>
                    <span className="text-sm-text  text-text-dark">
                      {selectedOrder.is_walk_in ? (
                        <span className="italic opacity-70">Anonymous (No Phone)</span>
                      ) : isPiiRevealed ? (
                        selectedOrder.customer_phone || "No contact information"
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
                    <span className="text-sm-text  text-text-dark text-right pl-2 leading-snug">
                      {isPiiRevealed ? (selectedOrder.customer_address || "No address provided") : maskAddress(selectedOrder.customer_address)}
                    </span>
                  </div>

                  <AnimatePresence>
                    {!selectedOrder.is_walk_in && isPiiRevealed && selectedOrder.customer_phone && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2 pt-3 mt-3 border-t border-slate-200/60 overflow-hidden"
                      >
                        <a 
                          href={`tel:${getCleanPhoneForLink(selectedOrder.customer_phone)}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm-text  text-text-dark hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-app-dark/20"
                        >
                          <IconPhone className="w-4 h-4" />
                          Call
                        </a>
                        <a 
                          href={`sms:${getCleanPhoneForLink(selectedOrder.customer_phone)}`}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-100 shadow-sm rounded-xl text-sm-text  text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                          </svg>
                          Text
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                <div className="px-2 space-y-3">
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm-text  text-text-dark/70 ">Order No.</span>
                    <span className="text-sm-text  text-text-dark">#{selectedOrder.order_number || "---"}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm-text  text-text-dark/70 mt-0.5">Completed Since</span>
                    <span className="text-sm-text  text-text-dark text-right max-w-[170px] leading-snug">
                      {getSafeDate(selectedOrder.updated_at || selectedOrder.created_date).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </span>
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
                          className="text-sm-text  text-text-dark bg-slate-50  px-2 py-1 rounded-md border border-slate-200"
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

                <div className={`mt-3 p-4 rounded-xl border transition-colors ${selectedOrder.is_paid ? 'bg-emerald-50/40 border-emerald-200/60' : 'bg-rose-50/40 border-rose-200/60'}`}>
                  
                  {Number(selectedOrder?.delivery_fee) > 0 && (
                    <div className="flex justify-between items-center mb-2 ">
                       <span className="text-micro  text-text-dark/60">Includes Delivery</span>
                        <span className="text-micro  text-blue-600">
                        + ₱{Number(selectedOrder.delivery_fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Row 1: Total Amount */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm  text-text-dark/70">Total Amount</span>
                    <span className="text-h3 font-bold text-text-dark tracking-tight">
                      ₱{Number(selectedOrder.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Row 2: Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm  text-text-dark/70">Payment Status</span>
                    <div className="flex items-center gap-1.5">
                      
                      <span className={`text-micro font-bold uppercase tracking-wider ${selectedOrder.is_paid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedOrder.is_paid ? `PAID (${selectedOrder.payment_method || 'null'})` : "UNPAID"}
                      </span>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {selectedOrder.is_paid && selectedOrder.amount_tendered && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-2">
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm  text-emerald-700/80">Tendered</span>
                            <span className="text-base font-bold text-slate-800">
                              ₱{Number(selectedOrder.amount_tendered).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm  text-emerald-700/80">Change Due</span>
                            <span className="text-sm font-bold text-emerald-600">
                              ₱{Math.max(0, Number(selectedOrder.amount_tendered) - Number(selectedOrder.total_amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2">
                  <SwipeToConfirm 
                    isUpdating={isUpdating}
                    isDisabled={!selectedOrder.is_paid}
                    onConfirm={() => handleClaim(selectedOrder)}
                    onOpenPaymentModal={() => setShowPaymentModal(true)} 
                  />
                  {!selectedOrder.is_paid && (
                    <p className="text-micro  text-rose-500 text-center mt-3" aria-live="polite">
                       Collect payment to unlock claim
                    </p>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PaymentUpdateModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        orderNumber={selectedOrder?.order_number}
        paymentMethods={activePaymentMethods} 
        totalAmount={selectedOrder?.total_amount}
        tenderedAmount={selectedOrder?.amount_tendered} 
      />
    </div>
  );
};

export default UnclaimedOrders;