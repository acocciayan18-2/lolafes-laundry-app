import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCustomerStore } from '../../store/customer/useCustomerStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore'; // 1. Import Activity Store
import { IconUsers, IconPhone, IconMapPin, IconClose } from '../icons';

/**
 * SUB-COMPONENT: FormField
 */
const FormField = ({ label, error, icon: Icon, children }) => (
  <div className="space-y-1">
    <label className="text-micro font-medium text-text-dark/80 ml-1">{label}</label>
    <div className="relative">
      <Icon 
        className={`absolute left-3 w-4 h-4 transition-colors 
        ${error ? 'text-red-500' : 'text-text-dark/70'} 
        ${label === 'Address' ? 'top-3' : 'top-1/2 -translate-y-1/2'}`} 
      />
      {children}
    </div>
    {error && <p className="text-micro text-red-500 font-medium ml-1">{error}</p>}
  </div>
);

const EditCustomerModal = ({ customer, onClose }) => {
  const originalName = customer.name;
  
  const [formData, setFormData] = useState({ ...customer });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const updateCustomer = useCustomerStore((state) => state.updateCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity); // 2. Get logActivity action

  const hasChanges = 
    formData.name.trim() !== (customer.name || "").trim() ||
    formData.phone.trim() !== (customer.phone || "").trim() ||
    formData.address.trim() !== (customer.address || "").trim();

  const handleNameChange = (val) => {
    const formatted = val
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    setFormData(prev => ({ ...prev, name: formatted }));
    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
  };

  const handlePhoneChange = (val) => {
    const onlyNums = val.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, phone: onlyNums }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) return onClose();

    const newErrors = {};
    if (formData.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
    if (!/^(09|\+639)\d{9}$/.test(formData.phone)) newErrors.phone = "Invalid 11-digit PH number";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, formData);

      // --- 3. LOG ACTIVITY LOGIC ---
      const changes = [];
      if (formData.name.trim() !== (customer.name || "").trim()) changes.push("Name");
      if (formData.phone.trim() !== (customer.phone || "").trim()) changes.push("Phone");
      if (formData.address.trim() !== (customer.address || "").trim()) changes.push("Address");

      const descriptiveLabel = changes.length > 0 
        ? `${changes.join(" & ")} Updated` 
        : "Customer Details Updated";

      logActivity(
        { 
          customer_name: formData.name, 
          order_number: `CUST-${customer.id.slice(-4)}` // Tagging with last 4 of ID
        }, 
        'in_progress', 
        { action: 'status_update', label: descriptiveLabel }
      );

      showNotification(`Updated details for ${formData.name}`, "success");
      onClose();
    } catch (error) {
      const msg = error?.message || "Check your internet connection.";
      showNotification(`Update Failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (err) => `
    w-full pl-10 pr-4 py-3 border font-medium rounded-xl text-sm-text focus:outline-none
    ${err ? 'border-red-500 focus:border-red-600 bg-red-50/30' : 'border-app-dark/20 focus:border-app-dark/90 bg-white'}
  `;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-app-dark/20 backdrop-blur-sm z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative"
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <div className="p-5 border-b border-slate-50 pb-0">
          <h3 className="text-xl font-bold text-text-dark">Edit Customer</h3>
          <p className="text-sm text-slate-500 ">Update {originalName} details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 pt-2 space-y-2">
          <FormField label="Full Name *" error={errors.name} icon={IconUsers}>
            <input 
              className={inputClass(errors.name)} 
              value={formData.name} 
              onChange={(e) => handleNameChange(e.target.value)} 
              placeholder="e.g. Juan Dela Cruz"
            />
          </FormField>

          <FormField label="Phone Number *" error={errors.phone} icon={IconPhone}>
            <input 
              className={inputClass(errors.phone)} 
              inputMode="numeric" 
              value={formData.phone} 
              onChange={(e) => handlePhoneChange(e.target.value)} 
              placeholder="09XXXXXXXXX"
            />
          </FormField>

          <FormField label="Address" icon={IconMapPin}>
            <textarea 
              rows="1" 
              className={`${inputClass()} resize-none`} 
              value={formData.address || ""} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              placeholder="House No., Street, Brgy."
            />
          </FormField>

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 text-sm-text font-medium text-text-dark/70 border border-app-dark/30 rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !hasChanges} 
              className={`flex-1 px-4 py-2.5 text-sm-text font-medium rounded-lg transition-all text-white
                ${isSubmitting || !hasChanges 
                  ? 'bg-app-dark/30 cursor-not-allowed' 
                  : 'bg-app-dark hover:opacity-95'
                }`}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditCustomerModal;