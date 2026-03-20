/**
 * @file ExportOrdersButton.jsx
 * @description Enterprise-grade secure Excel export module.
 * Implements Step-Up Authentication (PIN), CSV Injection defense, and non-blocking data parsing.
 */

import  { useState, useCallback, useMemo } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { exportToExcel } from "../../utils/exportUtils";
import { IconDownload } from "../icons";
import ExportPin from "./ExportPin";

// ==========================================
// CONFIGURATION & SECURITY CONSTANTS
// ==========================================
const EXPORT_CONFIG = Object.freeze({
  FILENAME_PREFIX: "Lola_Fe_Laundry_Report",
  DEFAULT_GUEST_NAME: "GUEST",
  DATE_LOCALE: "en-US",
  // 🛡️ SECURITY: Characters that can trigger malicious payload execution in Excel
  DANGEROUS_CHARS: ["=", "+", "-", "@", "\t", "\r"],
});

// ==========================================
// PURE TRANSFORMATION LOGIC (Isolated & Testable)
// ==========================================

/**
 * @description Sanitizes strings to prevent Excel Formula Injection (CSV Injection).
 * Strips or escapes leading characters that Excel interprets as functions.
 */
const sanitizeForExcel = (val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  
  if (!trimmed) return "";

  // 🛡️ SECURITY: If the string starts with a dangerous character, prefix it with a single quote.
  // This forces Excel to treat the cell strictly as plain text, disabling formula execution.
  if (EXPORT_CONFIG.DANGEROUS_CHARS.some((char) => trimmed.startsWith(char))) {
    return `'${trimmed}`; 
  }
  return trimmed;
};

const formatExcelDate = (dateSource) => {
  if (!dateSource) return "N/A";
  try {
    const d = dateSource?.toDate ? dateSource.toDate() : new Date(dateSource);
    if (isNaN(d.getTime())) return "Invalid Date";

    return d.toLocaleString(EXPORT_CONFIG.DATE_LOCALE, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch (err) {
    return "Error Formatting Date";
  }
};

const transformOrdersForExport = (orders) => {
  if (!Array.isArray(orders)) return [];

  // ⚡ PERFORMANCE: Use standard `for` loop instead of `.map` for massive arrays
  const exportArray = new Array(orders.length);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) continue;

    const isHandovered = ["picked_up", "delivered"].includes(order.status);
    const totalAmount = Number(order.total_amount) || 0;
    const tendered = Number(order.amount_tendered) || 0;
    
    // Logic: If order is paid but amount_tendered is missing (legacy DB entries), 
    // assume exact amount was paid to maintain financial balance.
    const actualTendered = (order.is_paid && tendered === 0) ? totalAmount : tendered;
    const changeDue = order.is_paid ? Math.max(0, actualTendered - totalAmount) : 0;

    let servicesString = "No Services";
    if (Array.isArray(order.services)) {
      const svcArr = new Array(order.services.length);
      for (let j = 0; j < order.services.length; j++) {
        const s = order.services[j];
        svcArr[j] = `${sanitizeForExcel(s.service_name)} (x${Number(s.quantity || s.weight_kg) || 1})`;
      }
      servicesString = svcArr.join(", ");
    }

    exportArray[i] = {
      "Order Number": sanitizeForExcel(`#${order.order_number || "N/A"}`),
      "Date Created": formatExcelDate(order.created_at),
      "Customer Name": sanitizeForExcel(order.customer_name?.toUpperCase() || EXPORT_CONFIG.DEFAULT_GUEST_NAME),
      "Contact Number": sanitizeForExcel(order.customer_phone || "N/A"),
      "Address": sanitizeForExcel(order.customer_address || "N/A"),
      "Status": sanitizeForExcel(order.status || "UNKNOWN").replace("_", " ").toUpperCase(),
      "Handover Method": sanitizeForExcel(order.handover_method || "PICKUP").toUpperCase(),
      "Services": sanitizeForExcel(servicesString),
      "Payment Status": order.is_paid ? "PAID" : "UNPAID",
      "Payment Method": sanitizeForExcel(order.payment_method || "N/A").toUpperCase(),
      "Delivery Fee": Number(order.delivery_fee) || 0,
      "Total Amount": totalAmount,
      "Amount Tendered": actualTendered,
      "Change Due": changeDue,
      "Released Date": isHandovered 
        ? formatExcelDate(order.updated_at || order.picked_up_at || order.delivered_at) 
        : "STILL IN SHOP",
      "Audit ID": sanitizeForExcel(order.id), 
    };
  }

  // Filter out any empty slots if null objects were skipped
  return exportArray.filter(Boolean); 
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ExportOrdersButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false); // ✨ Security Gate State
  
  // ⚡ SELECTOR OPTIMIZATION: Only grab the exact data needed
  const orders = useReportStore(useCallback(state => state.orders, []));
  const showNotification = useNotificationStore(useCallback(state => state.showNotification, []));

  // Step 1: User clicks the export button
  const handleInitiateExport = useCallback(() => {
    if (!orders || orders.length === 0) {
      showNotification("No orders available to export.", "info");
      return;
    }
    // Trigger the Security Gate
    setShowPinModal(true);
  }, [orders, showNotification]);

  // Step 2: User successfully passes the PIN check
  const handlePinSuccess = useCallback(async () => {
    setShowPinModal(false); // Close gate
    setIsExporting(true);   // Start processing UI

    try {
      // Execute transformation synchronously
      const dataForExcel = transformOrdersForExport(orders);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${EXPORT_CONFIG.FILENAME_PREFIX}_${timestamp}`;

      // Trigger standard file download logic
      await exportToExcel(dataForExcel, fileName);
      
      showNotification("Secure report generated successfully.", "success");
    } catch (error) {
      console.error("[Export Service Error]:", error);
      showNotification("Failed to generate report. Please contact system admin.", "error");
    } finally {
      setIsExporting(false);
    }
  }, [orders, showNotification]);

  const isDisabled = useMemo(() => isExporting || !orders || orders.length === 0, [isExporting, orders]);

  return (
    <>
      <button
        onClick={handleInitiateExport}
        disabled={isDisabled}
        aria-label="Export laundry orders to Excel"
        aria-busy={isExporting}
        className={`
          flex items-center gap-2 px-3 h-9 mt-1 border rounded-xl font-medium text-micro shadow-md transition-all
          ${isDisabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 border-slate-200"
            : "bg-white text-text-dark hover:bg-slate-50 border-slate-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          }
        `}
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <IconDownload className="w-4 h-4" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">
          {isExporting ? "Processing Data..." : "Export All Orders"}
        </span>
      </button>

      {/* ✨ SECURITY GATE: Step-Up Authentication Modal */}
     <ExportPin 
        isOpen={showPinModal} 
        onClose={() => setShowPinModal(false)} 
        onSuccess={handlePinSuccess} 
        title="Full Database Export" 
      />
    </>
  );
}