import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '../../services/firebase'; 
import { 
  IconShirt, IconStatusCompleted, IconStatusPending, IconStatusPickedUp, IconStatusProcessing, IconStatusReady
} from '../icons'; 

import "../../style/custom-scrollbar.css";

// --- HELPER COMPONENTS ---
const Badge = ({ children, className }) => (
  // Applied text-nano for technical metadata
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-nano font-bold  border uppercase ${className}`}>
    {children}
  </span>
);

const Button = ({ children, variant = "primary", size = "md", className = "", disabled, onClick, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold tracking-tighter transition-all focus:outline-none disabled:opacity-30 disabled:pointer-events-none active:scale-95";
  const variants = {
    primary: "bg-status-process text-white hover:opacity-90 shadow-md",
    outline: "border-2 border-app-dark/10 bg-transparent hover:bg-white/5 text-text-dark",
    ghost: "hover:bg-white/5 text-text-dark/60",
    action: "bg-white shadow-hollow text-text-dark border border-app-dark/5"
  };
  // Sizes updated to use micro and nano scale
  const sizes = { 
    sm: "h-7 px-2 text-nano", 
    md: "h-9 px-4 py-2 text-micro", 
    icon: "h-8 w-8 p-0" 
  };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

const SimpleLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2 py-12">
    <div className="w-6 h-6 border-2 border-app-dark/10 border-t-status-process rounded-full animate-spin"></div>
    {/* Applied text-nano */}
    <p className="text-nano text-text-dark/40 font-bold  uppercase">Updating...</p>
  </div>
);

// --- CONFIG ---
const statusConfig = {
  pending: { 
    color: "bg-status-pending/10 text-status-pending border-status-pending/30", 
    icon: IconStatusPending, 
    label: "Pending", 
    nextStatus: "in_progress" 
  },
  in_progress: { 
    color: "bg-status-process/10 text-status-process border-status-process/30", 
    icon: IconStatusProcessing, 
    label: "Processing", 
    nextStatus: "ready" 
  },
  ready: { 
    color: "bg-status-ready/10 text-status-ready border-status-ready/30", 
    icon: IconStatusReady, 
    label: "Ready", 
    nextStatus: "completed" 
  },
  completed: { 
    color: "bg-status-complete/10 text-status-complete border-status-complete/30", 
    icon: IconStatusCompleted, 
    label: "Completed", 
    nextStatus: "picked_up" 
  },
  picked_up: { 
    color: "bg-status-picked/10 text-status-picked border-status-picked/30", 
    icon: IconStatusPickedUp, 
    label: "Picked Up", 
    nextStatus: null 
  }
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function TodayOrders({ orders = [], isLoading }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-app-dark/10 flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
      {/* Header: text-base-text */}
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-5">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconShirt className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 px-3 custom-scrollbar mb-6">
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
                  onClick={() => setSelectedOrder(order)}
                  className="group relative rounded-xl p-2 transition-all duration-200 "
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-app-dark/10 shadow-hollow">
                      <StatusIcon className="w-5 h-5"/>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Customer Name: text-sm-text */}
                      <h3 className="text-sm-text font-bold text-text-dark truncate uppercase tracking-tight">
                        {order.customer_name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                        {/* Order ID: text-nano */}
                        <span className="font-mono text-nano font-bold text-text-dark border border-app-dark/10 px-1 py-0.5 rounded whitespace-nowrap bg-white/50">
                          #{order.order_number || "--"}
                        </span>

                        {/* Status: text-nano */}
                        <span className={`text-nano font-bold px-1 py-0.5 rounded border uppercase whitespace-nowrap ${config.color}`}>
                          {config.label}
                        </span>
                        
                        {/* Time: text-nano */}
                        <span className="text-nano text-text-dark/40 font-bold whitespace-nowrap">
                          {formatTime(order.created_date)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {/* Price: text-base-text */}
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
            {/* Empty State: text-micro */}
            <p className="text-micro font-bold uppercase text-text-dark ">No orders for today.</p>
          </div>
        )}
      </div>
    </div>
  );
}