import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { IconPlus, IconSearch, IconShirt } from "../components/icons";
import OrderFilters from "../components/orders/OrderFilters";
import OrderCard from "../components/orders/OrderCard";

// Mock Data
const MOCK_ORDERS = [
  // 1. THE PENDING ITEM (Amber Banner)
 
  { 
    id: "1", 
    order_number: "ORD-001", 
    customer_name: "JUAN DELA CRUZ TORREDA LAURETA", 
    customer_phone: "09123456789", 
    customer_address: "B5 L2, Acacia St., Taguig 123 Rizal Ave, Pasig City 123 Rizal Ave, Pasig City",
    total_weight: 5.0, 
    total_amount: 175.00, 
    status: "pending", 
    is_paid: false,
    created_date: new Date().toISOString(),
    services: [{ service_name: "Wash & Fold", weight_kg: 5.0 }],
    special_instructions: "ertyertyrtyUZSHofiuhsadk fiubwoe" // Added
  },
  { 
    id: "2", 
    order_number: "ORD-002", 
    customer_name: "MARIA SANTOS", 
    customer_phone: "09987654321", 
    customer_address: "123 Rizal Ave, Pasig City",
    total_weight: 12.5, 
    total_amount: 540.00, 
    status: "in_progress", 
    is_paid: true,
    created_date: new Date().toISOString(),
    services: [
      { service_name: "Wash & Fold", weight_kg: 7.5 },
      { service_name: "Dry Clean", weight_kg: 2.0 },
      { service_name: "Wash & Dry", weight_kg: 3.0 },
      
    ],
    special_instructions: "asdfaskludgIOUYITIUYGjkubgfsdfgwergsergsdfgsdfgsdfgsdfgehgago ka pala pamo nmosab  nas ako un?" // Added
  },


  // 3. READY FOR PICKUP (Emerald Green Banner)
  { 
    id: "3", 
    order_number: "ORD-003", 
    customer_name: "JOSE RIZAL", 
    customer_phone: "09171234567", 
    customer_address: "Calamba, Laguna",
    total_weight: 8.0, 
    total_amount: 320.00, 
    status: "ready", 
    is_paid: true,
    created_date: new Date().toISOString(),
    services: [{ service_name: "Wash & Fold", weight_kg: 8.0 }]
  },

  // 4. COMPLETED (Slate/Gray Banner)
  { 
    id: "4", 
    order_number: "ORD-004", 
    customer_name: "LOLA FE", 
    customer_phone: "09201112222", 
    customer_address: "Shop Main, Taguig",
    total_weight: 4.2, 
    total_amount: 147.00, 
    status: "completed", 
    is_paid: true,
    created_date: new Date(Date.now() - 86400000).toISOString(),
    services: [{ service_name: "Wash & Dry", weight_kg: 4.2 }]
  },

  // 5. PICKED UP (Light Gray Banner)
  { 
    id: "5", 
    order_number: "ORD-005", 
    customer_name: "ANDRES BONIFACIO", 
    customer_phone: "09183334444", 
    customer_address: "Tondo, Manila",
    total_weight: 10.0, 
    total_amount: 350.00, 
    status: "picked_up", 
    is_paid: true,
    created_date: new Date(Date.now() - 172800000).toISOString(),
    services: [{ service_name: "Wash & Fold", weight_kg: 10.0 }]
  }
];

const Button = ({ children, className = "", ...props }) => (
  <button className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${className}`} {...props}>
    {children}
  </button>
);

// Updated Input Component
const Input = ({ className, ...props }) => (
  <input 
    className={`
      flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm 
      placeholder:text-gray-400 outline-none transition-all
     
      focus:!border-black focus:!ring-0
      ${className}
    `} 
    {...props} 
  />
);

const LaundryLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <p className="text-xs text-gray-400">Loading orders...</p>
  </div>
);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const filterOrders = useCallback(() => {
    let filtered = orders;
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.customer_name.toLowerCase().includes(lowerTerm) ||
        order.customer_phone.includes(lowerTerm) ||
        order.order_number.toLowerCase().includes(lowerTerm)
      );
    }
    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrders(MOCK_ORDERS);
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders([]);
    }
    setIsLoading(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updatedOrders);
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 md:p-4">
    <div className="max-w-6xl mx-auto px-1 md:px-2">
      {/* Header - Slightly reduced margin-bottom */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">All Orders</h1>
          <p className="text-gray-600 mt-1">Manage and track laundry orders</p>
        </div>
        <Link to="/main/neworder">
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md text-white px-4 py-3 h-9">
            <IconPlus className="w-4 h-4 mr-2 !text-white !stroke-white" />
            <span className="text-sm font-medium text-white">New Order</span>
          </Button>
        </Link>
      </div>

      {/* Search & Filters - Restored Original H-11 and design */}
    <div className="flex flex-row gap-2 mb-6">
  <div className="flex-1 relative">
  {/* The Icon: Positioned 12px (left-3) from the edge */}
  <IconSearch className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
  
  <Input
    placeholder="Search name, phone, or order number..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    
    className="!pl-10 bg-white/80 backdrop-blur-sm  !focus:border-black !focus:ring-0 transition-colors border-slate-200"
  />
</div>
  <OrderFilters 
    statusFilter={statusFilter}
    setStatusFilter={setStatusFilter}
  />
</div>





      {/* Orders List 
          - Added px-1 and overflow-visible so card shadows aren't clipped on the sides
      */}
      <div className="grid gap-3 grid-cols-1  overflow-visible">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-20">
            <LaundryLoader />
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusUpdate={updateOrderStatus}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-white/40 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300">
            <div className="flex justify-center mb-4">
              <IconShirt className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600 mb-1">No orders found</h3>
            <p className="text-sm text-slate-400 mb-6">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filters"
                : "Start by creating your first order"
              }
            </p>
            <Link to="/main/neworder">
              <Button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-xl shadow-sm transition-all">
                <IconPlus className="w-4 h-4 mr-2" />
                Create First Order
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
);
}