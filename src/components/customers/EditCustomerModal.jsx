import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerStore } from '../../store/customer/useCustomerStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore'; 
import { IconUsers, IconPhone, IconMapPin, IconClose } from '../icons';
import Button from '../ui/Button';

// ==========================================
// ATOMIC SUB-COMPONENT
// ==========================================

/**
 * @component FormField
 * @description Accessible form wrapper ensuring strict label-to-input association.
 */
const FormField = React.memo(({ label, id, error, icon: Icon, children }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-sm-text  text-text-dark/70 ml-1">
      {label}
    </label>
    <div className="relative">
      <Icon 
        aria-hidden="true"
        className={`absolute left-3 w-4 h-4 transition-colors 
        ${error ? 'text-rose-500' : 'text-text-dark/70'} 
        ${label.includes('Address') ? 'top-3' : 'top-1/2 -translate-y-1/2'}`} 
      />
      {children}
    </div>
    <AnimatePresence>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
          role="alert"
          className="text-micro text-rose-500 font-bold ml-1 mt-1 uppercase tracking-tight"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </div>
));
FormField.displayName = "FormField";


// ==========================================
// MAIN COMPONENT
// ==========================================

const EditCustomerModal = ({ customer, onClose }) => {
  // --- STATE ---
  const [formData, setFormData] = useState({ 
    name: customer?.name || "", 
    phone: customer?.phone || "", 
    address: customer?.address || "" 
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portalNode, setPortalNode] = useState(null);

  // --- REFS ---
  const isMounted = useRef(false);
  const modalRef = useRef(null);

  // --- STORES ---
  const updateCustomer = useCustomerStore((state) => state.updateCustomer);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const logActivity = useActivityStore((state) => state.logActivity); 

  // --- LIFECYCLE & PORTALS ---
  useEffect(() => {
    isMounted.current = true;
    setPortalNode(document.body);
    return () => { isMounted.current = false; };
  }, []);

  // Modal scroll locking, Focus Trap, and ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isSubmitting) handleClose(e);
    };
    
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);
    
    // Shift focus to modal for screen readers
    modalRef.current?.focus();
    
    return () => {
      document.body.style.overflow = originalOverflow; // Safely restore
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- DERIVED STATE (MEMOIZED) ---
  const originalName = useMemo(() => customer?.name || "Unknown Customer", [customer?.name]);
  
  const hasChanges = useMemo(() => {
    return formData.name.trim() !== (customer?.name || "").trim() ||
           formData.phone.trim() !== (customer?.phone || "").trim() ||
           formData.address.trim() !== (customer?.address || "").trim();
  }, [formData, customer]);


  // --- HANDLERS (MEMOIZED) ---

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!isSubmitting && typeof onClose === 'function') onClose();
  }, [isSubmitting, onClose]);

  const handleNameChange = useCallback((e) => {
    // SECURITY: Limit input length to prevent payload bloat
    const val = e.target.value.substring(0, 100);
    const formatted = val.replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
    
    setFormData(prev => ({ ...prev, name: formatted }));
    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
  }, [errors.name]);

  const handlePhoneChange = useCallback((e) => {
    let cleaned = e.target.value;
    
    // Auto-convert pasted PH area codes to standard '0'
    if (cleaned.startsWith('+63')) cleaned = '0' + cleaned.substring(3);
    if (cleaned.startsWith('63')) cleaned = '0' + cleaned.substring(2);
    
    cleaned = cleaned.replace(/\D/g, ''); // Strip non-digits
    
    // Auto-prepend 0 if they just start typing 9
    if (cleaned.startsWith('9')) cleaned = '0' + cleaned;
    
    cleaned = cleaned.slice(0, 11); // Max 11 digits
    
    setFormData(prev => ({ ...prev, phone: cleaned }));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
  }, [errors.phone]);

  const handleAddressChange = useCallback((e) => {
    // SECURITY: Prevent massive payload injection
    const safeAddress = e.target.value.substring(0, 250);
    setFormData(prev => ({ ...prev, address: safeAddress }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!hasChanges) {
      handleClose();
      return;
    }

    // STRICT FRONT-END VALIDATION
    const newErrors = {};
    if (formData.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
    if (!/^09\d{9}$/.test(formData.phone)) newErrors.phone = "Invalid 11-digit PH number";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await updateCustomer(customer.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim()
      });

      // --- LOG ACTIVITY ---
      const changes = [];
      if (formData.name.trim() !== (customer.name || "").trim()) changes.push("Name");
      if (formData.phone.trim() !== (customer.phone || "").trim()) changes.push("Phone");
      if (formData.address.trim() !== (customer.address || "").trim()) changes.push("Address");

      const descriptiveLabel = changes.length > 0 
        ? `${changes.join(" & ")} Updated` 
        : "Customer Details Updated";

      logActivity(
        { 
          customer_name: formData.name.trim(), 
          order_number: `CUST-${String(customer.id).slice(-4)}` 
        }, 
        'in_progress', 
        { action: 'status_update', label: descriptiveLabel }
      );

      showNotification(`Updated details for ${formData.name}`, "success");
      
      // Defensively close only if still mounted
      if (isMounted.current && typeof onClose === 'function') onClose();

    } catch (error) {
      console.error("[EditCustomerModal] Update Error:", error);
      if (isMounted.current) {
        const msg = error?.message || "Check your internet connection.";
        showNotification(`Update Failed: ${msg}`, "error");
        setIsSubmitting(false);
      }
    }
  }, [formData, customer, hasChanges, handleClose, updateCustomer, logActivity, showNotification, onClose]);


  // --- EARLY RETURN FOR SSR/PORTALS ---
  if (!portalNode || !customer) return null;

  // --- RENDER ---
  const inputClass = (err) => `
    w-full pl-10 pr-4 py-3 border  rounded-xl text-sm-text focus:outline-none focus-visible:ring-none 
    ${err ? 'border-rose-500 focus:border-rose-600 focus-visible:ring-rose-500/50 bg-rose-50/30' : 'border-app-dark/20 focus:border-app-dark/90 focus-visible:ring-app-dark/50 bg-white'}
  `;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-app-dark/40 backdrop-blur-sm z-[100] p-4"
      onClick={handleClose} // Safe backdrop click
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-customer-title"
    >
      <motion.div 
        ref={modalRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        onClick={(e) => e.stopPropagation()} // Prevent bubbling
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative focus:outline-none"
      >
        {/* CLOSE BUTTON */}
        <button 
          onClick={handleClose} 
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-none focus-visible:ring-app-dark"
          aria-label="Close edit customer modal"
        >
          <IconClose className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* HEADER */}
        <header className="p-5 border-b border-slate-50 pb-0">
          <h3 id="edit-customer-title" className="text-xl font-bold text-text-dark">Edit Customer</h3>
          <p className="text-sm-text text-slate-500 truncate" title={originalName}>Update {originalName} details</p>
        </header>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-5 pt-2 space-y-3" noValidate>
          <FormField label="Full Name *" id="edit-name" error={errors.name} icon={IconUsers}>
            <input 
              id="edit-name"
              type="text"
              className={inputClass(errors.name)} 
              value={formData.name} 
              onChange={handleNameChange} 
              placeholder="e.g. Juan Dela Cruz"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              required
            />
          </FormField>

          <FormField label="Phone Number *" id="edit-phone" error={errors.phone} icon={IconPhone}>
            <input 
              id="edit-phone"
              type="tel"
              className={inputClass(errors.phone)} 
              inputMode="numeric" 
              pattern="[0-9]*"
              value={formData.phone} 
              onChange={handlePhoneChange} 
              placeholder="09XXXXXXXXX"
              disabled={isSubmitting}
              aria-invalid={!!errors.phone}
              required
            />
          </FormField>

          <FormField label="Address (Optional)" id="edit-address" icon={IconMapPin}>
            <textarea 
              id="edit-address"
              rows="2" 
              className={`${inputClass()}  capitalize resize-none custom-scrollbar`} 
              value={formData.address} 
              onChange={handleAddressChange} 
              placeholder="House No., Street, Brgy."
              disabled={isSubmitting}
            />
          </FormField>

          <footer className="flex gap-3 w-full pt-2">
            <Button 
              variant="secondary" 
              type="button"
              className="flex-1" 
              onClick={handleClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button 
              variant="primary" 
              type="submit" 
              className="flex-1"
              disabled={!hasChanges || isSubmitting} 
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </footer>
        </form>
      </motion.div>
    </div>,
    portalNode
  );
};

export default React.memo(EditCustomerModal);