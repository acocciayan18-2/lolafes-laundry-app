import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePaymentSettingsStore } from '../../store/settings/usePaymentSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import { AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import DeletePaymentModal from './DeletePaymentModal';
import PaymentMethodItem from './PaymentMethodItem';

const MAX_NAME_LENGTH = 20;
const NAME_REGEX = /^[a-zA-Z0-9 ]+$/;

// 🛡️ PERFORMANCE: Static reference for empty arrays.
// This ensures 'methods' always points to the same memory address when empty,
// preventing hooks from re-triggering unnecessarily.
const EMPTY_METHODS = Object.freeze([]);

export default function PaymentSettings() {
  // --- ATOMIC STORE SELECTORS ---
  // We move the fallback logic inside the selector or use the static constant
  const methods = usePaymentSettingsStore((state) => state.methods || EMPTY_METHODS);
  const isSyncing = usePaymentSettingsStore((state) => state.isLoading);
  const fetchPaymentMethods = usePaymentSettingsStore((state) => state.fetchPaymentMethods);
  const addMethod = usePaymentSettingsStore((state) => state.addMethod);
  const deleteMethod = usePaymentSettingsStore((state) => state.deleteMethod);
  const toggleMethodStatus = usePaymentSettingsStore((state) => state.toggleMethodStatus);
  const setDefaultMethod = usePaymentSettingsStore((state) => state.setDefaultMethod);
  
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity);

  // --- LOCAL STATE ---
  const [newMethodName, setNewMethodName] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);

  // --- SUBSCRIPTIONS ---
  useEffect(() => {
    const unsubscribe = fetchPaymentMethods();
    return () => { 
      if (typeof unsubscribe === 'function') unsubscribe(); 
    };
  }, [fetchPaymentMethods]);

  // --- MEMOIZED DATA ---
  const sortedMethods = useMemo(() => {
    // methods now has a stable reference, so this only runs when content actually changes
    return [...methods].sort((a, b) => (b.isDefault === a.isDefault ? 0 : b.isDefault ? 1 : -1));
  }, [methods]);

  // --- HANDLERS ---
  const handleCloseModal = useCallback(() => {
    if (!isActionPending) {
      setMethodToDelete(null);
    }
  }, [isActionPending]);

  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    const sanitizedName = newMethodName.trim();

    if (!sanitizedName || isActionPending) return;
    
    if (sanitizedName.length > MAX_NAME_LENGTH) {
      return showNotification(`Name too long (Max ${MAX_NAME_LENGTH})`, "error");
    }
    if (!NAME_REGEX.test(sanitizedName)) {
      return showNotification("Alphanumeric characters only", "error");
    }
    
    const isDuplicate = methods.some(m => 
      m.name.toLowerCase().replace(/\s/g, '') === sanitizedName.toLowerCase().replace(/\s/g, '')
    );

    if (isDuplicate) {
      return showNotification(`"${sanitizedName}" already exists.`, "info");
    }

    setIsActionPending(true);
    try {
      const result = await addMethod(sanitizedName);
      if (result !== false && result?.success !== false) {
        showNotification(`"${sanitizedName}" added successfully`, "success");
        logActivity(` Added payment method "${sanitizedName}"`);
        setNewMethodName('');
      }
    } catch (err) {
      showNotification("Operation failed.", "error");
    } finally {
      setIsActionPending(false);
    }
  }, [newMethodName, isActionPending, methods, addMethod, showNotification, logActivity]);

  const handleToggle = useCallback(async (id, name, currentStatus) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      const nextStatus = !currentStatus;
      const result = await toggleMethodStatus(id, nextStatus);
      if (result !== false && result?.success !== false) {
        showNotification(`${name} ${nextStatus ? 'enabled' : 'disabled'}`, "info");
        logActivity(` Updated ${name} status`);
      }
    } catch (err) {
      showNotification("Update failed.", "error");
    } finally {
      setIsActionPending(false);
    }
  }, [isActionPending, toggleMethodStatus, showNotification, logActivity]);

  const handleSetDefault = useCallback(async (id, name) => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      const result = await setDefaultMethod(id);
      if (result !== false && result?.success !== false) {
        showNotification(`${name} set as default`, "success");
        logActivity(` Set ${name} as default method`);
      }
    } catch (err) {
      showNotification("Update failed.", "error");
    } finally {
      setIsActionPending(false);
    }
  }, [isActionPending, setDefaultMethod, showNotification, logActivity]);

  const handleConfirmDelete = useCallback(async () => {
    if (!methodToDelete || isActionPending) return;
    setIsActionPending(true);
    try {
      const result = await deleteMethod(methodToDelete.id);
      if (result !== false && result?.success !== false) {
        showNotification(`${methodToDelete.name} removed`, "success");
        logActivity(` Deleted method "${methodToDelete.name}"`);
        setMethodToDelete(null); 
      }
    } catch (err) {
      showNotification("Deletion failed.", "error");
    } finally {
      setIsActionPending(false);
    }
  }, [methodToDelete, isActionPending, deleteMethod, showNotification, logActivity]);

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6" role="region" aria-label="Payment Settings">
      <header className="flex items-center gap-3">
        <h2 className="font-bold text-base-text text-app-dark">Payment Methods</h2>
      </header>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="method-name" className="absolute -top-2 left-5 bg-white px-2 text-micro  text-text-dark/70">
            Method Name
          </label>
          <input
            id="method-name"
            type="text"
            autoComplete="off"
            placeholder="e.g. GCash"
            value={newMethodName}
            disabled={isActionPending}
            onChange={(e) => setNewMethodName(e.target.value)}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm-text  focus:border-app-dark outline-none transition-all disabled:opacity-50"
          />
        </div>
        <Button 
          type="submit" 
          variant="primary"
          disabled={!newMethodName.trim() || isActionPending}
          isLoading={isActionPending}
          className="px-8 !font-normal rounded-2xl"
        >
          Add
        </Button>
      </form>

      <div className="space-y-4">
        <label className="text-nano font-bold text-slate-400 ml-1 uppercase tracking-widest">
          Active Methods ({sortedMethods.length})
        </label>
        
        <div className="space-y-2">
          {isSyncing && sortedMethods.length === 0 ? (
            <div className="py-10 text-center text-slate-400 animate-pulse">Syncing...</div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {sortedMethods.map((method) => (
                <PaymentMethodItem
                  key={method.id}
                  method={method}
                  isDisabled={isActionPending}
                  onToggle={handleToggle}
                  onSetDefault={handleSetDefault}
                  onDelete={setMethodToDelete}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <DeletePaymentModal
        isOpen={!!methodToDelete}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        itemName={methodToDelete?.name}
        isLoading={isActionPending}
      />
    </div>
  );
}