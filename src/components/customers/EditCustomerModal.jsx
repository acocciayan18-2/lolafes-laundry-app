import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCustomerStore } from '../../store/customer/useCustomerStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore'; 
import { IconUsers, IconPhone, IconMapPin, IconClose } from '../icons';
import Button from '../ui/Button';

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
  const logActivity = useActivityStore((state) => state.logActivity); 

  // ==========================================
  // ACCESSIBILITY: Scroll Lock & Escape Key
  // ==========================================
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isSubmitting, onClose]);

  const hasChanges = 
    formData.name.trim() !== (customer.name || "").trim() ||
    formData.phone.trim() !== (customer.phone || "").trim() ||
    formData.address.trim() !== (customer.address || "").trim();

  // ==========================================
  // SMART FORMATTERS
  // ==========================================
  const handleNameChange = (val) => {
    // Better Regex: Capitalizes first letter of every word smoothly without breaking typing
    const formatted = val.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
    setFormData(prev => ({ ...prev, name: formatted }));
    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
  };

  const handlePhoneChange = (val) => {
    let cleaned = val;
    
    // Auto-convert pasted PH area codes to standard '0'
    if (cleaned.startsWith('+63')) cleaned = '0' + cleaned.substring(3);
    if (cleaned.startsWith('63')) cleaned = '0' + cleaned.substring(2);
    
    cleaned = cleaned.replace(/\D/g, ''); // Strip non-digits
    
    // Auto-prepend 0 if they just start typing 9
    if (cleaned.startsWith('9')) cleaned = '0' + cleaned;
    
    cleaned = cleaned.slice(0, 11); // Max 11 digits
    
    setFormData(prev => ({ ...prev, phone: cleaned }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) return onClose();

    const newErrors = {};
    if (formData.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
    
    // Regex simplified because handler now strictly enforces 09 format
    if (!/^09\d{9}$/.test(formData.phone)) newErrors.phone = "Invalid 11-digit PH number";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, formData);

      // --- LOG ACTIVITY LOGIC ---
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
          order_number: `CUST-${customer.id.slice(-4)}` 
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
    w-full pl-10 pr-4 py-3 border font-medium rounded-xl text-sm-text focus:outline-none transition-all
    ${err ? 'border-red-500 focus:border-red-600 bg-red-50/30' : 'border-app-dark/20 focus:border-app-dark/90 bg-white'}
  `;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-app-dark/40 backdrop-blur-sm z-[100] p-4"
      onClick={!isSubmitting ? onClose : undefined} // Backdrop click to close
      role="dialog"
      aria-modal="true"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click from triggering inside the modal
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative"
      >
        <button 
          onClick={onClose} 
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-50"
          aria-label="Close modal"
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
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Phone Number *" error={errors.phone} icon={IconPhone}>
            <input 
              className={inputClass(errors.phone)} 
              inputMode="numeric" 
              value={formData.phone} 
              onChange={(e) => handlePhoneChange(e.target.value)} 
              placeholder="09XXXXXXXXX"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Address" icon={IconMapPin}>
            <textarea 
              rows="1" 
              className={`${inputClass()} resize-none`} 
              value={formData.address || ""} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              placeholder="House No., Street, Brgy."
              disabled={isSubmitting}
            />
          </FormField>

          <div className="flex gap-3 w-full">
  {/* ✨ SECONDARY BUTTON: Standardized border and hover states */}
  <Button 
    variant="secondary" 
    className="flex-1" 
    onClick={onClose} 
    disabled={isSubmitting}
  >
    Cancel
  </Button>

  {/* ✨ PRIMARY BUTTON: Automatically handles the spinner and disabled opacity */}
  <Button 
    variant="primary" 
    type="submit" 
    className="flex-1"
    disabled={!hasChanges} 
    isLoading={isSubmitting}
  >
    {isSubmitting ? "Saving..." : "Save Changes"}
  </Button>
</div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditCustomerModal;