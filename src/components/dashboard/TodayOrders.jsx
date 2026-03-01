import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useTodayOrdersStore } from "../../store/orders/useTodayOrdersStore";
import {
  IconClose,
  IconShirt,
  IconStatusCompleted,
  IconStatusPending,
  IconStatusPickedUp,
  IconStatusProcessing,
  IconStatusReady,
  IconDelivery, 
  IconHandover
} from '../icons';

// 1. TAILWIND COMPILER FIX: Use explicit full class strings
// This guarantees that Tailwind's compiler won't purge these colors in production.
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
  // Added delivered support just in case your DB uses it!
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
  const { isOrderStuck, isOrderLocked, parseTimestamp } = useOrderStore(); 

  // 2. PERFORMANCE: Memoized Sorting
  // Prevents the app from re-sorting the array every time the modal opens/closes
  const sortedOrders = useMemo(() => {
    if (!orders) return [];
    return [...orders].sort((a, b) => {
      const aTerminal = ['picked_up', 'delivered'].includes(a.status) ? 1 : 0;
      const bTerminal = ['picked_up', 'delivered'].includes(b.status) ? 1 : 0;
      return aTerminal - bTerminal;
    });
  }, [orders]);

  // 3. ACCESSIBILITY & SECURITY: Keyboard & Scroll Management
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    
    if (selectedOrder) {
      document.body.style.overflow = 'hidden'; // Prevents background scrolling
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedOrder, setSelectedOrder]);

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
            const handover = handoverConfig[order.handover_method || 'pickup'];
            const isStuck = isOrderStuck(order);
            const isLocked = isOrderLocked(order);
            
            // 4. DATA SANITIZATION: Safe Time Formatting
            const timeCreated = (() => {
              try {
                const date = parseTimestamp(order.created_date || order.created_at);
                if (!date || isNaN(date.getTime())) return "--:--";
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch (e) { return "--:--"; }
            })();

            let listStatusLabel = cfg.label;
            if (order.status === 'picked_up' && order.handover_method === 'delivery') {
              listStatusLabel = "Delivered";
            }

            return (
              <button 
                key={order.id} 
                onClick={() => !isLocked && setSelectedOrder(order)}
                aria-label={`View order ${order.order_number}`}
                className={`w-full text-left group flex items-center gap-4 p-2 rounded-xl transition-all relative mb-1
                  ${isLocked ? 'opacity-70 grayscale-[0.8] cursor-not-allowed scale-[0.98]' : 'hover:bg-app-dark/5 active:scale-[0.98]'}
                  ${isStuck ? 'bg-red-50/40 border border-red-300' : 'border-transparent'}`}
              >
                {isStuck && (
                  <span className="absolute left-1 top-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}

                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${cfg.theme.borderLight} bg-white shadow-sm transition-all`}>
                  <cfg.icon className={`w-5 h-5 ${isStuck ? 'text-text-dark' : "text-text-dark"}`}/>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm-text font-bold truncate uppercase ${isLocked ? 'text-text-dark/40' : 'text-text-dark'}`}>
                    {order.customer_name || "Unknown Customer"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-nano font-bold px-1 py-0.5 rounded border border-app-dark/10 bg-white/50 text-text-dark">#{order.order_number}</span>
                    <span className={`text-nano font-bold px-1.5 py-0.5 rounded border uppercase ${cfg.theme.bgLight} ${cfg.theme.text} ${cfg.theme.border}`}>
                      {listStatusLabel}
                    </span>
                    <span className={`text-nano font-bold uppercase px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 select-none hover:brightness-95 shadow-sm ${handover.theme.bg} ${handover.theme.text} ${handover.theme.border}`}>
                      <handover.icon className="w-4 h-4" />
                      {handover.label}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-nano font-bold lowercase opacity-40">{timeCreated}</p>
                </div>
              </button>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-40">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 ">
              <IconShirt className="w-8 h-8 text-text-dark" />
            </div>
            <h3 className="text-sm-text font-medium text-text-dark ">No Orders Today</h3>
            <p className="text-nano font-medium text-text-dark mt-1 ">Waiting for your first customer...</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/15 backdrop-blur-[4px]" role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white border border-app-dark/10 shadow-2xl rounded-3xl p-6 overflow-hidden relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm-text font-bold text-text-dark uppercase tracking-tight">#{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
                  <h3 className="text-micro font-medium text-text-dark/60 mt-1 uppercase">Update Order Status</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-app-dark/5 rounded-full transition-colors" aria-label="Close modal"><IconClose className="w-5 h-5 opacity-40" /></button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(statusConfig).filter(([k]) => k !== 'pending' && k !== 'delivered').map(([key, cfg]) => {
                  const isCurrent = selectedOrder.status === key;
                  const { allowed } = validate(selectedOrder, key);

                  let displayLabel = cfg.label;
                  let DisplayIcon = cfg.icon;

                  if (key === 'picked_up' && selectedOrder.handover_method === 'delivery') {
                    displayLabel = "Delivered";
                    DisplayIcon = IconStatusPickedUp; // Or IconDelivery if preferred
                  }

                  return (
                    <button
                      key={key}
                      disabled={isUpdating || isCurrent || !allowed}
                      onClick={async () => {
                        // Await the update, then close modal if successful
                        await executeStatusUpdate(key);
                        setSelectedOrder(null);
                      }}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-300
                        ${isCurrent ? `${cfg.theme.bgSolid} text-white ${cfg.theme.border} shadow-lg ${cfg.theme.shadow} translate-x-1` 
                                    : `bg-white ${cfg.theme.borderLight} ${cfg.theme.text} hover:bg-app-dark/5`}
                        ${(!allowed && !isCurrent) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                    >
                      <div className={`p-2 rounded-xl ${isCurrent ? 'bg-white/20' : cfg.theme.bgLight}`}>
                        <DisplayIcon className={`w-5 h-5 ${isCurrent ? 'text-white' : cfg.theme.text}`} />
                      </div>
                      <span className="text-sm-text font-bold uppercase flex-1 text-left">{displayLabel}</span>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
            {/* Click-outside backdrop handler */}
            <div className="absolute inset-0 -z-10" onClick={() => setSelectedOrder(null)} aria-hidden="true" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}