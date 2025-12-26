import React, { useState, useEffect } from 'react';
import { IconTrendingUp, IconClock, IconPackage, IconCheckCircle } from '../components/icons'; // Adjust path
import QuickActions from '../components/dashboard/QuickActions'; // Adjust path
import QuickStats from '../components/dashboard/QuickStats'; // Adjust path
import TodayOrders from '../components/dashboard/TodayOrders'; // Adjust path

// --- HELPER FUNCTIONS ---
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  }).format(date);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

// --- MAIN PAGE COMPONENT ---
export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMockData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      const now = new Date();
      
      const MOCK_DATA = [
        { id: "1001-ORDER-A", customer_name: "Maria Santos", service_name: "Wash & Fold", status: "pending", total_amount: 150.00, created_date: now.toISOString(), is_paid: false },
        { id: "1002-ORDER-B", customer_name: "Juan Dela Cruz", service_name: "Dry Clean", status: "in_progress", total_amount: 450.00, created_date: now.toISOString(), is_paid: true },
        { id: "1003-ORDER-C", customer_name: "Lola Fe", service_name: "Comforter Wash", status: "ready", total_amount: 300.00, created_date: now.toISOString(), is_paid: true },
        { id: "1004-ORDER-D", customer_name: "Benjie Tan", service_name: "Express Wash", status: "completed", total_amount: 200.00, created_date: "2023-01-01T10:00:00Z", is_paid: true },
      ];

      setOrders(MOCK_DATA);
      setIsLoading(false);
    };
    loadMockData();
  }, []);

  const todayDateString = new Date().toDateString();
  const todayOrders = orders.filter(order => new Date(order.created_date).toDateString() === todayDateString);
  const todayRevenue = todayOrders.filter(order => order.is_paid).reduce((sum, order) => sum + order.total_amount, 0);

  // Stats Logic
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const readyOrders = orders.filter(order => order.status === 'ready').length;
  const inProgressOrders = orders.filter(order => order.status === 'in_progress').length;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Good {getGreeting()}!</h1>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-gray-500 text-lg">Overview for</p>
              <span className="text-blue-600 font-semibold bg-blue-50 px-3 py-0.5 rounded-full text-sm">{formatDate(new Date())}</span>
            </div>
          </div>
          <QuickActions />
        </div>

        {/* STATS SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickStats title="Today's Revenue" value={`₱${todayRevenue.toFixed(2)}`} icon={<IconTrendingUp className="w-6 h-6" />} bgColor="from-emerald-400 to-green-500" trend={`${todayOrders.length} orders today`} />
          <QuickStats title="Pending Orders" value={pendingOrders} icon={<IconClock className="w-6 h-6" />} bgColor="from-amber-400 to-orange-500" trend="Needs attention" />
          <QuickStats title="In Progress" value={inProgressOrders} icon={<IconPackage className="w-6 h-6" />} bgColor="from-blue-400 to-indigo-500" trend="Being washed" />
          <QuickStats title="Ready for Pickup" value={readyOrders} icon={<IconCheckCircle className="w-6 h-6" />} bgColor="from-purple-400 to-pink-500" trend="Notify customers" />
        </div>

        {/* ORDERS LIST SECTION */}
        <TodayOrders orders={todayOrders} isLoading={isLoading} />
      </div>
    </div>
  );
}