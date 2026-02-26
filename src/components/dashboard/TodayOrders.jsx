<<<<<<< HEAD
import "../../style/custom-scrollbar.css";
import {
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp, IconStatusProcessing, IconStatusReady
} from '../icons';

const SimpleLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2 py-12">
    <div className="w-6 h-6 border-2 border-app-dark/10 border-t-status-process rounded-full animate-spin"></div>
    <p className="text-nano text-text-dark/40 font-bold uppercase">Updating...</p>
  </div>
);

const statusConfig = {
  pending: { 
    color: "bg-status-pending/10 text-status-pending border-status-pending/30", 
    icon: IconStatusPending, 
    label: "Pending"
  },
  in_progress: { 
    color: "bg-status-process/10 text-status-process border-status-process/30", 
    icon: IconStatusProcessing, 
    label: "Processing"
  },
  ready: { 
    color: "bg-status-ready/10 text-status-ready border-status-ready/30", 
    icon: IconStatusReady, 
    label: "Ready"
  },
  completed: { 
    color: "bg-status-complete/10 text-status-complete border-status-complete/30", 
    icon: IconStatusCompleted, 
    label: "Completed"
  },
  picked_up: { 
    color: "bg-status-picked/10 text-status-picked border-status-picked/30", 
    icon: IconStatusPickedUp, 
    label: "Picked Up"
  }    
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function TodayOrders({ orders = [], isLoading }) {
  // Removed selectedOrder and updatingOrderId to clear ESLint warnings
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
      
      {/* Header Section */}
=======
import { AnimatePresence, motion } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore";
import { useTodayOrdersStore } from "../../store/orders/useTodayOrdersStore";
import {
  IconClose,
  IconShirt,
  IconStatusCompleted,
  IconStatusPending,
  IconStatusPickedUp,
  IconStatusProcessing,
  IconStatusReady
} from '../icons';

const statusConfig = {
  pending: { icon: IconStatusPending, label: "Pending", color: "status-pending" },
  in_progress: { icon: IconStatusProcessing, label: "Processing", color: "status-process" },
  ready: { icon: IconStatusReady, label: "Ready", color: "status-ready" },
  completed: { icon: IconStatusCompleted, label: "Completed", color: "status-complete" },
  picked_up: { icon: IconStatusPickedUp, label: "Picked Up", color: "status-picked" }    
};

export default function TodayOrders({ orders = [], isLoading }) {
  const { selectedOrder, setSelectedOrder, isUpdating, executeStatusUpdate, validate } = useTodayOrdersStore();
  const { isOrderStuck, isOrderLocked, parseTimestamp } = useOrderStore(); 

  const sortedOrders = [...orders].sort((a, b) => (a.status === 'picked_up') - (b.status === 'picked_up'));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden relative">
>>>>>>> Karen2.0
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconShirt className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
        </div>
      </div>

<<<<<<< HEAD
      {/* Orders List Section */}
      <div className="flex-1 overflow-y-auto p-2 px-3 custom-scrollbar mb-4">
        {isLoading ? (
          <SimpleLoader />
        ) : orders.length > 0 ? (
          <div className="space-y-1">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <div 
                  key={order.id} 
                  className="group relative rounded-xl p-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-app-dark/10 shadow-hollow">
                      <StatusIcon className="w-5 h-5"/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm-text font-bold text-text-dark truncate uppercase">
                        {order.customer_name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-1  gap-y-1 mt-1">
                        <span className="text-nano font-bold text-text-dark border border-app-dark/10 px-1 py-0.5 rounded whitespace-nowrap bg-white/50">
                          #{order.order_number || "--"}
                        </span>

                        <span className={`text-nano font-bold px-1 py-0.5 rounded border uppercase whitespace-nowrap ${config.color}`}>
                          {config.label}
                        </span>
                        
                        <span className="text-nano text-text-dark/40 font-bold whitespace-nowrap">
                          {formatTime(order.created_date)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-base-text font-bold text-text-dark">
                        ₱{(order.total_amount || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20 grayscale">
            <IconShirt className="w-10 h-10 mb-2" />
            <p className="text-micro font-bold uppercase text-text-dark ">No order/s for today.</p>
          </div>
        )}
      </div>
=======
      <div className="flex-1 overflow-y-auto p-2 px-3 custom-scrollbar mb-4">
        {!isLoading && sortedOrders.length > 0 ? (
          sortedOrders.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.pending;
            const isStuck = isOrderStuck(order);
            const isLocked = isOrderLocked(order);
            
            const timeCreated = parseTimestamp(order.created_date).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            return (
              <button 
                key={order.id} 
                onClick={() => !isLocked && setSelectedOrder(order)}
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

                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border border-${cfg.color}/20 bg-white shadow-sm transition-all`}>
                  <cfg.icon className={`w-5 h-5 ${isStuck ? 'text-red-500' : 'text-current'}`}/>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm-text font-bold truncate uppercase ${isLocked ? 'text-text-dark/40' : 'text-text-dark'}`}>
                    {order.customer_name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-nano font-bold px-1 py-0.5 rounded border border-app-dark/10 bg-white/50 text-text-dark">#{order.order_number}</span>
                    <span className={`text-nano font-bold px-1.5 py-0.5 rounded border uppercase bg-${cfg.color}/10 text-${cfg.color} border-${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {isStuck && (
                      <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-tighter">
                        STUCK
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-nano font-bold lowercase opacity-40">{timeCreated}</p>
                </div>
              </button>
            )
          })
        ) : !isLoading && (
          /* --- EMPTY STATE --- */
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <div className="w-16 h-16  rounded-full flex items-center justify-center mb-4 ">
              <IconShirt className="w-8 h-8 text-text-dark/40" />
            </div>
            <h3 className="text-sm-text font-bold text-text-dark/40 ">No Orders Today</h3>
            <p className="text-nano font-medium text-text-dark/40 mt-1 ">Waiting for your first customer...</p>
          </div>
        )}
      </div>

      {/* --- STATUS MODAL --- */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-app-dark/15 backdrop-blur-[4px]">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white border border-app-dark/10 shadow-2xl rounded-3xl p-6 overflow-hidden relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm-text font-bold text-text-dark uppercase tracking-tight">#{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
                  <h3 className="text-micro font-medium text-text-dark/60 mt-1 uppercase">Update Order Status</h3>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-app-dark/5 rounded-full transition-colors"><IconClose className="w-5 h-5 opacity-40" /></button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(statusConfig).filter(([k]) => k !== 'pending').map(([key, cfg]) => {
                  const isCurrent = selectedOrder.status === key;
                  const { allowed } = validate(selectedOrder, key);

                  return (
                    <button
                      key={key}
                      disabled={isUpdating || isCurrent || !allowed}
                      onClick={() => executeStatusUpdate(key)}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-300
                        ${isCurrent ? `bg-${cfg.color} text-white border-${cfg.color} shadow-lg shadow-${cfg.color}/20 translate-x-1` 
                                    : `bg-white border-${cfg.color}/10 text-${cfg.color} hover:bg-app-dark/5`}
                        ${(!allowed && !isCurrent) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                    >
                      <div className={`p-2 rounded-xl ${isCurrent ? 'bg-white/20' : `bg-${cfg.color}/10`}`}>
                        <cfg.icon className={`w-5 h-5 ${isCurrent ? 'text-white' : `text-${cfg.color}`}`} />
                      </div>
                      <span className="text-sm-text font-bold uppercase flex-1 text-left">{cfg.label}</span>
                      {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
            <div className="absolute inset-0 -z-10" onClick={() => setSelectedOrder(null)} />
          </div>
        )}
      </AnimatePresence>
>>>>>>> Karen2.0
    </div>
  );
}