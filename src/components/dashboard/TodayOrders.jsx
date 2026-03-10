import React, { useEffect, useMemo, useState} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useTodayOrdersStore } from "../../store/orders/useTodayOrdersStore";
import { useSettingsStore } from "../../store/settings/useSettingsStore";
import {
  IconClose, IconShirt, IconStatusCompleted, IconStatusPending,
  IconStatusPickedUp, IconStatusProcessing, IconStatusReady,
  IconPhone, IconHash, IconEyeOpen, IconEyeClosed
} from '../icons';
import CompleteOrderModal from "../orders/CompleteOrderModal";

const statusConfig = {
  pending: { label: "Pending", banner: "bg-status-pending", theme: "text-status-pending bg-status-pending/10 border-status-pending/20", icon: IconStatusPending },
  in_progress: { label: "Processing", banner: "bg-status-process", theme: "text-status-process bg-status-process/10 border-status-process/20", icon: IconStatusProcessing },
  ready: { label: "Ready", banner: "bg-status-ready", theme: "text-status-ready bg-status-ready/10 border-status-ready/20", icon: IconStatusReady },
  completed: { label: "Completed", banner: "bg-status-complete", theme: "text-status-complete bg-status-complete/10 border-status-complete/20", icon: IconStatusCompleted },
  picked_up: { label: "Picked Up", banner: "bg-status-picked", theme: "text-status-picked bg-status-picked/10 border-status-picked/20", icon: IconStatusPickedUp },
  delivered: { label: "Delivered", banner: "bg-emerald-500", theme: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: IconStatusPickedUp }
};

// DATA GUARD: Ensure robust date parsing that never returns "Invalid Date" strings to the UI
const getSafeDate = (ts) => {
  if (!ts) return new Date();
  if (typeof ts.toDate === 'function') return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
};

// SECURITY: Masking utility for PII (Personally Identifiable Information)
const maskPhone = (phone) => phone ? phone.replace(/.(?=.{4})/g, '•') : "N/A";
const maskAddress = (address) => address ? "••••• Hidden for privacy" : "N/A";

// PERFORMANCE: Memoized Order Card prevents the entire list from re-rendering when the modal opens
const OrderCard = React.memo(({ order, isLocked, unclaimed, stuck, onClick }) => {
  const cfg = statusConfig[order.status] || statusConfig.pending;
  const isDelivered = order.status === 'picked_up' && order.handover_method === 'delivery';

  return (
    <motion.button 
      layout
      onClick={onClick}
      disabled={isLocked}
      className={`w-full text-left relative overflow-hidden rounded-xl bg-white border transition-all p-3.5 mb-1 group focus:outline-none focus:ring-2 focus:ring-app-dark/20
        ${isLocked ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : 'hover:border-app-dark/20 hover:shadow-md active:scale-[0.98]'}
        ${unclaimed ? 'border-rose-200' : 'border-slate-100'}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.banner} transition-all group-hover:w-2`} />

      <div className="flex justify-between items-start mb-1 pl-1.5">
        <div className="min-w-0 pr-3">
           <h3 className="text-sm-text font-bold text-text-dark truncate">
            {order.customer_name || "Unknown Customer"}
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${cfg.theme}`}>
          {isDelivered ? "Delivered" : cfg.label}
        </span>
      </div>

      <div className="flex items-end justify-between pl-1.5">
        <div className="flex items-center gap-2 text-micro font-medium text-text-dark/70">
          <span>#{order.order_number || "---"}</span>
          <span>•</span>
          <span className="uppercase">{order.handover_method || "pickup"}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {!order.is_paid && (
            <span className="text-nano font-bold text-rose-500 uppercase tracking-tighter rounded">
              Unpaid
            </span>
          )}

          {(stuck || unclaimed) && (
            <span className={`flex h-2 w-2 rounded-full animate-pulse ${unclaimed ? 'bg-rose-500' : 'bg-orange-500'}`} />
          )}

          <span className="text-sm-text font-bold text-text-dark">
            ₱{Number(order.total_amount || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </motion.button>
  );
});

export default function TodayOrders({ orders = [], isLoading }) {
  const { selectedOrder, setSelectedOrder, isUpdating, executeStatusUpdate, validate } = useTodayOrdersStore();
  const { isOrderStuck, isOrderUnclaimed, isOrderLocked } = useOrderStore(); 
  const { systemConfig } = useSettingsStore();

  const [pendingStatus, setPendingStatus] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // NEW FEATURE STATE: Privacy control for PII data
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);

  // Reset privacy mode when a new order is selected
  useEffect(() => {
    setIsPiiRevealed(false);
  }, [selectedOrder?.id]);

  // ROBUSTNESS: Strict array guarding and optimized sorting
  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return [...orders].sort((a, b) => {
      const aTerminal = ['picked_up', 'delivered'].includes(a?.status) ? 1 : 0;
      const bTerminal = ['picked_up', 'delivered'].includes(b?.status) ? 1 : 0;
      return aTerminal - bTerminal;
    });
  }, [orders]);

  useEffect(() => {
    const handleEsc = (e) => { 
      if (e.key === 'Escape' && !isUpdating) {
        setSelectedOrder(null);
        setShowCompleteModal(false); 
      }
    };
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedOrder, setSelectedOrder, isUpdating]);

  const handleUpdate = async (newStatus) => {
    if (newStatus === "completed") {
      if (systemConfig?.confirmCompletion ?? true) {
        setShowCompleteModal(true);
        return;
      }
    }
    await executeStatusUpdateCall(newStatus, false);
  };

  const executeStatusUpdateCall = async (newStatus, sendSms = false) => {
    if (!selectedOrder) return;
    const { customer_phone, customer_name, order_number } = selectedOrder;
    setPendingStatus(newStatus);
    
    try {
      const success = await executeStatusUpdate(newStatus);
      if (success) {
        // Safe dynamic import to prevent bundling overhead unless SMS is actually triggered
        if (sendSms && customer_phone) {
          import('../../services/smsService')
            .then(s => s.sendStatusSMS(customer_phone, customer_name, order_number, "ready"))
            .catch(err => console.error("SMS Service Failure:", err)); // Network catch
        }
        setShowCompleteModal(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Status Update Failed:", error);
    } finally { 
      setPendingStatus(null); 
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden relative">
      
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconShirt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
          </div>
        </div>
        <span className="bg-app-dark/5 text-text-dark text-micro font-medium px-2 py-0.5 rounded-full">
          {Array.isArray(orders) ? orders.length : 0}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar mb-4">
        {isLoading ? (
           <div className="py-10 text-center text-sm-text text-gray-400 italic">Loading...</div>
        ) : sortedOrders.length > 0 ? (
          <div className="space-y-1">
            {sortedOrders.map((order) => {
              if (!order || !order.id) return null; // Safe rendering
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
          <div className="h-full flex flex-col items-center justify-center py-10 opacity-30">
            <IconShirt className="w-8 h-8 mb-2" />
            <p className="text-sm-text font-medium">No Orders Today</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && !showCompleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/40 backdrop-blur-sm" 
               onClick={() => !isUpdating && setSelectedOrder(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[550px]" 
            >
              <div className="bg-slate-50 pt-5 pb-3 px-4 text-center relative border-b border-slate-100 shrink-0">
                <button onClick={() => setSelectedOrder(null)} disabled={isUpdating} className="absolute top-4 right-4 p-2 opacity-40 hover:opacity-100 transition-opacity">
                  <IconClose className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 flex items-center justify-center mx-auto mb-1">
                   <IconShirt className="w-6 h-6 text-text-dark" />
                </div>
                <h3 className="text-h3 font-bold text-text-dark ">{selectedOrder.customer_name || "Unknown"}</h3>
                
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 text-micro font-medium uppercase tracking-wider text-text-dark/70">
                  <span>#{selectedOrder.order_number}</span>
                  <span>•</span>
                  <span className={selectedOrder.handover_method === 'delivery' ? 'text-blue-500' : 'text-amber-500'}>
                    {selectedOrder.handover_method || "pickup"}
                  </span>
                  <span>•</span>
                  <span>
                    {getSafeDate(selectedOrder.created_at || selectedOrder.created_date).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-3">
                
                {/* SECURITY: PII Protection Box */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
                  <button 
                    onClick={() => setIsPiiRevealed(!isPiiRevealed)}
                    className="absolute top-2 right-2 p-1.5 text-text-dark/40 hover:text-app-dark transition-colors "
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
                      {isPiiRevealed ? (selectedOrder.customer_phone || "N/A") : maskPhone(selectedOrder.customer_phone)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start pr-8">
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <div className="w-4 flex justify-center"><IconHash className="w-3.5 h-3.5 text-text-dark/70" /></div>
                      <span className="text-sm-text font-medium text-text-dark/70">Address</span>
                    </div>
                    <span className="text-sm-text font-medium text-text-dark text-right pl-2 leading-snug">
                      {isPiiRevealed ? (selectedOrder.customer_address || "N/A") : maskAddress(selectedOrder.customer_address)}
                    </span>
                  </div>
                </div>

                <div className="px-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm-text font-medium text-text-dark/70 mt-0.5">Services</span>
                    <div className="flex flex-col items-end gap-1">
                      {Array.isArray(selectedOrder.services) && selectedOrder.services.length > 0 ? (
                        selectedOrder.services.map((svc, idx) => (
                          <span key={idx} className="text-sm-text font-medium text-text-dark bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            {svc.quantity || 1}x {svc.service_name || "Unknown"}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm-text font-medium text-text-dark/70">No services</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${selectedOrder.is_paid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm-text font-medium text-text-dark/70">Total Amount</span>
                    <span className="text-h3 font-bold text-text-dark">
                      ₱{Number(selectedOrder.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm-text font-medium text-text-dark/70">Payment Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedOrder.is_paid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                      <span className={`text-[11px] font-medium tracking-wider ${selectedOrder.is_paid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedOrder.is_paid ? "Paid in Full" : "Unpaid Balance"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 my-4" />

                <div className="space-y-2">
                  <h4 className="text-sm-text font-medium text-text-dark/70 mb-2 px-1">Update Status</h4>
                  {Object.entries(statusConfig).filter(([k]) => k !== 'pending' && k !== 'delivered').map(([key, cfg]) => {
                    const isCurrent = selectedOrder.status === key;
                    const { allowed } = validate(selectedOrder, key);
                    const isThisButtonLoading = pendingStatus === key;
                    
                    return (
                      <button
                        key={key}
                        disabled={isUpdating || isCurrent || !allowed}
                        onClick={() => handleUpdate(key)}
                        className={`relative w-full flex items-center gap-4 p-2 rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-app-dark/20
                          ${isCurrent ? `${cfg.banner} text-white border-transparent shadow-md translate-x-1` 
                                      : `bg-white border-slate-200 text-text-dark hover:bg-slate-50`}
                          ${(!allowed && !isCurrent) ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                        `}
                      >
                        <div className={`p-1.5 rounded-xl ${isCurrent ? 'bg-white/20' : 'bg-slate-100'}`}>
                          <cfg.icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-text-dark/70'}`} />
                        </div>
                        <span className="text-sm-text font-medium uppercase flex-1 text-left">
                          {isThisButtonLoading ? "Updating..." : (key === 'picked_up' && selectedOrder.handover_method === 'delivery' ? "Delivered" : cfg.label)}
                        </span>
                        {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse pr-2" />}
                      </button>
                    );
                  })}
                </div>
                
                {!selectedOrder.is_paid && (
                  <p className="text-micro text-rose-500  text-center mt-2 " role="alert">
                    Order must be PAID before handover
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
        onConfirm={async (sendSms) => await executeStatusUpdateCall("completed", sendSms)}
      />
    </div>
  );
}