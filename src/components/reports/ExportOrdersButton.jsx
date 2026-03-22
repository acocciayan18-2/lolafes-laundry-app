/**
 * @file ExportOrdersButton.jsx
 * @description Enterprise-grade secure Excel export module.
 * Implements Step-Up Authentication, CSV Injection defense, and Multi-Sheet Analyst Reporting.
 */

import { useState, useCallback, useMemo } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { exportToExcel } from "../../utils/exportUtils";
import { IconDownload } from "../icons";
import ExportPin from "./ExportPin";

// ==========================================
// CONFIGURATION & SECURITY CONSTANTS
// ==========================================
const EXPORT_CONFIG = Object.freeze({
  FILENAME_PREFIX: "Lola_Fe_Laundry_Analytics",
  DEFAULT_GUEST_NAME: "GUEST",
  DATE_LOCALE: "en-US",
  DANGEROUS_CHARS: ["=", "+", "-", "@", "\t", "\r"],
});

// ==========================================
// PURE TRANSFORMATION LOGIC (Isolated & Testable)
// ==========================================

const sanitizeForExcel = (val) => {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (!trimmed) return "";
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
  const exportArray = new Array(orders.length);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) continue;

    const isHandovered = ["picked_up", "delivered"].includes(order.status);
    const isCancelled = order.status === "cancelled";
    const totalAmount = Number(order.total_amount) || 0;
    const tendered = Number(order.amount_tendered) || 0;
    
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
      "Total Amount": isCancelled ? 0 : totalAmount, // Don't count cancelled revenue in raw dump
      "Amount Tendered": actualTendered,
      "Change Due": changeDue,
      "Released Date": isHandovered 
        ? formatExcelDate(order.updated_at || order.picked_up_at || order.delivered_at) 
        : "STILL IN SHOP",
      "Audit ID": sanitizeForExcel(order.id), 
    };
  }
  return exportArray.filter(Boolean); 
};

// ✨ NEW: Generates meaningful analyst tables for a secondary sheet
const generateAnalyticsSummary = (orders) => {
  if (!Array.isArray(orders)) return [];

  let totalRevenue = 0;
  let cashRevenue = 0;
  let digitalRevenue = 0;
  
  const statusCounts = { pending: 0, processing: 0, completed: 0, picked_up: 0, delivered: 0, cancelled: 0 };
  const handoverCounts = { pickup: 0, delivery: 0 };

  for (const order of orders) {
    if (!order) continue;
    
    const statusStr = (order.status || "unknown").toLowerCase();
    const handoverStr = (order.handover_method || "pickup").toLowerCase();
    
    // Tally Statuses
    if (statusCounts[statusStr] !== undefined) statusCounts[statusStr]++;
    
    // Tally Handover
    if (handoverCounts[handoverStr] !== undefined) handoverCounts[handoverStr]++;

    // Tally Financials (Exclude Cancelled)
    if (statusStr !== 'cancelled' && order.is_paid) {
      const amt = Number(order.total_amount) || 0;
      totalRevenue += amt;
      
      if ((order.payment_method || "").toLowerCase().includes('cash')) {
        cashRevenue += amt;
      } else {
        digitalRevenue += amt;
      }
    }
  }

  // Build the vertical summary table array
  return [
    { "Metric Category": "FINANCIAL PERFORMANCE", "Metric Name": "Gross Processed Revenue", "Value": totalRevenue },
    { "Metric Category": "FINANCIAL PERFORMANCE", "Metric Name": "Total Cash Received", "Value": cashRevenue },
    { "Metric Category": "FINANCIAL PERFORMANCE", "Metric Name": "Total Digital/Transfer", "Value": digitalRevenue },
    { "Metric Category": "", "Metric Name": "", "Value": "" }, // Blank row separator
    { "Metric Category": "OPERATIONAL METRICS", "Metric Name": "Total Orders Handled", "Value": orders.length },
    { "Metric Category": "OPERATIONAL METRICS", "Metric Name": "Delivery Orders", "Value": handoverCounts.delivery },
    { "Metric Category": "OPERATIONAL METRICS", "Metric Name": "Walk-in / Pickup Orders", "Value": handoverCounts.pickup },
    { "Metric Category": "", "Metric Name": "", "Value": "" },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Pending / Received", "Value": statusCounts.pending },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Processing / Washing", "Value": statusCounts.processing },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Completed (Waiting)", "Value": statusCounts.completed },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Successfully Picked Up", "Value": statusCounts.picked_up },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Successfully Delivered", "Value": statusCounts.delivered },
    { "Metric Category": "ORDER STATUS FUNNEL", "Metric Name": "Cancelled / Voided", "Value": statusCounts.cancelled },
  ];
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ExportOrdersButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  
  const orders = useReportStore(useCallback(state => state.orders, []));
  const showNotification = useNotificationStore(useCallback(state => state.showNotification, []));

  const handleInitiateExport = useCallback(() => {
    if (!orders || orders.length === 0) {
      showNotification("No orders available to export.", "info");
      return;
    }
    setShowPinModal(true);
  }, [orders, showNotification]);

  const handlePinSuccess = useCallback(async () => {
    setShowPinModal(false);
    setIsExporting(true); 

    try {
      // 1. Generate Raw Data
      const rawData = transformOrdersForExport(orders);
      
      // 2. Generate Analyst Summary
      const summaryData = generateAnalyticsSummary(orders);
      
      // 3. Package as Multi-Sheet Object
      const workbookData = {
        "Executive Summary": summaryData, // Put summary first so it opens to this page
        "Raw Database Dump": rawData
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${EXPORT_CONFIG.FILENAME_PREFIX}_${timestamp}`;

      await exportToExcel(workbookData, fileName);
      
      showNotification("Secure analyst report generated successfully.", "success");
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
        aria-label="Export laundry analytics to Excel"
        aria-busy={isExporting}
        className={`
          flex items-center gap-2 px-3 h-9 mt-1 border rounded-xl text-micro shadow-md transition-all
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
          {isExporting ? "Processing Data..." : "Export Analytics"}
        </span>
      </button>

      <ExportPin 
        isOpen={showPinModal} 
        onClose={() => setShowPinModal(false)} 
        onSuccess={handlePinSuccess} 
        title="Full Analytics Export" 
      />
    </>
  );
}