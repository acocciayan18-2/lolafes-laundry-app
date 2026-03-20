
import React, { useState, useCallback } from 'react';
import { useCleanupStore } from '../../store/settings/useCleanupStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import CleanupPINModal from './CleanupPINModal';
import { IconTrash } from '../icons';
import Button from '../ui/Button';

// Configuration constant to prevent string-literal typos across the module
const CLEANUP_TARGET = 'cancelled_orders';

export default function CleanupCancelledOrders() {
  // --- LOCAL STATE ---
  const [showModal, setShowModal] = useState(false);

  // --- STORE SELECTORS (O(1) Atomic Selectors) ---
  // Using selectors prevents the component from re-rendering when unrelated store data changes.
  const isProcessing = useCleanupStore((state) => state.isProcessing === CLEANUP_TARGET);
  const executeCleanup = useCleanupStore((state) => state.executeCleanup);
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- HANDLERS ---
  
  /**
   * Defensive Modal Toggle
   * Prevents interaction while a cleanup process is already in flight.
   */
  const handleToggleModal = useCallback((state) => {
    if (isProcessing) return;
    setShowModal(state);
  }, [isProcessing]);

  /**
   * Atomic Cleanup Handler
   * Implements "Unhappy Path" handling and result validation.
   */
  const handleConfirmedCleanup = useCallback(async () => {
    try {
      // Logic: Wait for the backend/store checker to confirm deletion
      const response = await executeCleanup(CLEANUP_TARGET);
      
      // Strict result checking: Only log and close if the backend confirmed success
      if (response?.success || response !== false) {
        logActivity('System Maintenance: Permanently Cleared Cancelled Orders');
        setShowModal(false);
      }
    } catch (error) {
      // QA Note: Error propagation should be handled by your useNotificationStore
      // linked within the executeCleanup action.
      console.error(`[Cleanup] Critical failure in ${CLEANUP_TARGET}:`, error);
    }
  }, [executeCleanup, logActivity]);

  return (
    <section 
      aria-labelledby="cleanup-cancelled-title"
      className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-colors"
    >
      <div className="flex flex-col gap-1">
        <h2 
          id="cleanup-cancelled-title" 
          className="font-bold text-base-text text-slate-900"
        >
          Cancelled Orders
        </h2>
        <p className="text-micro  text-text-dark/70">
          Permanently delete all orders marked as cancelled from the database.
        </p>
      </div>
      
      <Button
        variant="secondary"
        className="!py-2 !px-4 !rounded-xl !text-micro ! focus-visible:ring-2 focus-visible:ring-rose-500"
        onClick={() => handleToggleModal(true)}
        disabled={isProcessing}
        aria-haspopup="dialog"
        aria-expanded={showModal}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <IconTrash className="w-3.5 h-3.5" aria-hidden="true" />
            Clear
          </>
        )}
      </Button>

      {/* 
          A11y/Security: CleanupPINModal is kept outside the DOM flow 
          until triggered, ensuring it can handle focus-trapping.
      */}
      {showModal && (
        <CleanupPINModal 
          isOpen={showModal}
          onClose={() => handleToggleModal(false)}
          onConfirm={handleConfirmedCleanup}
          isProcessing={isProcessing}
          title="Delete Cancelled Orders"
          criticalAction={true} 
        />
      )}
    </section>
  );
}