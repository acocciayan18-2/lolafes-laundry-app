/**
 * @file CleanupActivityLogs.jsx
 * @description Enterprise-grade log maintenance module for Lola Fe's Laundry.
 * Implements defensive action-locking, A11y standards, and atomic cleanup execution.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCleanupStore } from '../../store/settings/useCleanupStore';
// ✨ ADDED: Import the activity store to create the new log
import { useActivityStore } from '../../store/activities/useActivityStore';
import CleanupPINModal from './CleanupPINModal';
import { IconTrash } from '../icons';
import Button from '../ui/Button';

export default function CleanupActivityLogs() {
  // --- LOCAL STATE ---
  const [showModal, setShowModal] = useState(false);

  // --- STORE SELECTORS (Optimized for fine-grained re-renders) ---
  const isProcessingStatus = useCleanupStore((state) => state.isProcessing);
  const executeCleanup = useCleanupStore((state) => state.executeCleanup);
  
  // ✨ ADDED: Grab the logActivity function
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- MEMOIZED DERIVATIONS ---
  const isLoading = useMemo(() => isProcessingStatus === 'activities', [isProcessingStatus]);

  // --- HANDLERS ---
  const handleOpenModal = useCallback(() => {
    if (!isLoading) {
      setShowModal(true);
    }
  }, [isLoading]);

  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setShowModal(false);
    }
  }, [isLoading]);

  const handleConfirmedCleanup = useCallback(async () => {
    try {
      const result = await executeCleanup('activities');
      
      if (result?.success || result !== false) {
        const today = new Date();
        const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
        
        // ✨ CREATE THE "TOMBSTONE" LOG
        logActivity(`Cleared all activity logs on ${formattedDate}`);
        
        setShowModal(false);
      }
    } catch (error) {
      console.error("[CleanupAction] Integrity Error:", error.message);
    }
  }, [executeCleanup, logActivity]);

  return (
    <section 
      aria-labelledby="activity-logs-title"
      className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <h2 
          id="activity-logs-title" 
          className="font-bold text-base-text text-slate-900"
        >
          Activity Logs
        </h2>
        <p className="text-micro  text-text-dark/70">
          Permanently clear the master log of all system activity.
        </p>
      </div>

      <Button
        variant="secondary"
        className="!py-2 !px-4 !rounded-xl !text-micro ! focus-visible:ring-2 focus-visible:ring-rose-500"
        onClick={handleOpenModal}
        disabled={isLoading}
        aria-haspopup="dialog"
        aria-expanded={showModal}
      >
        <IconTrash 
          className={`w-3.5 h-3.5 ${isLoading ? 'animate-pulse' : ''}`} 
          aria-hidden="true" 
        />
        <span>{isLoading ? "Purging..." : "Clear"}</span>
      </Button>

      <CleanupPINModal 
        isOpen={showModal}
        onClose={handleCloseModal}
        onConfirm={handleConfirmedCleanup}
        isProcessing={isLoading}
        title="Delete Activity Logs"
        criticalAction={true} 
      />
    </section>
  );
}