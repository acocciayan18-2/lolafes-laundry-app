import { useState } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { exportToExcel } from "../../utils/exportUtils";
import { IconDownload } from "../icons";

export default function ExportOrdersButton() {
  const { orders } = useReportStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleFullExport = async () => {
    if (!orders || orders.length === 0) return;
    
    setIsExporting(true);
    try {
      // Helper function to format dates consistently as strings for Excel
      const formatExcelDate = (date) => {
        if (!date) return "N/A";
        const d = new Date(date);
        return d.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      const dataForExcel = orders.map(order => {
        // Business Logic: Determine if the order is finalized
        const isHandovered = ['picked_up', 'delivered'].includes(order.status);
        
        return {
          "Order Number": `#${order.order_number}`,
          "Date Created": formatExcelDate(order.created_at),
          "Customer Name": order.customer_name?.toUpperCase() || "GUEST",
          "Contact Number": order.customer_phone || "N/A",
          "Address": order.customer_address || "N/A",
          "Status": order.status?.replace('_', ' ').toUpperCase(),
          
          // HANDOVER LOGIC: Using the explicit handover_method we added
          "Handover Method": order.handover_method?.toUpperCase() || "PICKUP",
          "Delivery Fee": Number(order.delivery_fee || 0),
          "Total Revenue": Number(order.total_amount || 0),
          
          "Services": order.services?.map(s => `${s.service_name} (x${s.quantity || s.weight_kg})`).join(", "),
          "Payment Status": order.is_paid ? "PAID" : "UNPAID",
          "Payment Method": order.payment_method || "N/A",
          
          // TIMELINE LOGIC
          "Released Date": isHandovered 
            ? formatExcelDate(order.updated_at || order.picked_up_at || order.delivered_at) 
            : "STILL IN SHOP",
          // "Ready for Pickup": order.ready_at ? formatExcelDate(order.ready_at) : "PROCESSING"
        };
      });

      await exportToExcel(dataForExcel, `Lola_Fe_Laundry_Report_${new Date().toLocaleDateString()}`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleFullExport}
      disabled={isExporting || orders.length === 0}
      className={`
        flex items-center gap-2 px-3 h-9 mt-1 border rounded-xl font-medium text-micro shadow-md transition-all active:scale-95
        ${isExporting 
          ? 'bg-slate-100 text-text-dark cursor-not-allowed' 
          : 'bg-white text-text-dark hover:bg-slate-50 border-slate-200'
        }
      `}
    >
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
      ) : (
        <IconDownload className="w-4 h-4" />
      )}
      <span>{isExporting ? 'Generating Excel...' : 'Export All Orders'}</span>
    </button>
  );
}