import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconBan, IconInfo, IconPhone, 
  IconMapPin, IconClose,
  IconHandover, IconEyeOpen, IconEyeClosed,
  IconDelivery
} from "../icons";

const maskPhone = (phone) => phone ? phone.replace(/.(?=.{4})/g, '•') : "N/A";
const maskAddress = (address) => address ? "••••• Hidden for privacy" : "N/A";

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

// ==========================================
// 1. DETAIL MODAL COMPONENT
// ==========================================
const CancelledOrderDetailModal = ({ order, isOpen, onClose }) => {
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);

  useEffect(() => {
    setIsPiiRevealed(false);
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, order?.id, onClose]);

  if (!order) return null;

  const createdDateTime = formatFullAuditDate(order.created_at || order.created_date);
  const cancelledDateTime = formatFullAuditDate(order.cancelled_at || order.cancelled_at_date);

  return (
   <AnimatePresence>
     {isOpen && (
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[550px]" 
        >
          <div className="bg-rose-50/50 pt-5 pb-3 px-4 text-center relative border-b border-rose-100/50 shrink-0">
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-rose-400 rounded-lg"
            >
              <IconClose className="w-5 h-5 text-text-dark" />
            </button>
            <div className="w-10 h-10 flex items-center justify-center mx-auto mb-1">
               <IconBan className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-h3 font-bold text-text-dark leading-tight truncate px-6">
              {order.customer_name || "Unknown Customer"}
            </h3>
            
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-micro font-medium uppercase  text-text-dark/70">
              <span>#{order.order_number || "---"}</span>
              <span>•</span>
              <span className="text-rose-500 font-medium capitalize">Cancelled Archive</span>
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-3">
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
              <button 
                onClick={() => setIsPiiRevealed(!isPiiRevealed)}
                className="absolute top-2 right-2 p-1.5 text-text-dark/40 hover:text-app-dark transition-colors focus:outline-none rounded-lg hover:bg-slate-200"
                title={isPiiRevealed ? "Hide Customer Info" : "Reveal Customer Info"}
              >
                {isPiiRevealed ? <IconEyeClosed className="w-4 h-4" /> : <IconEyeOpen className="w-4 h-4" />}
              </button>

              <div className="flex justify-between items-center pr-8">
                <div className="flex items-center gap-2.5">
                  <IconPhone className="w-4 h-4 text-text-dark/70" />
                  <span className="text-sm-text font-medium text-text-dark/70">Phone</span>
                </div>
                <span className="text-sm-text font-medium text-text-dark">
                  {isPiiRevealed ? (order.customer_phone || "N/A") : maskPhone(order.customer_phone)}
                </span>
              </div>
              
              <div className="flex justify-between items-start pr-8">
                <div className="flex items-center gap-2.5 mt-0.5">
                  <div className="w-4 flex justify-center"><IconMapPin className="w-3.5 h-3.5 text-text-dark/70" /></div>
                  <span className="text-sm-text font-medium text-text-dark/70">Address</span>
                </div>
                <span className="text-sm-text font-medium text-text-dark text-right pl-2 leading-snug">
                  {isPiiRevealed ? (order.customer_address || "N/A") : maskAddress(order.customer_address)}
                </span>
              </div>
            </div>

            <div className="px-2 space-y-2.5">
              <div className="flex justify-between items-center text-micro font-medium uppercase tracking-wider text-text-dark/70">
                <div className="flex items-center gap-2">
                  <IconHandover className="w-3.5 h-3.5" />
                  <IconDelivery className="w-4 h-4" />
                  <span>Handover</span>
                </div>
                <span className="text-text-dark">{order.handover_method || "pickup"}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm-text font-medium text-text-dark/70 mt-0.5">Services</span>
                <div className="flex flex-col items-end gap-1">
                  {Array.isArray(order.services) && order.services.length > 0 ? (
                    order.services.map((svc, idx) => (
                      <span key={idx} className="text-sm-text font-medium text-text-dark bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        {svc.quantity || 1}x {svc.service_name || "Unknown"}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm-text font-medium text-text-dark/70 italic">No services listed</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-rose-50/50 border-rose-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm-text font-medium text-rose-600">Total Loss</span>
                <span className="text-h3 font-bold text-rose-700">
                  ₱{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm-text font-medium text-slate-500 ">Payment Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                    {order.is_paid ? `${order.payment_method || 'Paid'}` : "Unpaid"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
              <div className="text-center pb-2 border-b border-slate-200">
                <h4 className="text-micro font-bold text-text-dark/40  mb-1">Cancellation Reason</h4>
                <p className="text-sm-text font-medium text-rose-600 italic">"{order.cancellation_reason || "No reason recorded"}"</p>
              </div>
              
              <div className="grid grid-cols-1 gap-1.5 text-micro font-medium tracking-tight text-text-dark/60">
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

            {order.notes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 italic">
                <span className="font-bold text-micro uppercase block mb-1 not-italic tracking-tighter opacity-70">Order Notes</span>
                {order.notes}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <button 
              onClick={onClose} 
              className="w-full py-3 bg-app-dark text-white font-medium text-sm-text tracking-widest rounded-xl hover:opacity-90 transition-opacity active:scale-95"
            >
              CLOSE ARCHIVE
            </button>
          </div>
        </motion.div>
      </div>
     )}
   </AnimatePresence>
  );
};

// ==========================================
// 2. MAIN CARD COMPONENT
// ==========================================
const CancelledOrderCard = ({ order, onOpenDetail }) => {
  const timeString = useMemo(() => {
    if (!order) return "--:--"; // Guard inside the hook
    try {
      const d = order.cancelled_at_date instanceof Date ? order.cancelled_at_date : new Date(order.cancelled_at || order.cancelled_at_date);
      if (isNaN(d.getTime())) return "--:--";
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "--:--";
    }
  }, [order?.cancelled_at_date, order?.cancelled_at]); // Safely check dependencies

  // ✨ FIX: Early return is now AFTER the hook, satisfying React's Rules of Hooks
  if (!order) return null;

  return (
    <motion.button
      layout
      onClick={() => onOpenDetail(order)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 group mb-1 p-3.5 focus:outline-none focus:ring-1 focus:ring-rose-400"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 transition-all group-hover:w-2" />

      <div className="flex items-start justify-between mb-1 pl-1.5">
        <div className="min-w-0 pr-3">
          <h3 className="text-sm-text font-bold text-text-dark truncate">
            {order.customer_name || "Unknown Customer"}
          </h3>
        </div>
        <div className="shrink-0 flex items-center px-1">
          <span className="text-nano font-medium text-rose-600 uppercase  px-2 py-0.5 ">
            {timeString}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between pl-1.5">
        <div className="flex items-center gap-2 text-micro font-medium text-text-dark/70">
          <span>#{order.order_number || "---"}</span>
          <span>•</span>
          <span className="uppercase">{order.handover_method || "pickup"}</span>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-sm-text font-bold text-rose-600">
            - ₱{Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </motion.button>
  );
};

// ==========================================
// 3. MAIN LIST COMPONENT
// ==========================================
export const CancelledOrdersList = ({ cancelledOrders, totalLost }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const infoRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
    };
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showInfo]);

  const safeCancelledOrders = Array.isArray(cancelledOrders) ? cancelledOrders : [];

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col">
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-bold text-text-dark/70 uppercase tracking-tight">
                  Cancelled Orders
                </h2>
                
                <div className="relative" ref={infoRef}>
                  <button 
                    onClick={() => setShowInfo(!showInfo)} 
                    className={`transition-colors focus:outline-none rounded-full ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
                    aria-label="More information"
                  >
                    <IconInfo className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {showInfo && (
                      <div 
                        className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/10 shadow-xl rounded-xl z-[100]"
                      > 
                        <p className="text-[13px] text-text-dark/90 leading-relaxed font-normal">
                          Use this archive to analyze Revenue Leakage from cancelled orders. Click any record for a detailed Audit Trail.
                        </p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-1 mb-3">
                <div className="inline-flex flex-col py-1.5 rounded-lg">
                  <p className="text-sm-text font-medium text-rose-600 leading-none mb-1.5 ">
                    Total Revenue Lost
                  </p>
                  <p className="text-base-text font-bold text-rose-700 leading-none">
                    ₱{Number(totalLost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
              <IconBan className="w-5 h-5 text-text-dark" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
            {safeCancelledOrders.length === 0 ? (
              <div className="py-10 text-center opacity-30 italic text-[11px] uppercase font-bold tracking-widest">
                No archives found
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {safeCancelledOrders.map((order) => {
                    if (!order || !order.id) return null; // Safe rendering guard
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

          <div className="mt-2 border-t border-slate-50 pt-2 flex justify-between items-center text-[9px] font-bold text-text-dark/40 uppercase">
            <span>Audit Trail Logs</span>
            {safeCancelledOrders.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
          </div>
        </div>
      </div>

      <CancelledOrderDetailModal 
        isOpen={!!selectedOrder} 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </>
  );
};