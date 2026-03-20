/**
 * @file RewardRecipients.jsx
 * @description Dashboard widget displaying loyalty reward claims.
 * Implements O(1) Memory Mapping to hydrate lightweight logs with full order details.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore"; 
import { useReportStore } from "../../store/reports/useReportStore"; 
import { 
  IconClose, IconPhone, IconHash, IconEyeOpen, IconEyeClosed 
} from "../icons";

// ==========================================
// UTILITY ICONS & FORMATTERS
// ==========================================
const IconGift = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const getSafeDate = (ts) => {
  if (!ts) return new Date();
  if (typeof ts === 'number') return new Date(ts);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts.toDate === 'function') return ts.toDate();
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const maskPhone = (phone) => typeof phone === 'string' ? phone.replace(/.(?=.{4})/g, '•') : "N/A";
const maskAddress = (address) => address ? "••••• Hidden for privacy" : "N/A";

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function RewardRecipients() {
  const subscribeToRewards = useOrderStore(useCallback(state => state.subscribeToRewards, []));
  const rewardLogs = useOrderStore(useCallback(state => state.rewardLogs, []));
  
  // Cross-Reference Store
  const orders = useReportStore(useCallback(state => state.orders, []));
  
  const [selectedLog, setSelectedLog] = useState(null);
  const [isPiiRevealed, setIsPiiRevealed] = useState(false);

  // 1. Start real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToRewards();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribeToRewards]);

  // Reset PII reveal when selection changes
  useEffect(() => {
    setIsPiiRevealed(false);
  }, [selectedLog?.id]);

  // Modal Lifecycle & Esc Guard
  useEffect(() => {
    if (!selectedLog || typeof document === 'undefined') return;

    const previousFocus = document.activeElement;

    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };

    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden'; 

    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEsc);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [selectedLog]);

  const formatDateTime = useCallback((date) => {
    const safeDate = getSafeDate(date);
    return safeDate.toLocaleString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }, []);

  // ✨ PERFORMANCE: O(1) Memory Map Hydration
  const enrichedLogs = useMemo(() => {
    if (!Array.isArray(rewardLogs) || rewardLogs.length === 0) return [];

    // 1. Build a fast lookup dictionary from the main orders array
    const ordersMap = new Map();
    if (Array.isArray(orders)) {
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (o && o.order_number) ordersMap.set(o.order_number, o);
      }
    }

    // 2. Map through logs and inject missing data from the master order
    return rewardLogs.map(log => {
      const matchedOrder = ordersMap.get(log.order_number);
      
      // Fallback logic to grab the exact reward service name from the order array
      let fallbackRewardName = "Reward";
      if (matchedOrder && Array.isArray(matchedOrder.services)) {
        const rewardService = matchedOrder.services.find(s => s.is_reward === true);
        if (rewardService) fallbackRewardName = rewardService.service_name;
      }

      return {
        ...log, // Keep the original log data, but overwrite if missing:
        customer_phone: log.customer_phone || matchedOrder?.customer_phone || null,
        customer_address: log.customer_address || matchedOrder?.customer_address || null,
        loyalty_points_to_deduct: Number(log.loyalty_points_to_deduct) || Number(matchedOrder?.loyalty_points_to_deduct) || 0,
        reward_name: log.reward_name || fallbackRewardName
      };
    });
  }, [rewardLogs, orders]);

  if (enrichedLogs.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border flex flex-col max-h-[450px] overflow-hidden relative mt-4">
      
      {/* --- WIDGET HEADER --- */}
      <div className="px-5 py-3.5 border-b border-amber-50 flex justify-between items-center">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border rounded-lg text-text-dark shadow-hollow">
            <IconGift className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base-text font-bold text-text-dark">Reward Recipients</h2>
            <p className="text-micro font-normal text-amber-600">Loyalty Claims History</p>
          </div>
        </div>
        <span 
          className="bg-app-dark/5 text-text-dark text-micro font-medium px-2 py-0.5 rounded-full" 
          aria-label={`${enrichedLogs.length} rewards claimed`}
        >
          {enrichedLogs.length}
        </span>
      </div>

      {/* --- WIDGET LIST --- */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {enrichedLogs.map((log) => {
              if (!log || !log.id) return null;
              
              return (
                <motion.button
                  layout
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  aria-label={`View reward details for ${log.customer_name}`}
                  className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-amber-100/60 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-300 group mb-1 p-3.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 transition-all group-hover:w-2" aria-hidden="true" />

                  <div className="flex items-start justify-between mb-2 pl-1.5">
                    <div className="min-w-0 pr-3">
                      <h3 className="text-sm-text font-bold text-text-dark truncate">
                        {log.customer_name || "null"}
                      </h3>
                    </div>
                    <div className="shrink-0 flex items-center px-1">
                      <span className="text-micro font-medium pb-1 text-amber-600 truncate max-w-[120px]">
                        {log.reward_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pl-1.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-micro font-medium text-text-dark/70">
                        <span>#{log.order_number || "---"}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-micro font-medium text-text-dark">
                        {log.loyalty_points_to_deduct > 0 ? `-${log.loyalty_points_to_deduct} pts` : "Free"}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* --- POPUP CARD (MODAL) --- */}
      <AnimatePresence>
        {selectedLog && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-customer-name"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] relative flex flex-col shadow-2xl"
            >
              
              {/* Modal Header */}
              <div className="bg-amber-50/50 pt-4 pb-3 px-3 text-center relative border-b border-amber-100/50">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="absolute top-4 right-4 p-2 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-lg transition-colors hover:bg-amber-100/50"
                  aria-label="Close modal"
                >
                  <IconClose className="w-5 h-5 text-text-dark/70" />
                </button>

                <div className="text-amber-500 flex items-center justify-center mx-auto mb-2" aria-hidden="true">
                  <IconGift className="w-8 h-8" />
                </div>
                <h3 id="modal-customer-name" className="text-h3 font-bold text-text-dark leading-tight truncate px-8">
                  {selectedLog.customer_name || "Unknown"}
                </h3>
                <p className="text-micro font-medium text-amber-600 mt-1">
                  Reward Claimed
                </p>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
                
                {/* PII Block (Customer Info) */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100/80 relative group">
                  <button 
                    onClick={() => setIsPiiRevealed(!isPiiRevealed)}
                    className="absolute top-2 right-2 p-1.5 text-text-dark/40 hover:text-app-dark transition-colors focus:outline-none rounded-lg hover:bg-slate-200"
                    aria-label={isPiiRevealed ? "Hide Customer Information" : "Reveal Customer Information"}
                    aria-pressed={isPiiRevealed}
                  >
                    {isPiiRevealed ? <IconEyeClosed className="w-4 h-4" aria-hidden="true"/> : <IconEyeOpen className="w-4 h-4" aria-hidden="true"/>}
                  </button>

                  <div className="flex justify-between items-center pr-8">
                    <div className="flex items-center gap-2.5">
                      <IconPhone className="w-4 h-4 text-text-dark/70" aria-hidden="true" />
                      <span className="text-sm-text font-medium text-text-dark/70">Phone</span>
                    </div>
                    <span className="text-sm-text font-medium text-text-dark">
                      {isPiiRevealed ? (selectedLog.customer_phone || "N/A") : maskPhone(selectedLog.customer_phone)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start pr-8">
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <div className="w-4 flex justify-center"><IconHash className="w-3.5 h-3.5 text-text-dark/70" aria-hidden="true" /></div>
                      <span className="text-sm-text font-medium text-text-dark/70">Address</span>
                    </div>
                    <span className="text-sm-text font-medium text-text-dark text-right pl-2 leading-snug">
                      {isPiiRevealed ? (selectedLog.customer_address || "N/A") : maskAddress(selectedLog.customer_address)}
                    </span>
                  </div>
                </div>

                {/* Reference Details */}
                <div className="px-2 space-y-3">
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm-text font-medium text-text-dark/70">Order No.</span>
                    <span className="text-sm-text font-medium text-text-dark">#{selectedLog.order_number || "---"}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm-text font-medium text-text-dark/70 mt-0.5">Date Claimed</span>
                    <span className="text-sm-text font-medium text-text-dark text-right max-w-[170px] leading-snug">
                      {formatDateTime(selectedLog.date || selectedLog.created_at)}
                    </span>
                  </div>
                </div>

                {/* Reward Receipt Block */}
                <div className="mt-3 p-4 rounded-xl border transition-colors bg-amber-50/40 border-amber-200/60">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-amber-200/60">
                    <span className="text-sm font-medium text-slate-500">Reward Item</span>
                    <span className="text-sm-text font-bold text-slate-800 text-right max-w-[200px] truncate">
                      {selectedLog.reward_name || "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Points Deducted</span>
                    <div className="flex items-center gap-1.5">
                     
                      <span className="text-micro font-bold tracking-wider text-amber-600 uppercase">
                        {selectedLog.loyalty_points_to_deduct > 0 ? `-${selectedLog.loyalty_points_to_deduct} PTS` : "null"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}