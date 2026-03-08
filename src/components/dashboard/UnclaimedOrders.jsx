import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { useOrderStore } from '../../store/orders/useOrderStore';
import { useUnclaimedStore } from '../../store/orders/useUnclaimedStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import {
  IconAlertCircle,
  IconArrowRight,
 
  IconClose,
  IconHash,
  IconPhone
 
} from '../icons';
import { useRef } from 'react'

const getSafeDate = (ts) => {
  if (!ts) return new Date();
  if (typeof ts === 'number') return new Date(ts);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts.toDate === 'function') return ts.toDate();
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatOverdueTime = (readyDate) => {
  const diffMs = new Date() - readyDate;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h Overdue`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m Overdue`;
  if (diffMins > 0) return `${diffMins}m Overdue`;
  return `${diffSecs}s Overdue`; 
};


const SwipeToConfirm = ({ onConfirm, isDisabled, isUpdating }) => {
  const containerRef = useRef(null); // ✨ This tracks the boundaries
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 100], [1, 0]);

  return (
    <div 
      ref={containerRef} // ✨ Connect the ref here
      className={`relative h-12 w-full rounded-full p-1 transition-all mb-1 border overflow-hidden
        ${isDisabled ? "bg-slate-50 border-slate-100" : "bg-app-dark shadow-lg border-app-dark"}`}
    >
      
      <motion.div 
        style={{ opacity: isDisabled ? 0.3 : textOpacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className={`text-sm-text font-normal ${isDisabled ? "text-slate-400" : "text-white"}`}>
          {isUpdating ? "Processing..." : isDisabled ? "Payment Locked" : "Slide to Claim"}
        </span>
      </motion.div>

      {!isDisabled && !isUpdating && (
        <motion.div
          drag="x"
          
          dragConstraints={containerRef} 
          dragElastic={0} 
          dragSnapToOrigin
          onDragEnd={(_, info) => { 
          
            const containerWidth = containerRef.current?.offsetWidth || 0;
            const threshold = containerWidth * 0.7;
            
            if (info.offset.x > threshold) onConfirm(); 
          }}
          style={{ x }}
          className="relative z-10 h-full aspect-square bg-emerald-500 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-400 transition-colors"
        >
          <IconArrowRight className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {(isDisabled || isUpdating) && (
        <div className={`h-full aspect-square rounded-full flex items-center justify-center ${isUpdating ? "bg-emerald-500" : "bg-slate-200"}`}>
          {isUpdating ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <IconClose className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      )}
    </div>
  );
};

const UnclaimedOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { orders, isLoading } = useOrderStore();
  const { unclaimedOrders, computeUnclaimed, markAsClaimed } = useUnclaimedStore();
  const showNotification = useNotificationStore((state) => state.showNotification);

  // ==========================================
  // PERFORMANCE: Smart Ticker Logic
  // ==========================================
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

  // ==========================================
  // ACCESSIBILITY: Keyboard & Scroll Management
  // ==========================================
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isUpdating) setSelectedOrder(null);
    };
    
    if (selectedOrder) {
      document.body.style.overflow = 'hidden'; 
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedOrder, isUpdating]);

  const handleClaim = useCallback(async (order) => {
    setIsUpdating(true);
    try {
      await markAsClaimed(order);
      showNotification("Order marked as claimed", "success");
      setSelectedOrder(null);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  }, [markAsClaimed, showNotification]);

  if (isLoading || unclaimedOrders.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border flex flex-col max-h-[450px] overflow-hidden relative mt-4">
      
      {/* WIDGET HEADER */}
      <div className="px-5 py-3.5 border-b border-rose-50 flex justify-between items-center ">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border  rounded-lg text-text-dark shadow-hollow">
            <IconAlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base-text font-bold text-text-dark">Overdue Orders</h2>
            <p className="text-micro font-normal text-rose-500">Requires Immediate Action</p>
          </div>
        </div>
        <span className="bg-rose-500 text-white text-nano font-medium px-2 py-0.5 rounded-full">
          {unclaimedOrders.length}
        </span>
      </div>

      {/* LIST SECTION (Redesigned Cards) */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {unclaimedOrders.map((order) => {
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
    className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 group mb-1 p-3.5"
  >
    {/* ✨ Urgency Left Accent Bar */}
    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 transition-all group-hover:w-2" />

    {/* TOP ROW: Name & Overdue Badge */}
    <div className="flex items-start justify-between mb-1 pl-1.5">
      <div className="min-w-0 pr-3">
        <h3 className="text-sm-text font-bold text-text-dark truncate">
          {order.customer_name}
        </h3>
      </div>
      <div className="shrink-0 flex items-center px-1">
        <span className="text-sm-text font-medium text-rose-500 tracking-tighter">
          {overdueLabel}
        </span>
      </div>
    </div>

    {/* BOTTOM ROW: Order Details & Price */}
    <div className="flex items-end justify-between pl-1.5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-micro font-medium px-1.5  text-text-dark/70 ">
            #{order.order_number}
          </span>
          <span className="text-micro font-medium text-text-dark/70 uppercase">
            • {order.handover_method || "pickup"}
          </span>
        </div>
      </div>

      {/* Quick Payment & Amount Preview */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-text-dark">
          ₱{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  </motion.button>
);
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* MODAL POPUP */}
      <AnimatePresence>
        {selectedOrder && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isUpdating && setSelectedOrder(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative flex flex-col"
            >
              {/* HEADER BANNER */}
              <div className="bg-rose-50/50 pt-4 pb-3 px-3 text-center relative border-b border-rose-100/50">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  disabled={isUpdating}
                  className="absolute top-4 right-4 p-2  disabled:opacity-50 "
                  aria-label="Close modal"
                >
                  <IconClose className="w-5 h-5 text-text-dark/70 hover:text-text-dark/70" />
                </button>

                <div className="text-rose-500 flex items-center justify-center mx-auto mb-2 ">
                  <IconAlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-h3 font-bold text-text-dark leading-tight truncate ">
                  {selectedOrder.customer_name}
                </h3>
                <p className="text-micro font-medium text-rose-500">
                  Unclaimed Order
                </p>
              </div>

              {/* CONTENT BODY */}
              <div className="p-5 space-y-2 pt-3">
                
                {/* Block 1: Contact & Address */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <IconPhone className="w-4 h-4 text-text-dark/70" />
                      <span className="text-sm-text font-medium text-text-dark/70 ">Phone</span>
                    </div>
                    <span className="text-sm-text font-medium text-text-dark">{selectedOrder.customer_phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <div className="w-4 flex justify-center"><IconHash className="w-3.5 h-3.5 text-text-dark/70" /></div>
                      <span className="text-sm-text font-medium text-text-dark/70 ">Address</span>
                    </div>
                    <span className="text-sm-text font-medium text-text-dark text-right max-w-[150px] leading-snug">
                      {selectedOrder.customer_address || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Block 2: Order Details & Services */}
                <div className="px-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm-text font-medium text-text-dark/70 ">Order No.</span>
                    <span className="text-sm-text font-medium text-text-dark">#{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm-text font-medium text-text-dark/70  mt-0.5">Completed Since</span>
                    <span className="text-sm-text font-medium text-text-dark text-right max-w-[170px] leading-snug">
                      {getSafeDate(selectedOrder.updated_at || selectedOrder.created_date).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true
                      })}
                    </span>
                  </div>

                  {/* Services List */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm-text font-medium text-text-dark/70  mt-0.5">Services</span>
                      <div className="flex flex-col items-end gap-1">
                        {selectedOrder.services?.length > 0 ? (
                          selectedOrder.services.map((svc, idx) => (
                            <span key={idx} className="text-sm-text font-medium text-text-dark bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              {svc.quantity}x {svc.service_name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm-text font-medium text-text-dark/70">No services</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block 3: Payment Summary Box */}
                <div className={`mt-2 p-4 rounded-2xl border ${selectedOrder.is_paid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm-text font-medium text-slate-500 ">Total Amount</span>
                    <span className="text-h3 font-bold text-text-dark">
                      ₱{Number(selectedOrder.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm-text font-medium text-slate-500 ">Payment Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedOrder.is_paid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                      <span className={`text-[11px] font-medium  tracking-wider ${selectedOrder.is_paid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedOrder.is_paid ? "Paid in Full" : "Unpaid Balance"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Area */}
                <div className="pt-2">
                  <SwipeToConfirm 
                    isUpdating={isUpdating}
                    isDisabled={!selectedOrder.is_paid}
                    onConfirm={() => handleClaim(selectedOrder)}
                  />
                  {!selectedOrder.is_paid && (
                    <p className="text-sm-text text-rose-500 font-medium text-center mt-3  tracking-wider">
                      ⚠️ Collect payment before claiming
                    </p>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnclaimedOrders;