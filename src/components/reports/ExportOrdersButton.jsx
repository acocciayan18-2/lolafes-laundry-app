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
      // Flatten the order objects for Excel compatibility
      const dataForExcel = orders.map(order => ({
        "Order Number": `#${order.order_number}`,
        "Date": new Date(order.created_at).toLocaleDateString(),
        "Customer Name": order.customer_name?.toUpperCase(),
        "Phone": order.customer_phone || "N/A",
        "Address": order.customer_address || "N/A",
        "Status": order.status.replace('_', ' ').toUpperCase(),
        "Services": order.services?.map(s => s.service_name).join(", "),
        "Total Amount": Number(order.total_amount || 0),
        "Payment Status": order.is_paid ? "PAID" : "UNPAID",
        "Payment Method": order.payment_method || "N/A",
        
      }));

      await exportToExcel(dataForExcel, "Lola_Fe's_Laundry_Reports");
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
          : 'text-text-dark  active:scale-95'
        }
      `}
    >
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
      ) : (
        <IconDownload className="w-4 h-4" />
      )}
      <span>{isExporting ? 'Exporting...' : 'Export All Orders'}</span>
    </button>
  );
}