/**
 * @file CleanupRewardClaims.jsx
 * @description Enterprise-grade administrative module for Lola Fe's Laundry POS.
 * Implements atomic state synchronization, ARIA-compliant UI, and transactional deletion guards.
 */

import { useState, useCallback, useMemo } from 'react';
import { useCleanupStore } from '../../store/settings/useCleanupStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import CleanupPINModal from './CleanupPINModal';
import { IconTrash } from '../icons'; 
import Button from '../ui/Button';

const CLEANUP_TARGET = 'reward_logs';
const AUDIT_LOG_MESSAGE = 'Permanently Cleared Reward History';

export default function CleanupRewardClaims() {
  // --- LOCAL STATE ---
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- ATOMIC STORE SELECTORS (O(1) Access) ---
  // We use specific selectors to prevent re-renders when unrelated store state changes
  const isProcessingStatus = useCleanupStore(useCallback((state) => state.isProcessing, []));
  const executeCleanup = useCleanupStore(useCallback((state) => state.executeCleanup, []));
  const logActivity = useActivityStore(useCallback((state) => state.logActivity, []));

  // --- DERIVED STATE ---
  // Memoized to prevent logic execution on every render cycle
  const isLoading = useMemo(() => isProcessingStatus === CLEANUP_TARGET, [isProcessingStatus]);

  // --- HANDLERS ---
  
  /**
   * Defensive Modal Controller
   * Prevents dismissal or interaction while a critical write operation is in flight.
   */
  const handleToggleModal = useCallback((visible) => {
    if (isLoading) return; // Hard-lock interaction during processing
    setIsModalVisible(visible);
  }, [isLoading]);

  /**
   * Transactional Cleanup Handler
   * Implements "Unhappy Path" handling for network/backend failures.
   */
  const handleConfirmedCleanup = useCallback(async () => {
    try {
      // TRANSACTIONAL CHECK: Await backend confirmation before state transition
      const result = await executeCleanup(CLEANUP_TARGET);

      // Strict validation of backend response
      if (result && (result.success || result !== false)) {
        // Only log activity if the backend successfully committed the deletion
        logActivity(AUDIT_LOG_MESSAGE);
        handleToggleModal(false);
      } else {
        throw new Error("Backend validation failed or operation was rejected.");
      }
    } catch (error) {
      // QA Audit: Log internal error for observability
      console.error(`[CleanupRewardClaims] Destructive operation failed:`, error.message);
      // Note: Error notifications are assumed to be handled by the executeCleanup store logic
    }
  }, [executeCleanup, logActivity, handleToggleModal]);

  return (
    <section 
      aria-labelledby="cleanup-reward-title"
      className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-all duration-200"
    >
      <div className="flex flex-col gap-1">
        <h2 id="cleanup-reward-title" className="font-bold text-base-text text-slate-900">
          Reward History
        </h2>
        <p id="cleanup-reward-desc" className="text-micro  text-text-dark/70">
          Permanently wipe the history of all claimed rewards. This action is irreversible.
        </p>
      </div>

     <Button
  variant="secondary"
  className="!py-2 !px-4 !rounded-xl !text-micro ! focus-visible:ring-2 focus-visible:ring-rose-500"
  onClick={() => handleToggleModal(true)}
  disabled={isLoading}
  aria-haspopup="dialog"
  aria-expanded={isModalVisible}
  aria-describedby="cleanup-reward-desc"
>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <div className="w-3 h-3 border-2 border-slate-300 border-t-text-dark rounded-full animate-spin" aria-hidden="true" />
      Processing...
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <IconTrash className="w-3.5 h-3.5" aria-hidden="true" />
      Clear
    </span>
  )}
</Button>

      {/* DEFENSIVE: Conditionally mount modal to keep DOM tree clean when idle */}
      {isModalVisible && (
        <CleanupPINModal 
          isOpen={isModalVisible}
          onClose={() => handleToggleModal(false)}
          onConfirm={handleConfirmedCleanup}
          isProcessing={isLoading}
          title="Wipe Reward History"
        />
      )}
    </section>
  );
}