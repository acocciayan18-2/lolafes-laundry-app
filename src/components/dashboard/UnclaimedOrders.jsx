import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useOrderStore } from '../../store/orders/useOrderStore';
import { useUnclaimedStore } from '../../store/orders/useUnclaimedStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconClock,
  IconClose,
  IconHash,
  IconPhone,
  IconShirt,
  IconWallet
} from '../icons';

// --- SUB-COMPONENT: SLIDING BUTTON (Keeping your design) ---
const SwipeToConfirm = ({ onConfirm, isDisabled, isUpdating }) => {
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, 150], [1, 0]);

  return (
    <div className={`relative h-16 w-full rounded-full p-1.5 transition-all
      ${isDisabled ? "bg-slate-100 border border-slate-200" : "bg-app-dark shadow-xl"}`}>
      
      <motion.div 
        style={{ opacity: isDisabled ? 0.3 : textOpacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className={`text-base-text font-medium 
          ${isDisabled ? "text-text-dark" : "text-white/50"}`}>
          {isUpdating ? "Processing..." : isDisabled ? "Payment Locked" : "Slide to Claim"}
        </span>
      </motion.div>

      {!isDisabled && !isUpdating && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 245 }}
          dragElastic={0.05}
          dragSnapToOrigin
          onDragEnd={(_, info) => { if (info.offset.x > 200) onConfirm(); }}
          style={{ x }}
          className="relative z-10 h-full aspect-square bg-emerald-500 rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-emerald-400 transition-colors"
        >
          <IconArrowRight className="w-5 h-5 text-white" />
        </motion.div>
      )}

      {(isDisabled || isUpdating) && (
        <div className={`h-full aspect-square rounded-full flex items-center justify-center
          ${isUpdating ? "bg-emerald-500" : "bg-slate-200"}`}>
          {isUpdating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconClose className="w-4 h-4 text-text-dark" />}
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
  const { showNotification } = useNotificationStore(); // Fixed to use direct hook

  // --- REAL-TIME TICKER LOGIC ---
  useEffect(() => {
    // 1. Initial compute when orders arrive
    if (orders.length > 0) computeUnclaimed(orders);

    // 2. The "Heartbeat": Re-run calculation every 60 seconds
    // This catches orders that cross the threshold while the user is on the page
    // No internet is used here; it's purely a local calculation.
    const ticker = setInterval(() => {
      if (orders.length > 0) {
        computeUnclaimed(orders);
      }
    }, 60000); 

    return () => clearInterval(ticker);
  }, [orders, computeUnclaimed]);

  const handleClaim = async (order) => {
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
  };

  if (isLoading || unclaimedOrders.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-100 flex flex-col max-h-[450px] overflow-hidden relative mt-4">
      
      {/* --- WIDGET HEADER (Keeping your design) --- */}
      <div className="px-5 py-3.5 border-b border-red-50 flex justify-between items-center bg-red-50/30">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-red-200 rounded-lg text-red-600 shadow-hollow">
            <IconAlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base-text font-bold text-text-dark">Overdue Orders</h2>
            <p className="text-nano font-medium text-red-600">Unclaimed for 2+ Days</p>
          </div>
        </div>
        <span className="bg-red-500 text-white text-nano font-bold px-2 py-0.5 rounded-full shadow-sm">
          {unclaimedOrders.length}
        </span>
      </div>

      {/* --- LIST SECTION --- */}
      <div className="flex-1 overflow-y-auto p-2 px-3 custom-scrollbar">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {unclaimedOrders.map((order) => {
              const readyDate = order.updated_at?.seconds 
                ? new Date(order.updated_at.seconds * 1000) 
                : new Date(order.updated_at || order.created_date);
              
              const daysAgo = Math.floor((new Date() - readyDate) / (1000 * 60 * 60 * 24));

              return (
                <motion.button
                  layout
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full text-left group relative rounded-xl p-2 bg-white hover:bg-red-50/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-red-100 shadow-hollow">
                      <IconShirt className="w-5 h-5 text-red-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm-text font-bold text-slate-900 truncate uppercase">{order.customer_name}</h3>
                        <span className="text-nano font-bold text-red-500 uppercase">
                          {daysAgo >= 1 ? `${daysAgo} Days Stuck` : 'Just Overdue'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-nano font-bold px-1 py-0.5 rounded border border-app-dark/10 bg-white/50 text-text-dark">#{order.order_number}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* --- MODAL POPUP (Keeping your design) --- */}
      <AnimatePresence>
        {selectedOrder && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white shadow-3xl rounded-[2.5rem] p-4 px-6 pt-5 pb-6 relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 transition-colors group"
              >
                <IconClose className="w-5 h-5 text-slate-300 group-hover:text-slate-600" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-red-50 text-red-500 mb-2 shadow-sm">
                  <IconAlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 uppercase leading-tight truncate w-full text-center px-4">
                  {selectedOrder.customer_name}
                </h3>
                <p className="text-nano font-bold text-red-500 uppercase tracking-widest mt-1">
                  Unclaimed Order
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <IconHash className="w-4 h-4 text-text-dark" />
                    <span className="text-micro font-bold text-text-dark/90 uppercase">Order No.</span>
                  </div>
                  <span className="text-base-text font-bold text-slate-800">#{selectedOrder.order_number}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <IconPhone className="w-4 h-4 text-text-dark" />
                    <span className="text-micro font-bold text-text-dark/90 uppercase">Phone</span>
                  </div>
                  <span className="text-base-text font-bold text-slate-800">{selectedOrder.customer_phone || "N/A"}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <IconClock className="w-4 h-4 text-text-dark" />
                    <span className="text-micro font-bold text-text-dark/90 uppercase">Ready Since</span>
                  </div>
                  <span className="text-base-text font-bold text-slate-800">
                    {new Date(selectedOrder.updated_at || selectedOrder.created_date).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <IconWallet className="w-4 h-4 text-text-dark" />
                    <span className="text-micro font-bold text-text-dark/90 uppercase">Total Amount</span>
                  </div>
                  <span className="text-base-text font-bold text-emerald-600">₱{selectedOrder.total_amount}</span>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${selectedOrder.is_paid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-micro font-black text-text-dark/90 uppercase">Payment Status</span>
                  </div>
                  <span className={`text-sm-text font-bold uppercase ${selectedOrder.is_paid ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedOrder.is_paid ? "Verified Paid" : "Unpaid Balance"}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <SwipeToConfirm 
                  isUpdating={isUpdating}
                  isDisabled={!selectedOrder.is_paid}
                  onConfirm={() => handleClaim(selectedOrder)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnclaimedOrders;