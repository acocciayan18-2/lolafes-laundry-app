import { useState, useEffect } from 'react';
import { usePaymentSettingsStore } from '../../store/settings/usePaymentSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconTrash, IconStar } from '../icons';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

export default function PaymentSettings() {
  const methods = usePaymentSettingsStore((state) => state.methods) || [];
  const { 
    fetchPaymentMethods, 
    addMethod, 
    deleteMethod, 
    toggleMethodStatus, 
    setDefaultMethod, 
    isLoading 
  } = usePaymentSettingsStore();
  
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { logActivity } = useActivityStore();

  const [newMethodName, setNewMethodName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const unsubscribe = fetchPaymentMethods();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [fetchPaymentMethods]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newMethodName.trim() || isAdding) return;
    setIsAdding(true);

    const success = await addMethod(newMethodName);
    if (success) {
      showNotification(`"${newMethodName}" added to payment options`, "success");
      logActivity(`Settings: Added payment method "${newMethodName}"`);
      setNewMethodName('');
    } else {
      showNotification("Failed to add payment method", "error");
    }
    setIsAdding(false);
  };

  const handleToggle = async (id, name, currentStatus) => {
    const nextStatus = !currentStatus;
    const success = await toggleMethodStatus(id, nextStatus);
    
    if (success) {
      const statusText = nextStatus ? 'enabled' : 'disabled';
      showNotification(`${name} is now ${statusText}`, nextStatus ? "success" : "info");
      logActivity(`Settings: ${name} payment method ${statusText}`);
    }
  };

  const handleSetDefault = async (id, name) => {
    const success = await setDefaultMethod(id);
    if (success) {
      showNotification(`${name} set as default payment method`, "success");
      logActivity(`Settings: Set ${name} as default payment method`);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name}?`)) {
      const success = await deleteMethod(id);
      if (success) {
        showNotification(`${name} has been removed`, "info");
        logActivity(`Settings: Removed payment method "${name}"`);
      }
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-h3 text-app-dark">Payment Methods</h2>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label className="absolute -top-2 left-5 bg-white px-2 text-micro font-medium text-text-dark/70 ">
            Method Name
          </label>
          <input
            type="text"
            placeholder="e.g. GCash"
            value={newMethodName}
            disabled={isAdding}
            onChange={(e) => setNewMethodName(e.target.value)}
            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:border-app-dark outline-none transition-all"
          />
        </div>
        <Button 
          type="submit" 
          variant="primary"
          disabled={!newMethodName.trim()}
          isLoading={isAdding}
          className="px-8 rounded-2xl"
        >
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </form>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
          Active Methods
        </label>
        
        <div className="space-y-2">
          {isLoading ? (
            <div className="py-10 text-center text-slate-400">Loading...</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {methods.map((method) => (
                <motion.div 
                  key={method.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    method.isActive ? "bg-slate-50 border-slate-100" : "bg-gray-50 opacity-60 border-dashed"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSetDefault(method.id, method.name)}
                      disabled={!method.isActive || method.isDefault}
                      className={`p-2 rounded-xl transition-all ${
                        method.isDefault 
                          ? 'bg-amber-100 text-amber-500 shadow-sm' 
                          : 'text-slate-200 hover:text-amber-400 hover:bg-amber-50'
                      } ${!method.isActive ? 'cursor-not-allowed opacity-30' : ''}`}
                    >
                      <IconStar className={`w-4 h-4 ${method.isDefault ? 'fill-current' : ''}`} />
                    </button>
                    
                    <span className={`font-medium text-sm ${method.isActive ? 'text-app-dark' : 'text-slate-400 italic'}`}>
                      {method.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(method.id, method.name, method.isActive)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${method.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: method.isActive ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </button>

                    {!method.isDefault && (
                      <button onClick={() => handleDelete(method.id, method.name)} className="p-2 text-slate-300 hover:text-rose-500">
                        <IconTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}