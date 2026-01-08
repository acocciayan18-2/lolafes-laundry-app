import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../../services/firebase'; // Adjust path
import { 
  IconShirt, IconClock, IconPackage, IconCheckCircle, 
  IconRefresh, IconArrowUp, IconEye
} from '../icons'; 

import "../../style/custom-scrollbar.css";
// --- HELPER COMPONENTS ---
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

const Button = ({ children, variant = "primary", size = "md", className = "", disabled, onClick, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    ghost: "hover:bg-slate-100 text-slate-600",
    action: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
  };
  const sizes = { sm: "h-7 px-2 text-xs", md: "h-9 px-4 py-2 text-sm", icon: "h-8 w-8 p-0" };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

const SimpleLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2 py-12">
    <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <p className="text-xs text-slate-400 font-medium">Updating...</p>
  </div>
);

// --- CONFIG ---
const statusConfig = {
  pending: { color: "bg-amber-100 text-amber-700", icon: IconClock, label: "Pending", nextStatus: "in_progress" },
  in_progress: { color: "bg-blue-100 text-blue-700", icon: IconPackage, label: "Processing", nextStatus: "ready" },
  ready: { color: "bg-emerald-100 text-emerald-700", icon: IconCheckCircle, label: "Ready", nextStatus: "picked_up" },
  picked_up: { color: "bg-slate-100 text-slate-600", icon: IconCheckCircle, label: "Completed", nextStatus: null }
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  // Formats to: "2:30 PM"
  return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// --- MAIN COMPONENT ---
export default function TodayOrders({ orders = [], isLoading, onRefresh }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const handleStatusUpdate = async (e, orderId, newStatus) => {
    e.stopPropagation(); // Prevent opening the modal
    setUpdatingOrderId(orderId);
    try {
      const orderRef = doc(db, "orders", orderId);
      const updateData = { 
        status: newStatus,
        updated_at: serverTimestamp() 
      };
      
      // Auto-mark as paid if picked up (Business Logic)
      if (newStatus === 'picked_up') {
        updateData.completed_at = serverTimestamp();
        updateData.is_paid = true;
      }
      
      await updateDoc(orderRef, updateData);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl  shadow-sm border border-slate-200 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
               <IconShirt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Today's Order</h2>
             
            </div>
          </div>
         
        </div>

        {/* Content */}
       <div className="flex-1 overflow-y-auto min-h-[300px] p-2 !pl-0 !pr-0 custom-scrollbar mb-6">
  {isLoading ? (
    <SimpleLoader />
  ) : orders.length > 0 ? (
    <div className="space-y-2 ">
      {orders.map((order) => {
        const config = statusConfig[order.status] || statusConfig.pending;
        const StatusIcon = config.icon;
        const canAdvance = config.nextStatus;

        return (
          <div 
            key={order.id} 
            onClick={() => setSelectedOrder(order)}
            className="group relative  hover:border-blue-300 rounded-xl p-2.5 pl-5 pr-5 transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {/* Left: Status Icon (Smaller now: w-10 h-10) */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 !pl-0 transition-colors ${config.color}`}>
                <StatusIcon className={`w-5 h-5 ${config.color.replace('bg-', 'text-')}`} />
              </div>

              {/* Middle: Name + Meta Data Combined */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Name - Truncated */}
                <h3 className="font-bold text-slate-800 text-sm truncate leading-tight mb-0.5">
                  {order.customer_name}
                </h3>
                
                {/* Metadata Row (Order #, Time, Status) - Tiny & Compact */}
                <div className="flex flex-col items-start justify-center gap-1 mt-0.5">
                {/* Row 1: Badges (Order # + Status) */}
                <div className="flex items-center gap-1.5">
                  {/* Order Number: Slate BG + Border */}
                  <span className="font-mono text-[10px] rounded-lg font-bold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-[4px]">
                    #{order.order_number || "--"}
                  </span>

                  {/* Status: Dynamic BG + Border (using current text color for border opacity) */}
                  <span className={`text-[10px] rounded-lg font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-[4px] border border-current/20 ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                  {/* Row 2: Time (Below) */}
                  <span className="text-[11px] text-slate-400 font-normal leading-none ml-0.5">
                    {formatTime(order.created_date)}
                  </span>
                </div>
              </div>

              {/* Right: Price & Action */}
              <div className="flex items-center gap-2 pl-2">
                {/* Price - Bolder and Distinct */}
                <div className="text-right">
  <p className="font-bold text-gray-700 text-[16px] leading-none">
    ₱{(order.total_amount || 0).toFixed(2)}
  </p>
</div>

              
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
      <IconShirt className="w-12 h-12 mb-3 opacity-20" />
      <p className="text-sm">No orders for today yet.</p>
    </div>
  )}
</div>
      </div>

      {/* --- MODAL (Simplified) --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Order #{selectedOrder.order_number || "---"}</h3>
                <p className="text-xs text-slate-500">{formatTime(selectedOrder.created_date)}</p>
              </div>
              <Badge className={statusConfig[selectedOrder.status]?.color}>
                {statusConfig[selectedOrder.status]?.label}
              </Badge>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</label>
                <p className="text-lg font-bold text-slate-800">{selectedOrder.customer_name}</p>
                {/* Note: Phone/Address hidden as requested */}
              </div>

              {/* Service */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex justify-between items-center">
                <div>
                   <p className="font-medium text-slate-700">{selectedOrder.service_name || "Laundry Service"}</p>
                   {/* Note: Weight hidden as requested */}
                </div>
                <p className="text-xl font-bold text-blue-600">₱{selectedOrder.total_amount}</p>
              </div>

              {selectedOrder.notes && (
                <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-100">
                  <span className="font-bold mr-1">Note:</span> {selectedOrder.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>Close</Button>
              {statusConfig[selectedOrder.status]?.nextStatus && (
                <Button 
                  className="flex-1 bg-blue-600 text-white" 
                  onClick={(e) => handleStatusUpdate(e, selectedOrder.id, statusConfig[selectedOrder.status].nextStatus)}
                >
                  Mark {statusConfig[statusConfig[selectedOrder.status].nextStatus].label}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}