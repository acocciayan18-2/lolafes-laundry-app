import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconBan, IconInfo, IconPhone, 
  IconMapPin, IconReceipt,
  IconHandover
} from "../icons";

// ==========================================
// 1. DETAIL MODAL COMPONENT
// ==========================================
const CancelledOrderDetailModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

 
  const formatFullAuditDate = (ts) => {
    if (!ts) return null;
    let dateObj;

    try {
      if (ts.seconds) dateObj = new Date(ts.seconds * 1000); // Firestore Timestamp
      else if (typeof ts.toDate === 'function') dateObj = ts.toDate(); 
      else dateObj = new Date(ts); // String or Date Object

      if (isNaN(dateObj.getTime())) return null;

      const dateStr = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' 
      });
      const timeStr = dateObj.toLocaleTimeString([], { 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });

      return `${dateStr} at ${timeStr}`;
    } catch (e) {
      return null;
    }
  };

  const createdDateTime = formatFullAuditDate(order.created_at || order.created_date);
  const cancelledDateTime = formatFullAuditDate(order.cancelled_at || order.cancelled_at_date);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[550px]"
          >
            {/* COMPACT HEADER */}
            <div className="bg-rose-600 px-5 py-4 text-white flex justify-between items-center">
              <div>
                <p className="text-micro font-medium opacity-80 uppercase tracking-widest">Order no#</p>
                <h2 className="text-lg font-bold tracking-tight">{order.order_number}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
              
              {/* ORDER IDENTITY SECTION */}
              <div className="space-y-2">
                <h4 className="text-micro font-bold text-text-dark/70 uppercase tracking-wider">Order Information</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-text-dark">{order.customer_name}</span>
                    <span className="text-[10px] font-bold uppercase text-text-dark/40">ID: {order.customer_id?.slice(-6)}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-2 text-[12px]">
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-text-dark">
                        <IconPhone className="w-3.5 h-3.5 opacity-50"/> {order.customer_phone}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-text-dark capitalize">
                        <IconHandover className="w-3.5 h-3.5 opacity-50"/> {order.handover_method}
                      </div>

                      {/* 🛡️ SECURITY Logic: Only show method if PAID */}
                      {order.is_paid && order.payment_method && (
                        <div className="flex items-center gap-2 text-text-dark">
                          <IconReceipt className="w-3.5 h-3.5 opacity-50"/> {order.payment_method}
                        </div>
                      )}

                      <div className={`font-bold ${order.is_paid ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {order.is_paid ? 'PAID' : 'UNPAID'}
                      </div>
                    </div>
                  </div>

                  {order.customer_address && (
                    <div className="pt-2 border-t border-slate-200/50 flex items-start gap-2 text-[12px] text-slate-500">
                      <IconMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {order.customer_address}
                    </div>
                  )}
                </div>
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="space-y-2">
                <h4 className="text-micro font-bold text-text-dark/70 uppercase tracking-wider">Bill Summary</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  {order.services?.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-0 bg-white">
                      <div className="text-[12px]">
                        <p className="font-medium text-sm-text text-text-dark mb-0.5">{s.service_name}</p>
                        <p className="text-micro text-text-dark/90 font-medium">x {s.quantity} | ₱{s.price_per_kg}</p>
                      </div>
                      <span className="text-sm-text font-medium text-text-dark">₱{s.subtotal}</span>
                    </div>
                  ))}
                  
                  <div className="bg-slate-50/80 p-3 space-y-1 text-[11px] font-bold">
                    {/* 🛡️ LOGIC: Hide Delivery Fee if Pickup */}
                    {order.handover_method !== 'pickup' && order.delivery_fee > 0 && (
                      <div className="flex justify-between text-text-dark/60">
                        <span>Delivery Fee</span>
                        <span>₱{order.delivery_fee}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-base-text font-bold text-text-dark pt-1 border-t border-slate-200">
                      <span>Total</span>
                      <span>₱{order.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AUDIT LOG: REASON & TIMESTAMPS */}
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl space-y-3">
                <div className="text-center pb-2 border-b border-rose-100/50">
                  <h4 className="text-micro font-bold text-rose-400 mb-1">Cancellation Reason</h4>
                  <p className="text-[13px] font-bold text-rose-800 italic">"{order.cancellation_reason || "No reason recorded"}"</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-micro font-bold  tracking-tight text-rose-400">
                  {createdDateTime && (
                    <div className="flex justify-between">
                      <span>Date Created:</span>
                      <span className="text-rose-600 text-right">{createdDateTime}</span>
                    </div>
                  )}
                  {cancelledDateTime && (
                    <div className="flex justify-between">
                      <span>Date Cancelled:</span>
                      <span className="text-rose-600 text-right">{cancelledDateTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* NOTES */}
              {order.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 italic">
                  <span className="font-bold text-micro uppercase block mb-1  not-italic tracking-tighter">Order Notes</span>
                  {order.notes}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-medium  text-sm-text tracking-widest rounded-xl hover:bg-slate-800 transition-colors">
                Close Archive
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
  return (
    <motion.div
      layout
      onClick={() => onOpenDetail(order)}
      className={`group relative bg-white border transition-all duration-300 mb-2 cursor-pointer rounded-xl overflow-hidden border-slate-100 hover:border-rose-100 hover:shadow-md`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
      <div className="p-3 pl-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="font-bold text-text-dark text-sm-text truncate">{order.customer_name}</h3>
              <p className="text-[10px] font-bold text-text-dark/70">#{order.order_number}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base-text font-bold text-rose-600">- ₱{Number(order.total_amount || 0).toLocaleString()}</p>
            <p className="text-nano font-medium text-text-dark/70 uppercase">{order.cancelled_at_date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    </motion.div>
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

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col">
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
  {/* 🏷️ Row 1: Title and Info Button */}
  <div className="flex items-center gap-2">
    <h2 className="text-[13px] font-bold text-text-dark/70 uppercase tracking-tight">
      Cancelled Orders
    </h2>
    
    <div className="relative" ref={infoRef}>
      <button 
        onClick={() => setShowInfo(!showInfo)} 
        className={`transition-colors ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}
      >
        <IconInfo className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {showInfo && (
          <div 
            
            className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200"
          > 
            <p className="text-[13px] text-text-dark/90 leading-relaxed">
              Use this archive to analyze Revenue Leakage from cancelled orders. Click any record for a detailed Audit Trail, including customer information, services, and cancellation reasons.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>

  {/* 📉 Row 2: Total Lost Revenue (Now strictly below Row 1) */}
  <div className="mt-1 mb-3">
    <div className="inline-flex flex-col py-1.5 rounded-lg">
      <p className="text-sm-text font-medium text-rose-600 leading-none mb-1.5 ">
        Total Revenue Lost
      </p>
      <p className="text-base-text font-bold text-rose-700 leading-none">
        ₱{totalLost.toLocaleString()}
      </p>
    </div>
  </div>
</div>
            <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
              <IconBan className="w-5 h-5 text-text-dark" />
            </div>
          </div>

          

          <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
            {cancelledOrders.length === 0 ? (
              <div className="py-10 text-center opacity-30 italic text-[11px] uppercase font-bold tracking-widest">No archives found</div>
            ) : (
              <div className="space-y-1">
                {cancelledOrders.map((order) => (
                  <CancelledOrderCard 
                    key={order.id} 
                    order={order} 
                    onOpenDetail={(o) => setSelectedOrder(o)} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 border-t border-slate-50 pt-2 flex justify-between items-center text-[9px] font-bold text-text-dark/40 uppercase">
            <span>Audit Trail Logs</span>
            {cancelledOrders.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
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