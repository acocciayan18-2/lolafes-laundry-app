import React, { useState } from 'react';
import { 
  IconShirt, IconClock, IconPackage, IconCheckCircle, 
  IconRefresh, IconArrowUp, IconPhone, IconEye, IconMapPin 
} from '../icons'; // Adjust path

// --- HELPER COMPONENTS (Button/Badge) ---
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const Button = ({ children, variant = "primary", size = "md", className = "", disabled, onClick, ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900",
    ghost: "hover:bg-gray-100 text-gray-700",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 py-2 text-sm", icon: "h-9 w-9 p-0" };
  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

const SimpleLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <p className="text-xs text-gray-400">Loading...</p>
  </div>
);

// --- CONFIG ---
const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: IconClock, label: "Pending", nextStatus: "in_progress" },
  in_progress: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: IconPackage, label: "In Progress", nextStatus: "ready" },
  ready: { color: "bg-green-100 text-green-800 border-green-200", icon: IconCheckCircle, label: "Ready", nextStatus: "picked_up" },
  picked_up: { color: "bg-gray-100 text-gray-800 border-gray-200", icon: IconCheckCircle, label: "Completed", nextStatus: null }
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// --- MAIN COMPONENT ---
export default function TodayOrders({ orders = [], isLoading, onRefresh }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log(`Updated Order ${orderId} to ${newStatus}`);
    setUpdatingOrderId(null);
    setSelectedOrder(null); 
  };

  const handleOrderClick = (order) => setSelectedOrder(order);

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconShirt className="w-6 h-6 text-blue-600" />
            Today's Orders <span className="text-gray-500 text-base font-normal">({orders.length})</span>
          </h2>
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading} className="bg-white/50 hover:bg-white">
            <IconRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-80">
              <SimpleLoader />
            </div>
          ) : orders.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const StatusIcon = statusConfig[order.status]?.icon || IconPackage;
                  const canAdvance = statusConfig[order.status]?.nextStatus;
                  return (
                    <div key={order.id} className="group relative hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer" onClick={() => handleOrderClick(order)}>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${order.status === 'ready' ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                              <StatusIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 truncate">{order.customer_name}</h3>
                                <Badge className={statusConfig[order.status]?.color}>{statusConfig[order.status]?.label || order.status}</Badge>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600 font-mono">{order.id}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1"><IconPhone className="w-3 h-3" /><span>{order.customer_phone || "No Phone"}</span></div>
                                  <div className="flex items-center gap-1"><IconPackage className="w-3 h-3" /><span>{order.total_weight || 0}kg</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <div className="text-right">
                              <p className="font-bold text-lg text-gray-900">₱{(order.total_amount || 0).toFixed(2)}</p>
                              <p className="text-xs text-gray-500">{formatTime(order.created_date)}</p>
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}>
                                <IconEye className="w-4 h-4 text-gray-600" />
                              </Button>
                              {canAdvance && (
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, canAdvance); }} disabled={updatingOrderId === order.id}>
                                  {updatingOrderId === order.id ? <IconRefresh className="w-4 h-4 animate-spin" /> : <IconArrowUp className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <IconShirt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">No orders today yet</h3>
              <p className="text-gray-400">Orders will appear here as they come in</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedOrder(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold flex items-center gap-2"><IconShirt className="w-5 h-5 text-blue-600" />Order Details<span className="text-gray-400 font-normal">#{selectedOrder.id}</span></h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><IconPhone className="w-4 h-4" /> Customer Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><span className="text-xs text-gray-500 uppercase tracking-wide">Name</span><p className="font-medium text-gray-900">{selectedOrder.customer_name}</p></div>
                  <div><span className="text-xs text-gray-500 uppercase tracking-wide">Contact</span><p className="font-medium text-gray-900">{selectedOrder.customer_phone || "N/A"}</p></div>
                  {selectedOrder.customer_address && <div className="col-span-2"><span className="text-xs text-gray-500 uppercase tracking-wide">Address</span><div className="flex items-start gap-1 mt-1"><IconMapPin className="w-4 h-4 text-gray-400 shrink-0" /><p className="text-sm text-gray-700">{selectedOrder.customer_address}</p></div></div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Current Status</span>
                  <div className="mt-2"><Badge className={statusConfig[selectedOrder.status]?.color}>{statusConfig[selectedOrder.status]?.label}</Badge></div>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                   <span className="text-xs text-gray-500 uppercase tracking-wide">Payment</span>
                   <p className="mt-1 font-medium text-gray-900">{selectedOrder.is_paid ? "Paid" : "Unpaid"}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Service Details</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                  <div><p className="font-medium text-gray-900">{selectedOrder.service_name}</p><p className="text-sm text-gray-500">Weight: {selectedOrder.total_weight || 0} kg</p></div>
                  <p className="font-bold text-xl text-blue-600">₱{(selectedOrder.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>
              {selectedOrder.notes && (
                <div><h3 className="font-semibold text-gray-900 mb-2">Notes</h3><div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-100">{selectedOrder.notes}</div></div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
              {statusConfig[selectedOrder.status]?.nextStatus && (
                <Button onClick={() => handleStatusUpdate(selectedOrder.id, statusConfig[selectedOrder.status].nextStatus)} disabled={updatingOrderId === selectedOrder.id} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {updatingOrderId === selectedOrder.id ? <IconRefresh className="w-4 h-4 mr-2 animate-spin" /> : <IconArrowUp className="w-4 h-4 mr-2" />}
                  Move to {statusConfig[statusConfig[selectedOrder.status].nextStatus].label}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}