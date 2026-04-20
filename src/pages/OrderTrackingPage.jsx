/**
 * @file OrderTrackingPage.jsx
 * @version 1.1.0
 * @description Public-facing tracking portal. Highly accessible and mobile-responsive.
 * Implements a global kill-switch to disable tracking via System Settings.
 */

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOrderTracking } from '../store/orders/useOrderTracking';
import { useSettingsStore } from '../store/settings/useSettingsStore'; // ✨ Added Settings Store
import { IconPackage, IconCheckWhite } from '../components/icons';

// ==========================================
// ⚙️ CONFIGURATION (Frozen)
// ==========================================

const STATUS_DICTIONARY = Object.freeze({
  pending: { step: 1, label: "Order Received", color: "bg-amber-500", text: "text-amber-700" },
  in_progress: { step: 2, label: "Washing & Drying", color: "bg-blue-500", text: "text-blue-700" },
  ready: { step: 3, label: "Ready for Pickup", color: "bg-emerald-500", text: "text-emerald-700" },
  picked_up: { step: 4, label: "Completed", color: "bg-slate-800", text: "text-slate-800" },
  delivered: { step: 4, label: "Completed", color: "bg-slate-800", text: "text-slate-800" }
});

const TOTAL_STEPS = 4;

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { order, isLoading, error } = useOrderTracking(orderId);
  
  // ✨ Pull the live setting from your global store
  const systemConfig = useSettingsStore((state) => state.systemConfig);

  // --- MEMOIZED DERIVED STATE ---
  const currentStatus = useMemo(() => {
    if (!order?.status) return STATUS_DICTIONARY.pending;
    return STATUS_DICTIONARY[order.status] || STATUS_DICTIONARY.pending;
  }, [order?.status]);

  // ==========================================
  // 🔒 THE KILL-SWITCH (Early Return)
  // ==========================================
  if (systemConfig?.enableOrderTracking === false) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <article className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center" role="alert">
          <div className="text-5xl mb-4" aria-hidden="true">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Tracking Disabled</h1>
          <p className="text-sm-text text-text-dark">
            Online order tracking is currently disabled by the store administration. Please contact the store directly for updates on your laundry.
          </p>
        </article>
      </main>
    );
  }

  // --- RENDERS ---

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center" aria-live="polite" aria-busy="true">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-sm-text font-bold text-text-dark/80 tracking-wide uppercase">Locating Order...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <article className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full text-center" role="alert">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl" aria-hidden="true">🕵️</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h1>
          <p className="text-sm-text text-text-dark mb-6">{error}</p>
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 pt-12 animate-fade-in">
      <article 
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        aria-labelledby="tracking-title"
      >
        {/* HEADER */}
        <header className="bg-app-dark p-6 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm" aria-hidden="true">
              <IconPackage className="w-8 h-8 text-white stroke-white" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Tracking Number</p>
            <h1 id="tracking-title" className="text-3xl font-bold text-white tracking-tight">{order.order_number}</h1>
            <p className="text-white/90 text-sm-text  mt-2">Customer: {order.customer_name}</p>
          </div>
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        </header>

        {/* PROGRESS STEPPER */}
        <div className="p-8">
          <div className="mb-8 text-center">
            <h2 className={`text-2xl font-bold ${currentStatus.text}`}>
              {currentStatus.label}
            </h2>
            <p className="text-sm-text text-text-dark/80  mt-1">
              {order.handover_method === 'delivery' && currentStatus.step === 3 
                ? "Your laundry is out for delivery." 
                : "We are taking great care of your laundry."}
            </p>
          </div>

          <div 
            className="relative flex justify-between" 
            role="progressbar" 
            aria-valuenow={currentStatus.step} 
            aria-valuemin={1} 
            aria-valuemax={TOTAL_STEPS}
            aria-label="Laundry progress status"
          >
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" aria-hidden="true" />
            
            {/* Animated Progress Line */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStatus.step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full ${currentStatus.color}`} 
              aria-hidden="true"
            />

            {/* Step Nodes */}
            {[1, 2, 3, 4].map((stepNumber) => {
              const isCompleted = stepNumber <= currentStatus.step;
              const isActive = stepNumber === currentStatus.step;

              return (
                <div key={stepNumber} className="relative z-10 flex flex-col items-center">
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: isActive ? 1.2 : 1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-colors duration-500 ${
                      isCompleted 
                        ? `${currentStatus.color} border-white shadow-md` 
                        : 'bg-slate-100 border-white text-slate-300'
                    }`}
                  >
                    {isCompleted && <IconCheckWhite className="w-4 h-4 text-white" aria-hidden="true" />}
                  </motion.div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-4 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider" aria-hidden="true">
            <span>Received</span>
            <span>Washing</span>
            <span>Ready</span>
            <span>Done</span>
          </div>
        </div>

        {/* ORDER METADATA */}
        <footer className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
           <div className="flex flex-col">
             <span className="text-[10px] uppercase font-bold text-slate-400">Total Items</span>
             <span className="text-sm-text font-bold text-text-dark">{order.services_count} Services</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase font-bold text-slate-400">Handover</span>
             <span className="text-sm-text font-bold text-text-dark capitalize">{order.handover_method}</span>
           </div>
        </footer>
      </article>

      <p className="mt-8 text-xs  text-slate-400 text-center max-w-xs">
        Powered by Lola Fe's Laundry POS. Please contact the store directly for modifications.
      </p>
    </main>
  );
}