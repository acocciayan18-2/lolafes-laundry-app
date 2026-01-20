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
      <div className="px-5 py-3.5 border-b border-app-dark/5 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border border-app-dark/10 rounded-lg text-text-dark shadow-hollow">
            <IconShirt className="w-5 h-5" />
          </div>
          <h2 className="text-base-text font-bold text-text-dark">Today's Orders</h2>
        </div>
      </div>

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
                  className="group relative rounded-xl p-2 transition-all duration-200 hover:bg-app-dark/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white border border-app-dark/10 shadow-hollow">
                      <StatusIcon className="w-5 h-5"/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm-text font-bold text-text-dark truncate uppercase">
                        {order.customer_name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-1  gap-y-1 mt-0.5">
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
            <p className="text-micro font-bold uppercase text-text-dark ">No orders for today.</p>
          </div>
        )}
      </div>
    </div>
  );
}