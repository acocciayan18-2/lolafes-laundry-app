import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useTodayOrdersStore } from "../../store/orders/useTodayOrdersStore";
import {
  IconClose, IconShirt, IconStatusCompleted, IconStatusPending,
  IconStatusPickedUp, IconStatusProcessing, IconStatusReady,
  IconDelivery, IconHandover
} from '../icons';

const statusConfig = {
  pending: { 
    icon: IconStatusPending, label: "Pending", 
    theme: { text: "text-status-pending", bgSolid: "bg-status-pending", bgLight: "bg-status-pending/10", border: "border-status-pending", borderLight: "border-status-pending/10", shadow: "shadow-status-pending/20" }
  },
  in_progress: { 
    icon: IconStatusProcessing, label: "Processing", 
    theme: { text: "text-status-process", bgSolid: "bg-status-process", bgLight: "bg-status-process/10", border: "border-status-process", borderLight: "border-status-process/10", shadow: "shadow-status-process/20" }
  },
  ready: { 
    icon: IconStatusReady, label: "Ready", 
    theme: { text: "text-status-ready", bgSolid: "bg-status-ready", bgLight: "bg-status-ready/10", border: "border-status-ready", borderLight: "border-status-ready/10", shadow: "shadow-status-ready/20" }
  },
  completed: { 
    icon: IconStatusCompleted, label: "Completed", 
    theme: { text: "text-status-complete", bgSolid: "bg-status-complete", bgLight: "bg-status-complete/10", border: "border-status-complete", borderLight: "border-status-complete/10", shadow: "shadow-status-complete/20" }
  },
  picked_up: { 
    icon: IconStatusPickedUp, label: "Picked Up", 
    theme: { text: "text-status-picked", bgSolid: "bg-status-picked", bgLight: "bg-status-picked/10", border: "border-status-picked", borderLight: "border-status-picked/10", shadow: "shadow-status-picked/20" }
  },
  delivered: { 
    icon: IconStatusPickedUp, label: "Delivered", 
    theme: { text: "text-emerald-600", bgSolid: "bg-emerald-500", bgLight: "bg-emerald-500/10", border: "border-emerald-500", borderLight: "border-emerald-500/10", shadow: "shadow-emerald-500/20" }
  }
};

const handoverConfig = {
  pickup: { icon: IconHandover, label: "Pickup", theme: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" } },
  delivery: { icon: IconDelivery, label: "Delivery", theme: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" } }
};

export default function TodayOrders({ orders = [], isLoading }) {
  const { selectedOrder, setSelectedOrder, isUpdating, executeStatusUpdate, validate } = useTodayOrdersStore();
  const { isOrderStuck, isOrderUnclaimed, isOrderLocked, parseTimestamp } = useOrderStore(); 

  // Track WHICH button was clicked for the loading state
  const [pendingStatus, setPendingStatus] = useState(null);

 const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => {
      const aTerminal = ['picked_up', 'delivered'].includes(a.status) ? 1 : 0;
      const bTerminal = ['picked_up', 'delivered'].includes(b.status) ? 1 : 0;
      return aTerminal - bTerminal;
    });
  }, [orders]);

  useEffect(() => {
    const handleEsc = (e) => { 
      // Prevent closing if we are currently updating
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
  }, [selectedOrder, setSelectedOrder, isUpdating]);

  // Handle Update Execution safely
  const handleUpdate = async (newStatus) => {
    setPendingStatus(newStatus);
    const success = await executeStatusUpdate(newStatus);
    setPendingStatus(null);
    if (success) {
      setSelectedOrder(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden relative">
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconShirt className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 px-3 custom-scrollbar mb-4">
        {isLoading ? (
           <div className="py-10 text-center text-sm-text text-gray-400 italic">Loading orders...</div>
        ) : sortedOrders.length > 0 ? (
          sortedOrders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const stuck = isOrderStuck(order);
            const unclaimed = isOrderUnclaimed(order);
            const isLocked = isOrderLocked(order);
            
            // ✨ Handover config resolution
            const handoverType = order.handover_method || 'pickup';
            const handoverObj = handoverConfig[handoverType] || handoverConfig.pickup;
            const HandoverIcon = handoverObj.icon;
            
            const timeCreated = (() => {
              try {
                const date = parseTimestamp(order.created_date || order.created_at);
                if (!date || isNaN(date.getTime())) return "--:--";
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch (e) { return "--:--"; }
            })();

            return (
              <button 
                key={order.id} 
                onClick={() => !isLocked && setSelectedOrder(order)}
                className={`w-full text-left group flex items-center gap-4 p-2 rounded-xl transition-all relative mb-1 border
                  ${isLocked ? 'opacity-70 grayscale-[0.8] cursor-not-allowed scale-[0.98]' : 'hover:bg-app-dark/5 active:scale-[0.98]'}
                  ${unclaimed ? ' border-red-300' : stuck ? 'border-transparent' : 'border-transparent'}`}
              >
                <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center border ${cfg.theme.borderLight} bg-white shadow-sm transition-all`}>
                  {(stuck || unclaimed) && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${unclaimed ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border border-white ${unclaimed ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                    </span>
                  )}
                  <cfg.icon className="w-5 h-5 text-text-dark"/>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm-text font-bold truncate uppercase ${isLocked ? 'text-text-dark/40' : 'text-text-dark'}`}>
                      {order.customer_name || "Unknown Customer"}
                    </h3>
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    <span className="text-nano font-bold px-1 py-0.5 rounded border border-app-dark/10 bg-white/50 text-text-dark">
                      #{order.order_number}
                    </span>
                    <span className={`text-nano font-bold px-1.5 py-0.5 rounded border uppercase ${cfg.theme.bgLight} ${cfg.theme.text} ${cfg.theme.border}`}>
                      {order.status === 'picked_up' && handoverType === 'delivery' ? "Delivered" : cfg.label}
                    </span>
                    
                    {/* ✨ HANDOVER BADGE */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 uppercase tracking-tighter
                      ${handoverObj.theme.bg} ${handoverObj.theme.text} ${handoverObj.theme.border}
                    `}>
                      <HandoverIcon className="w-2.5 h-2.5" />
                      {handoverObj.label}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <p className="text-nano font-medium lowercase opacity-40">{timeCreated}</p>
                  {unclaimed && <p className="text-[8px] font-medium text-red-600 uppercase tracking-tighter mt-0.5">Unclaimed</p>}
                  {stuck && !unclaimed && <p className="text-[8px] font-medium text-orange-600 uppercase tracking-tighter mt-0.5">Stuck</p>}
                </div>
              </button>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
            <IconShirt className="w-8 h-8 text-text-dark mb-4" />
            <h3 className="text-sm-text font-medium text-text-dark ">No Orders Today</h3>
          </div>
        )}
      </div>

    <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-app-dark/40 backdrop-blur-sm" role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white border border-app-dark/10 shadow-2xl rounded-3xl p-6 overflow-hidden relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-base-text font-bold text-text-dark uppercase tracking-tight">#{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
                  <h3 className="text-micro font-medium text-text-dark/70 mt-1 ">Update order status</h3>
                </div>
                {/* Disable close button while updating */}
                <button 
                  disabled={isUpdating}
                  onClick={() => setSelectedOrder(null)} 
                  className={`p-2 rounded-full transition-colors ${isUpdating ? 'opacity-20 cursor-not-allowed' : 'hover:bg-app-dark/5'}`} 
                  aria-label="Close modal"
                >
                  <IconClose className="w-5 h-5 opacity-40" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(statusConfig).filter(([k]) => k !== 'pending' && k !== 'delivered').map(([key, cfg]) => {
                  const isCurrent = selectedOrder.status === key;
                  const { allowed } = validate(selectedOrder, key);
                  const isThisButtonLoading = pendingStatus === key;

                  let displayLabel = cfg.label;
                  let DisplayIcon = cfg.icon;

                  if (key === 'picked_up' && selectedOrder.handover_method === 'delivery') {
                    displayLabel = "Delivered";
                    DisplayIcon = IconStatusPickedUp; 
                  }

                  return (
                    <button
                      key={key}
                      // Disable if any update is happening globally, if it's current, or not allowed
                      disabled={isUpdating || isCurrent || !allowed}
                      onClick={() => handleUpdate(key)}
                      className={`relative flex items-center gap-4 p-2.5 rounded-2xl border transition-all duration-300 overflow-hidden
                        ${isCurrent ? `${cfg.theme.bgSolid} text-white ${cfg.theme.border} shadow-lg ${cfg.theme.shadow} translate-x-1` 
                                    : `bg-white ${cfg.theme.borderLight} ${cfg.theme.text} hover:bg-app-dark/5`}
                        ${(!allowed && !isCurrent) ? 'opacity-30 grayscale cursor-not-allowed' : ''}
                        ${isUpdating && !isThisButtonLoading ? 'opacity-50 grayscale pointer-events-none' : ''}
                      `}
                    >
                      {/* Optional Overlay when loading */}
                      {isThisButtonLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-end pr-4 z-10 rounded-2xl">
                          <svg className="animate-spin h-5 w-5 text-text-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}

                      <div className={`p-2 rounded-xl ${isCurrent ? 'bg-white/20' : cfg.theme.bgLight}`}>
                        <DisplayIcon className={`w-5 h-5 ${isCurrent ? 'text-white' : cfg.theme.text}`} />
                      </div>
                      <span className="text-sm-text font-bold uppercase flex-1 text-left">{isThisButtonLoading ? "Updating..." : displayLabel}</span>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
            {/* Disable background click while updating */}
            <div className="absolute inset-0 -z-10" onClick={() => !isUpdating && setSelectedOrder(null)} aria-hidden="true" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}