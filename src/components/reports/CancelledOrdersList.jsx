import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconBan, IconInfo, IconPhone, 
  IconMapPin, IconClose,
  IconHandover, IconEyeOpen, IconEyeClosed,
  IconDelivery
} from "../icons";


const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return "No contact information";
  return phone.replace(/.(?=.{4})/g, '•');
};

const maskAddress = (address) => {
  if (!address || typeof address !== 'string') return "No address provided";
  return "••••• Hidden for privacy";
};

const formatFullAuditDate = (ts) => {
  if (!ts) return null;
  try {
    const dateObj = (ts.seconds) ? new Date(ts.seconds * 1000) 
                  : (typeof ts.toDate === 'function') ? ts.toDate() 
                  : new Date(ts); 

    if (isNaN(dateObj.getTime())) return null;

    return `${dateObj.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    })} at ${dateObj.toLocaleTimeString([], { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    })}`;
  } catch (e) {
    return null;
  }
};

const safeMoney = (val) => {
  const num = Number(val);
  return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
};

// ==========================================
// ATOMIC COMPONENTS
// ==========================================

/**
 * @component CancelledOrderDetailModal
 * @description Renders a detailed audit trail of a cancelled order using React Portals.
 */
const CancelledOrderDetailModal = ({ order, isOpen, onClose }) => {
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);
  const [portalNode, setPortalNode] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setPortalNode(document.body);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setIsPiiRevealed(false);

    const handleEsc = (e) => { 
      if (e.key === 'Escape' && typeof onClose === 'function') onClose(); 
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);
    
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!order || !portalNode) return null;

  const createdDateTime = formatFullAuditDate(order.created_at || order.created_date);
  const cancelledDateTime = formatFullAuditDate(order.cancelled_at || order.cancelled_at_date);
  const safeServices = Array.isArray(order.services) ? order.services : [];

  // --- Financial Metrics ---
  const totalAmount = safeMoney(order.total_amount);
  const deliveryFee = safeMoney(order.delivery_fee);
  const hasDeliveryFee = order.handover_method === 'delivery' && deliveryFee > 0;
  
  const isCashPayment = Boolean(order.payment_method && String(order.payment_method).toLowerCase().includes('cash'));
  const tenderedAmount = safeMoney(order.amount_tendered || totalAmount);
  const changeDue = safeMoney(order.change_due || 0);
  const showCashDetails = order.is_paid && isCashPayment;

  return createPortal(
   <AnimatePresence mode="wait">
     {isOpen && (
      <div 
        className="fixed inset-0 z-[100] flex items-center  justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancelled-modal-title"
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
          <header className="bg-rose-50/50 pt-5 pb-3 px-4 text-center relative border-b border-rose-100/50 shrink-0">
            <button 
              onClick={onClose} 
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-lg"
            >
              <IconClose className="w-5 h-5 text-text-dark" aria-hidden="true" />
            </button>
            <div className="w-10 h-10 flex items-center justify-center mx-auto mb-1" aria-hidden="true">
               <IconBan className="w-6 h-6 text-rose-500" />
            </div>
            
            <h3 id="cancelled-modal-title" className="text-h3 font-bold text-text-dark leading-tight truncate px-6 flex items-center justify-center gap-2" title={order.customer_name}>
              {order.customer_name || "null"}
              {/* ✨ FIX: Visual Walk-In Indicator for the audit trail */}
              {order.is_walk_in && (
                <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
              )}
            </h3>
            
            <div className="flex flex-wrap items-center justify-center mt-1 text-micro">
              <span className="text-rose-500  capitalize">Cancelled Order</span>
            </div>
          </header>

          <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-3">
            
            {/* PII Protection Box */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
              {/* ✨ FIX: Hide PII toggle if it's a Walk-In (no data to reveal) */}
              {!order.is_walk_in && (
                <button 
                  onClick={() => setIsPiiRevealed(!isPiiRevealed)}
                  aria-pressed={isPiiRevealed}
                  aria-label={isPiiRevealed ? "Hide Customer Info" : "Reveal Customer Info"}
                  className="absolute top-2 right-2 p-1.5 text-text-dark/40 hover:text-app-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-dark rounded-lg hover:bg-slate-200"
                >
                  {isPiiRevealed ? <IconEyeClosed className="w-4 h-4" aria-hidden="true" /> : <IconEyeOpen className="w-4 h-4" aria-hidden="true" />}
                </button>
              )}

              <div className="flex justify-between items-center pr-8">
                <div className="flex items-center gap-2.5">
                  <IconPhone className="w-4 h-4 text-text-dark/70" aria-hidden="true" />
                  <span className="text-sm-text  text-text-dark/70">Phone</span>
                </div>
                <span className="text-sm-text  text-text-dark" aria-live="polite">
                  {/* ✨ FIX: Graceful Anonymous fallback */}
                  {order.is_walk_in ? (
                    <span className="italic opacity-70">Anonymous (No Phone)</span>
                  ) : isPiiRevealed ? (
                    order.customer_phone || "No contact information"
                  ) : (
                    maskPhone(order.customer_phone)
                  )}
                </span>
              </div>
              
              <div className="flex justify-between items-start pr-8">
                <div className="flex items-center gap-2.5 mt-0.5">
                  <div className="w-4 flex justify-center" aria-hidden="true"><IconMapPin className="w-3.5 h-3.5 text-text-dark/70" /></div>
                  <span className="text-sm-text  text-text-dark/70">Address</span>
                </div>
                <span className="text-sm-text  text-text-dark text-right pl-2 leading-snug" aria-live="polite">
                  {isPiiRevealed ? (order.customer_address || "N0 address provided") : maskAddress(order.customer_address)}
                </span>
              </div>
            </div>

            {/* Logistics Summary */}
            <div className="px-2 space-y-2.5">
               <div className="flex justify-between items-center mt-2">
                    <span className="text-sm-text  text-text-dark/70 ">Order No.</span>
                    <span className="text-sm-text  text-text-dark">#{order.order_number || "---"}</span>
                  </div>
                <div className="flex justify-between items-center text-sm-text  text-text-dark/70">
                                    <div className="flex items-center gap-2">
                                      {order.handover_method === 'delivery' ? <IconDelivery className="w-4 h-4" aria-hidden="true"/> : <IconHandover className="w-4 h-4" aria-hidden="true"/>}
                                      <span>Handover</span>
                                    </div>
                                    <span className="text-text-dark capitalize">{order.handover_method || "null"}</span>
                                  </div>
                
              

              <div className="flex justify-between items-start gap-4">
                <span className="text-sm-text  text-text-dark/70 mt-0.5 whitespace-nowrap">
                  Services
                </span>
                
                <div className="flex flex-wrap justify-end gap-1.5" role="list">
                  {safeServices.length > 0 ? (
                    safeServices.map((svc, idx) => (
                      <span 
                        key={idx} 
                        role="listitem" 
                        className="text-sm-text  text-text-dark bg-slate-50 px-2 py-1 rounded-md border border-slate-200"
                      >
                        {svc.quantity || 1}x {svc.service_name || "Unknown"}
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

            <div className="p-4 rounded-2xl border bg-rose-50/40 border-rose-200/60">

            {hasDeliveryFee && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-micro  text-rose-600/60">Includes Delivery</span>
                  <span className="text-micro font-bold text-blue-600">
                    + ₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm-text  text-rose-600/70">Total Loss</span>
                <span className="text-h3 font-bold text-rose-700 tracking-tight">
                  ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              

              <div className="flex justify-between items-center">
                <span className="text-sm-text  text-rose-600/70">Payment Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-micro font-bold tracking-wider text-rose-600 uppercase">
                    {order.is_paid ? `Paid ${order.payment_method ? `(${order.payment_method})` : ''}` : "Unpaid"}
                  </span>
                </div>
              </div>

              {/* Cash Details Block */}
              {showCashDetails && (
                <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm-text  text-rose-800/70">Tendered</span>
                    <span className="text-sm-text font-bold text-text-dark">
                      ₱{tenderedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm-text  text-rose-800/70">Change Due</span>
                    <span className="text-sm-text font-bold text-rose-600">
                      ₱{changeDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cancellation Meta */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="text-micro font-bold text-text-dark/40 mb-1">Cancellation Reason</h4>
                <p className="text-sm-text  text-rose-600 italic">"{order.cancellation_reason || "No reason recorded"}"</p>
              </div>
              
              <div className="grid grid-cols-1 gap-1.5 text-micro  tracking-tight text-text-dark/60">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="text-text-dark font-bold">{createdDateTime || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cancelled:</span>
                  <span className="text-rose-600 font-bold">{cancelledDateTime || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-micro text-amber-800 italic">
                <span className="font-bold text-micro uppercase block mb-1 not-italic tracking-tighter opacity-70">Order Notes</span>
                {order.notes}
              </div>
            )}
          </div>

          <footer className="p-4 border-t border-slate-100 bg-white">
            <button 
              onClick={onClose} 
              className="w-full py-3 bg-app-dark text-white  text-sm-text  rounded-xl hover:opacity-90 transition-opacity active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-dark"
            >
              Close Archive
            </button>
          </footer>
        </motion.div>
      </div>
     )}
   </AnimatePresence>,
   portalNode
  );
};

/**
 * @component CancelledOrderCard
 * @description Memoized list item for cancelled orders to prevent layout thrashing.
 */
const CancelledOrderCard = React.memo(({ order, onOpenDetail }) => {
  const timeString = useMemo(() => {
    if (!order) return "--:--"; 
    try {
      const d = order.cancelled_at_date instanceof Date 
        ? order.cancelled_at_date 
        : new Date(order.cancelled_at || order.cancelled_at_date);
        
      if (isNaN(d.getTime())) return "--:--";
      
      const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      return `${datePart}, ${timePart}`;
    } catch {
      return "--:--";
    }
  }, [order]);

  const handleOpen = useCallback(() => {
    if (typeof onOpenDetail === 'function') onOpenDetail(order);
  }, [order, onOpenDetail]);

  if (!order) return null;

  const totalAmount = safeMoney(order.total_amount);

  return (
    <motion.button
      layout
      onClick={handleOpen}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      aria-label={`View details for cancelled order ${order.order_number}`}
      className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 group mb-1 p-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 transition-all group-hover:w-2" aria-hidden="true" />

      <div className="flex items-start justify-between mb-1 pl-1.5">
        <div className="min-w-0 pr-3 flex items-center gap-1.5">
          <h3 className="text-sm-text font-bold text-text-dark truncate" title={order.customer_name}>
            {order.customer_name || "Unknown Customer"}
          </h3>
          {/* ✨ FIX: Visual Walk-In Indicator for the list card */}
          {order.is_walk_in && (
            <span className="text-nano text-text-dark/90 bg-gray-100 px-1.5 py-0.5 rounded leading-none align-middle">Walk-In</span>
          )}
        </div>
        <div className="shrink-0 flex items-center px-1">
          <span className="text-nano  text-rose-600 uppercase py-0.5">
            {timeString}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between pl-1.5 ">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-micro  text-text-dark/70">
            <span>#{order.order_number || "---"}</span>
            <span aria-hidden="true">•</span>
            <span className="uppercase">{order.handover_method || "pickup"}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end shrink-0 ml-2">
          <span className="text-sm-text font-bold text-rose-600" aria-label={`Lost revenue: ₱${totalAmount.toFixed(2)}`}>
            - ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </motion.button>
  );
});
CancelledOrderCard.displayName = "CancelledOrderCard";


// ==========================================
// MAIN COMPONENT
// ==========================================

export const CancelledOrdersList = ({ cancelledOrders, totalLost }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const infoRef = useRef(null);

  useEffect(() => {
    if (!showInfo) return;

    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };
    
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [showInfo]);

  const handleCloseModal = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const safeCancelledOrders = Array.isArray(cancelledOrders) ? cancelledOrders : [];

  return (
    <>
      <section className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col" aria-label="Cancelled Orders Archive">
        <div className="p-5 flex-1 flex flex-col">
          <header className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm-text font-bold text-text-dark/70 uppercase tracking-tight">
                  Cancelled Orders
                </h2>
                
                <div className="relative" ref={infoRef}>
                  <button 
                    onClick={() => setShowInfo(!showInfo)} 
                    aria-expanded={showInfo}
                    aria-label="What is this archive for?"
                    className={`transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-app-dark/50 rounded-full ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                  >
                    <IconInfo className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <AnimatePresence>
                    {showInfo && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        role="tooltip"
                        className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/10 shadow-xl rounded-xl z-[50]"
                      > 
                        <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                          Use this archive to analyze Revenue Leakage from cancelled orders. Click any record for a detailed Audit Trail.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-1 mb-3">
                <div className="inline-flex flex-col py-1.5 rounded-lg">
                  <p className="text-sm-text  text-rose-600 leading-none mb-1.5 ">
                    Total Sales Lost
                  </p>
                  <p className="text-base-text font-bold text-rose-700 leading-none">
                    ₱{Number(totalLost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0" aria-hidden="true">
              <IconBan className="w-5 h-5 text-text-dark" />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar pr-1" role="list">
            {safeCancelledOrders.length === 0 ? (
              <div className="py-10 text-center opacity-30 italic text-micro uppercase font-bold tracking-widest" role="status">
                No archives found
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {safeCancelledOrders.map((order) => {
                    if (!order || !order.id) return null; 
                    return (
                      <CancelledOrderCard 
                        key={order.id} 
                        order={order} 
                        onOpenDetail={setSelectedOrder} 
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          <footer className="mt-2 border-t border-slate-50 pt-2 flex justify-between items-center text-nano font-bold text-text-dark/40 uppercase">
            <span>Audit Trail Logs</span>
            {safeCancelledOrders.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden="true" />}
          </footer>
        </div>
      </section>

      <CancelledOrderDetailModal 
        isOpen={!!selectedOrder} 
        order={selectedOrder} 
        onClose={handleCloseModal} 
      />
    </>
  );
};