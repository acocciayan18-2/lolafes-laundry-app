import { useState } from 'react';
import { useCleanupStore } from '../../store/settings/useCleanupStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import CleanupPINModal from './CleanupPINModal';
import { IconTrash } from '../icons';
import Button from '../ui/Button';

export default function CleanupRewardClaims() {
  const [showModal, setShowModal] = useState(false);
  const { isProcessing, executeCleanup } = useCleanupStore();
  const { logActivity } = useActivityStore();
  
  const loading = isProcessing === 'reward_logs';

  const handleConfirmedCleanup = async () => {
    await executeCleanup('reward_logs');
    logActivity('Cleared Reward History');
    setShowModal(false); 
  };

  return (
    <>
      <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-colors">
        <div>
          <h2 className="font-bold text-h3">Reward History</h2>
          <p className="text-micro font-medium text-text-dark/70 mt-1">
            Wipe the history of all claimed rewards.
          </p>
        </div>
        
        <Button
          variant="secondary"
          className="!py-2 !px-4 !rounded-xl !text-micro !font-medium"
          onClick={() => setShowModal(true)}
          disabled={loading}
        >
          <IconTrash className="w-3.5 h-3.5" />
          Clear All
        </Button>
      </div>

      <CleanupPINModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmedCleanup}
        isProcessing={loading}
        title="Wipe Reward History"
      />
    </>
  );
}