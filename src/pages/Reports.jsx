import React, { useState, useEffect, useCallback } from "react";
import { 
  IconBarChart3, IconTrendingUp, IconDollarSign, 
  IconUsers, IconPackage, IconDownload, IconRefreshCw, IconSparkles 
} from "../components/icons";

// Import Separate Components
import ReportFilters from "../components/reports/ReportFilters";
import AIInsights from "../components/reports/AIInsights";
import ReportCards from "../components/reports/ReportCards";
import RevenueChart from "../components/reports/RevenueChart"; // New Chart Component

// --- Mock Data ---
const MOCK_ORDERS = [
  { id: "1", total_amount: 150, status: "picked_up", created_date: new Date().toISOString() },
  { id: "2", total_amount: 450, status: "ready", created_date: new Date(Date.now() - 86400000).toISOString() },
  { id: "3", total_amount: 300, status: "in_progress", created_date: new Date(Date.now() - 172800000).toISOString() },
  { id: "4", total_amount: 200, status: "picked_up", created_date: new Date(Date.now() - 259200000).toISOString() },
  { id: "5", total_amount: 500, status: "pending", created_date: new Date().toISOString() },
  { id: "6", total_amount: 120, status: "picked_up", created_date: new Date(Date.now() - 604800000).toISOString() },
];

const Button = ({ children, onClick, disabled, className = "", variant = "primary" }) => {
  const variants = {
    primary: "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg",
    outline: "bg-white text-gray-700 border border-gray-300 hover:bg-blue-50",
  };
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none px-4 py-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dateRange, setDateRange] = useState("7");
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAIInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API
      setOrders(MOCK_ORDERS);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Filter Logic
  const filterOrdersByDate = useCallback(() => {
    const days = parseInt(dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = orders.filter(order => {
      const orderDate = new Date(order.created_date);
      return orderDate >= cutoffDate;
    });
    
    setFilteredOrders(filtered);
  }, [orders, dateRange]);

  useEffect(() => {
    filterOrdersByDate();
  }, [filterOrdersByDate]);

  // AI Logic
  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAIInsights({
      overall_performance: "Your laundry business is showing steady growth with consistent order volume. Revenue trends indicate healthy customer retention.",
      key_insights: [
        "Average order value increased by 15% compared to last month",
        "Wash & Dry services account for 60% of total orders",
        "Peak hours detected between 10 AM - 2 PM"
      ],
      recommendations: [
        { title: "Optimize Staffing", description: "Add staff during peak hours (10 AM-2 PM) to reduce wait times.", priority: "high" },
        { title: "Promote Premium", description: "Your premium press service has low adoption. Consider a promo.", priority: "medium" }
      ],
      concerns: ["Customer wait times are increasing on weekends"]
    });
    setIsGeneratingInsights(false);
  };

  const exportReport = () => {
    const dataStr = JSON.stringify(filteredOrders, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // KPI Calculations
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
  const completedOrders = filteredOrders.filter(order => order.status === 'picked_up').length;

  // Chart Data Preparation
  const getDailyOrderData = () => {
    const days = parseInt(dateRange) > 7 ? 7 : parseInt(dateRange);
    const dailyData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
      
      // Filter orders for this specific day
      const dayOrders = filteredOrders.filter(o => {
        const orderDate = new Date(o.created_date);
        return orderDate.getDate() === d.getDate() && orderDate.getMonth() === d.getMonth();
      });
      
      // Fallback random data if array empty (just for demo visualization)
      const mockRevenue = dayOrders.length > 0 
        ? dayOrders.reduce((sum, o) => sum + o.total_amount, 0)
        : Math.floor(Math.random() * 1000) + 200; 

      dailyData.push({
        date: dateStr,
        revenue: mockRevenue,
        orders: dayOrders.length || Math.floor(Math.random() * 10) + 1
      });
    }
    return dailyData;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <IconBarChart3 className="w-8 h-8 text-blue-600" />
              Business Reports
            </h1>
            <p className="text-gray-600 mt-1">Analytics and insights for your laundry business</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={generateAIInsights} disabled={isGeneratingInsights || !!aiInsights}>
              {isGeneratingInsights ? <IconRefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <IconSparkles className="w-5 h-5 mr-2" />}
              AI Insights
            </Button>
            <Button variant="outline" onClick={exportReport}>
              <IconDownload className="w-5 h-5 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <ReportFilters dateRange={dateRange} setDateRange={setDateRange} isLoading={isLoading} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <ReportCards 
            title="Total Revenue" 
            value={`₱${totalRevenue.toFixed(2)}`} 
            icon={IconDollarSign} 
            bgColor="from-green-400 to-emerald-500" 
            subtitle={`Last ${dateRange} days`} 
          />
          <ReportCards 
            title="Total Orders" 
            value={filteredOrders.length} 
            icon={IconPackage} 
            bgColor="from-blue-400 to-indigo-500" 
            subtitle={`${completedOrders} completed`} 
          />
          <ReportCards 
            title="Avg Order Value" 
            value={`₱${avgOrderValue.toFixed(2)}`} 
            icon={IconTrendingUp} 
            bgColor="from-purple-400 to-pink-500" 
            subtitle="per order" 
          />
          <ReportCards 
            title="Active Customers" 
            value={new Set(filteredOrders.map(o => o.customer_phone)).size} 
            icon={IconUsers} 
            bgColor="from-orange-400 to-red-500" 
            subtitle="unique customers" 
          />
        </div>

        {/* Charts & AI Insights */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Chart - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <RevenueChart data={getDailyOrderData()} isLoading={isLoading} />
          </div>

          {/* AI Insights - Takes up 1 column or flows below */}
          <div className="lg:col-span-1">
            <AIInsights 
              insights={aiInsights}
              isGenerating={isGeneratingInsights}
              onGenerate={generateAIInsights}
            />
          </div>
        </div>
      </div>
    </div>
  );
}