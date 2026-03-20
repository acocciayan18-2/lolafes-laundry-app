/**
 * @file CleanupActivityLogs.jsx
 * @description Enterprise-grade log maintenance module for Lola Fe's Laundry.
 * Implements defensive action-locking, A11y standards, and atomic cleanup execution.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCleanupStore } from '../../store/settings/useCleanupStore';
import CleanupPINModal from './CleanupPINModal';
import { IconTrash } from '../icons';
import Button from '../ui/Button';

export default function CleanupActivityLogs() {
  // --- LOCAL STATE ---
  const [showModal, setShowModal] = useState(false);

  // --- STORE SELECTORS (Optimized for fine-grained re-renders) ---
  const isProcessingStatus = useCleanupStore((state) => state.isProcessing);
  const executeCleanup = useCleanupStore((state) => state.executeCleanup);

  // --- MEMOIZED DERIVATIONS ---
  // Ensure strict boolean typing to prevent truthy/falsy leaks in UI props
  const isLoading = useMemo(() => isProcessingStatus === 'activities', [isProcessingStatus]);

  // --- HANDLERS ---
  const handleOpenModal = useCallback(() => {
    if (!isLoading) {
      setShowModal(true);
    }
  }, [isLoading]);

  const handleCloseModal = useCallback(() => {
    // Defensive: Prevent closing during a critical write operation to maintain UI consistency
    if (!isLoading) {
      setShowModal(false);
    }
  }, [isLoading]);

  const handleConfirmedCleanup = useCallback(async () => {
    try {
    
      const result = await executeCleanup('activities');
      
      if (result?.success || result !== false) {
        setShowModal(false);
      }
    } catch (error) {
      // Unhappy Path: Logic handled by useNotificationStore (expected within executeCleanup)
      console.error("[CleanupAction] Integrity Error:", error.message);
    }
  }, [executeCleanup]);

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
        <p className="text-micro font-medium text-text-dark/70">
          Permanently clear the master log of all system activity.
        </p>
      </div>

      <Button
        variant="secondary"
        className="!py-2 !px-4 !rounded-xl !text-micro !font-medium focus-visible:ring-2 focus-visible:ring-rose-500"
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
        criticalAction={true} // Hint for the modal to use "Danger" styling
      />
    </section>
  );
}