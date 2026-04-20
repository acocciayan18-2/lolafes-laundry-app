/**
 * @file ExportOrdersButton.jsx
 * @description Enterprise-grade secure Excel export module with Profit Analytics.
 */

import { useState, useCallback, useMemo } from "react";
import { useReportStore } from "../../store/reports/useReportStore";
import { useNotificationStore } from "../../store/ui/useNotificationStore";
import { exportToExcel } from "../../utils/exportUtils";
import { IconDownload } from "../icons";
import ExportPin from "./ExportPin";

const EXPORT_CONFIG = Object.freeze({
  FILENAME_PREFIX: "Lola_Fe_Laundry_Analytics",
  DEFAULT_GUEST_NAME: "GUEST",
  DATE_LOCALE: "en-US",
  DANGEROUS_CHARS: ["=", "+", "-", "@", "\t", "\r"],
});

// ==========================================
// 🛡️ DEFENSIVE TRANSFORMATION LOGIC
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

// ==========================================
// 📊 DATA AGGREGATION ENGINES
// ==========================================

const transformOrdersForExport = (orders) => {
  if (!Array.isArray(orders)) return [];
  const exportArray = new Array(orders.length);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) continue;

    const isHandovered = ["picked_up", "delivered"].includes(order.status);
    const isCancelled = order.status === "cancelled";
    
    // Financials
    const totalAmount = Number(order.total_amount) || 0;
    const totalCost = Number(order.total_cost) || 0;
    const netProfit = Number(order.net_profit) || 0;
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
      
      // ✨ ADDED NEW PROFIT METRICS TO RAW SHEET
      "Delivery Fee": Number(order.delivery_fee) || 0,
      "Gross Amount": isCancelled ? 0 : totalAmount, 
      "Total Cost (COGS)": isCancelled ? 0 : totalCost,
      "Net Profit": isCancelled ? 0 : netProfit,
      
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

const generateAnalyticsSummary = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  let totalGrossSales = 0;
  let realizedGrossSales = 0; // Only paid
  let totalNetProfit = 0; // Only paid
  let totalCOGS = 0; // Only paid
  
  let validOrderCount = 0;
  let paidOrderCount = 0;

  let cashRevenue = 0;
  let gcashRevenue = 0;
  let bankTransferRevenue = 0;
  let unpaidRevenue = 0;

  const statusCounts = { pending: 0, processing: 0, completed: 0, picked_up: 0, delivered: 0, cancelled: 0 };
  const handoverCounts = { pickup: 0, delivery: 0 };
  let walkInCount = 0;
  const servicePopularity = {};

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!order) continue;
    
    const statusStr = (order.status || "unknown").toLowerCase();
    const handoverStr = (order.handover_method || "pickup").toLowerCase();
    
    if (statusCounts[statusStr] !== undefined) statusCounts[statusStr]++;
    if (handoverCounts[handoverStr] !== undefined) handoverCounts[handoverStr]++;
    if (order.is_walk_in) walkInCount++;

    if (statusStr !== 'cancelled') {
      validOrderCount++;
      const amt = Number(order.total_amount) || 0;
      const profit = Number(order.net_profit) || 0;
      const cost = Number(order.total_cost) || 0;
      
      totalGrossSales += amt;

      if (order.is_paid) {
        paidOrderCount++;
        realizedGrossSales += amt;
        totalNetProfit += profit;
        totalCOGS += cost;

        const method = (order.payment_method || "").toLowerCase();
        if (method.includes('cash')) cashRevenue += amt;
        else if (method.includes('gcash')) gcashRevenue += amt;
        else bankTransferRevenue += amt;
      } else {
        unpaidRevenue += amt;
      }

      if (Array.isArray(order.services)) {
        for (let j = 0; j < order.services.length; j++) {
          const sName = (order.services[j].service_name || "Unknown").toUpperCase();
          const qty = Number(order.services[j].quantity || order.services[j].weight_kg) || 1;
          servicePopularity[sName] = (servicePopularity[sName] || 0) + qty;
        }
      }
    }
  }

  // ✨ NEW PROFITABILITY CALCULATIONS
  const averageOrderValue = paidOrderCount > 0 ? (realizedGrossSales / paidOrderCount) : 0;
  const averageProfitPerOrder = paidOrderCount > 0 ? (totalNetProfit / paidOrderCount) : 0;
  const profitMargin = realizedGrossSales > 0 ? (totalNetProfit / realizedGrossSales) * 100 : 0;
  
  const completionRate = validOrderCount > 0 ? ((statusCounts.picked_up + statusCounts.delivered) / validOrderCount) * 100 : 0;

  let topService = "None";
  let topServiceQty = 0;
  for (const [name, qty] of Object.entries(servicePopularity)) {
    if (qty > topServiceQty) {
      topServiceQty = qty;
      topService = name;
    }
  }

  return [
    { "Category": "PROFITABILITY", "Metric": "Realized Net Profit (Paid Orders)", "Value": `₱${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "PROFITABILITY", "Metric": "Total Cost of Goods (COGS)", "Value": `₱${totalCOGS.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "PROFITABILITY", "Metric": "Average Profit Margin", "Value": `${profitMargin.toFixed(2)}%` },
    { "Category": "PROFITABILITY", "Metric": "Average Profit Per Order", "Value": `₱${averageProfitPerOrder.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    
    { "Category": "FINANCIAL HEALTH", "Metric": "Total Gross Sales (Includes Unpaid)", "Value": `₱${totalGrossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "FINANCIAL HEALTH", "Metric": "Realized Sales (Paid Only)", "Value": `₱${realizedGrossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "FINANCIAL HEALTH", "Metric": "Average Order Value (AOV)", "Value": `₱${averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "FINANCIAL HEALTH", "Metric": "Pending / Unpaid Receivables", "Value": `₱${unpaidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    
    { "Category": "CASH FLOW (PAID)", "Metric": "Total Cash Collected", "Value": `₱${cashRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "CASH FLOW (PAID)", "Metric": "Total GCash Collected", "Value": `₱${gcashRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { "Category": "CASH FLOW (PAID)", "Metric": "Total Bank Transfer Collected", "Value": `₱${bankTransferRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    
    { "Category": "BUSINESS INSIGHTS", "Metric": "Total Valid Orders", "Value": validOrderCount },
    { "Category": "BUSINESS INSIGHTS", "Metric": "Most Popular Service", "Value": `${topService} (${topServiceQty} units/kg)` },
    { "Category": "BUSINESS INSIGHTS", "Metric": "Order Completion Rate", "Value": `${completionRate.toFixed(1)}%` },
    { "Category": "BUSINESS INSIGHTS", "Metric": "Anonymous Walk-In Orders", "Value": walkInCount },
    
    { "Category": "LOGISTICS & HANDOVER", "Metric": "Standard Pickups", "Value": handoverCounts.pickup },
    { "Category": "LOGISTICS & HANDOVER", "Metric": "Deliveries", "Value": handoverCounts.delivery },
    
    { "Category": "ORDER PIPELINE", "Metric": "1. Pending / Just Received", "Value": statusCounts.pending },
    { "Category": "ORDER PIPELINE", "Metric": "2. Processing / Washing", "Value": statusCounts.processing },
    { "Category": "ORDER PIPELINE", "Metric": "3. Completed (Waiting in Shop)", "Value": statusCounts.completed },
    { "Category": "ORDER PIPELINE", "Metric": "4. Picked Up (Successful)", "Value": statusCounts.picked_up },
    { "Category": "ORDER PIPELINE", "Metric": "5. Delivered (Successful)", "Value": statusCounts.delivered },
    { "Category": "ORDER PIPELINE", "Metric": "Cancelled / Voided", "Value": statusCounts.cancelled },
  ];
};

export default function ExportOrdersButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  
  const orders = useReportStore((state) => state.orders);
  const showNotification = useNotificationStore((state) => state.showNotification);

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
      const rawData = transformOrdersForExport(orders);
      const summaryData = generateAnalyticsSummary(orders);
      
      const workbookData = {
        "Executive Summary": summaryData, 
        "Raw Database Dump": rawData 
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${EXPORT_CONFIG.FILENAME_PREFIX}_${timestamp}`;

      await exportToExcel(workbookData, fileName);
      
      showNotification("Secure analyst report generated successfully.", "success");
    } catch (error) {
      console.error("[Export Service Error]:", error);
      showNotification("Failed to generate report. Please try again.", "error");
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
          flex items-center gap-2 px-3 h-9 mt-1 border rounded-xl text-micro shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50
          ${isDisabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-70 border-slate-200"
            : "bg-white text-text-dark hover:bg-slate-50 border-slate-200 active:scale-95"
          }
        `}
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <IconDownload className="w-4 h-4" aria-hidden="true" />
        )}
        <span className="whitespace-nowrap">
          {isExporting ? "Processing Data..." : "Export Orders"}
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