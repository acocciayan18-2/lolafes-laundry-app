import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "../../store/orders/useOrderStore"; // Import store
import { IconInfo } from "../icons";

const IconGift = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

export default function RewardRecipients() {
  const { rewardLogs, subscribeToRewards } = useOrderStore(); // Connect to store
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // 1. Start real-time subscription
  useEffect(() => {
    const unsubscribe = subscribeToRewards();
    return () => unsubscribe();
  }, [subscribeToRewards]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (infoRef.current && !infoRef.current.contains(event.target)) setShowInfo(false);
    };
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showInfo]);

  // ✨ UPDATED: Formats both Date and Time
  const formatDateTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Skip rendering if empty (as you requested)
  if (rewardLogs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 overflow-hidden relative h-full flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-text-dark/70 uppercase tracking-tight">Reward Recipients</h2>
              <div className="relative" ref={infoRef}>
                <button onClick={() => setShowInfo(!showInfo)} className={`transition-colors ${showInfo ? 'text-app-dark' : 'text-text-dark/30 hover:text-text-dark/50'}`}>
                  <IconInfo className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <div className="absolute left-[-50px] top-7 w-52 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100] animate-in fade-in zoom-in-95 duration-200"> 
                      <p className="text-[13px] text-text-dark/90 leading-relaxed">Logged history of all loyalty rewards redeemed by customers.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="mt-1 mb-3">
              <div className="inline-flex flex-col py-1.5 rounded-lg">
                <p className="text-sm-text font-medium text-amber-600 leading-none mb-1.5">Total Rewards Claimed</p>
                <p className="text-base-text font-bold text-amber-700 leading-none">{rewardLogs.length} <span className="text-sm-text font-medium">Claims</span></p>
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-transparent border border-app-dark/10 shadow-hollow shrink-0">
            <IconGift className="w-5 h-5 text-text-dark" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
          <div className="space-y-2">
            {rewardLogs.map((log) => (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={log.id} className="group relative bg-white border transition-all duration-300 rounded-xl overflow-hidden border-slate-100 hover:border-amber-200">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                <div className="p-3 pl-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-dark text-sm-text truncate">{log.customer_name}</h3>
                    <p className="text-[10px] font-bold text-text-dark/70">#{log.order_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-micro font-bold text-amber-600 uppercase tracking-tight">{log.reward_name}</p>
                   
                    <p className="text-[10px] font-medium text-text-dark/70 uppercase mt-0.5">{formatDateTime(log.date)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}