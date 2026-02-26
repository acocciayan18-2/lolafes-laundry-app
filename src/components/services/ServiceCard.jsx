import { useEffect, useRef, useState } from "react";
import { Badge, Button, Input } from "../../pages/Services";
import { useActivityStore } from "../../store/activities/useActivityStore";
import {
  IconArrowUp,
  IconCheckWhite,
  IconEdit2,
  IconPackage,
  IconPlus,
  IconTrash,
  IconX
} from "../icons";

const serviceTypeLabels = {
  wash_only: "Wash Only",
  dry_only: "Dry Only",
  fold_only: "Fold Only",
  press_only: "Press Only",
  wash_dry: "Wash & Dry",
  wash_fold: "Wash & Fold",
  dry_fold: "Dry & Fold",
  dry_press: "Dry & Press",
  wash_dry_fold: "Wash, Dry & Fold",
  wash_dry_press: "Wash, Dry & Press",
  wash_fold_press: "Wash, Fold & Press",
  full_service: "Full Service (W/D/F/P)",
  special_care: "Delicates / Handwash",
  bulk_items: "Bulk (Comforters/Rug)",
  add_on: "Add-ons & Supplies"
};

const ServiceTypeSelect = ({ value, onChange, optionsMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const currentLabel = optionsMap[value] || "Select Type";
  return (
    <div className="relative w-full" ref={containerRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-base-text font-medium  focus:outline-none ${isOpen ? "border-gray-900  ring-gray-900" : "border-slate-200 hover:border-gray-300"}`}>
        <span className="truncate text-slate-700 ">{currentLabel}</span>
        <IconArrowUp className={`w-3.5 h-3.5 text-text-dark/60 transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
      </button>
      {isOpen && (
        <div className="absolute custom-scrollbar left-0 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-xl z-[999] overflow-hidden py-2 p-3 max-h-60 overflow-y-auto">
          {Object.entries(optionsMap).map(([key, label]) => (
            <button key={key} type="button" onClick={() => { onChange(key); setIsOpen(false); }} className="w-full px-3 py-2 mb-1 text-left text-base-text flex items-center justify-between transition-colors hover:bg-gray-50 font-medium text-slate-700 ">
              <span className="truncate">{label}</span>
              {value === key && <IconCheckWhite className="w-3.5 h-3.5 text-blue-600 fill-current" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ServiceCard({ service, isEditing, tempData, setTempData, onEdit, onSave, onCancel, onToggle, onDelete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const containerBase = "w-full rounded-xl border transition-all duration-200 px-4 py-2 shadow-sm";
  const isNew = !service.id;

  const logActivity = useActivityStore((state) => state.logActivity);

  const handleAction = async (actionFn, id, data) => {
<<<<<<< HEAD
  setIsProcessing(true);
  try {
    const result = await actionFn(id, data);
    
    if (result !== false) {
      let logData = {
        customer_name: data?.name || service.name,
        total_amount: data?.price_per_kg || service.price_per_kg,
        order_number: "SERVICE"
      };

      if (actionFn === onSave) {
        if (isNew) {
          logActivity({ ...logData, order_number: "NEW" }, 'pending', { action: 'created', label: 'Service Created' });
        } else {
          const changes = [];
          if (data.name !== service.name) changes.push("Name");
          if (data.type !== service.type) changes.push("Type");
          if (Number(data.price_per_kg) !== Number(service.price_per_kg)) changes.push("Price");
          
          const descriptiveLabel = changes.length > 0 
            ? `${changes.join(" & ")} Updated` 
            : "Service Details Updated";

          logActivity(
            { ...logData, order_number: "EDITED" }, 
            'in_progress', 
            { action: 'status_update', label: descriptiveLabel }
          );
        }
      } else if (actionFn === onToggle) {
        const newState = !service.is_active;
        logActivity(
          { ...logData, order_number: newState ? "ACTIVE" : "INACTIVE" }, 
          newState ? 'ready' : 'picked_up', 
          { action: 'status_update', label: newState ? 'Service Enabled' : 'Service Disabled' }
        );
      } else if (actionFn === onDelete) {
        logActivity({ ...logData, order_number: "REMOVED" }, 'picked_up', { action: 'status_update', label: 'Service Deleted' });
      }
    }
    setShowConfirmDelete(false);
  } catch (err) {
    console.error("Logging error:", err);
  } finally {
    setIsProcessing(false);
  }
};

=======
    setIsProcessing(true);
    try {
      const result = await actionFn(id, data);
      
      if (result !== false) {
        // Use a UNIFIED order_number prefix for all service actions
        // This helps the store's deduplication check identify them as the same "subject"
        const LOG_SUBJECT = `SVC-${id || 'NEW'}`;

        let logData = {
          customer_name: data?.name || service.name,
          total_amount: data?.price_per_kg || service.price_per_kg,
          order_number: LOG_SUBJECT
        };

        if (actionFn === onSave) {
         if (isNew) {
    // Explicitly define the label here
    logActivity(
      logData, 
      'pending', 
      { action: 'created', label: 'Service Created' } 
    );
  }else {
            const changes = [];
            if (data.name !== service.name) changes.push("Name");
            if (data.type !== service.type) changes.push("Type");
            if (Number(data.price_per_kg) !== Number(service.price_per_kg)) changes.push("Price");
            
            if (changes.length > 0) {
              const descriptiveLabel = `${changes.join(" & ")} Updated`;
              logActivity(logData, 'in_progress', { action: 'status_update', label: descriptiveLabel });
            }
          }
        } else if (actionFn === onToggle) {
          const newState = !service.is_active;
          logActivity(
            logData, 
            newState ? 'ready' : 'picked_up', 
            { action: 'status_update', label: newState ? 'Service Enabled' : 'Service Disabled' }
          );
        } else if (actionFn === onDelete) {
          logActivity(logData, 'picked_up', { action: 'status_update', label: 'Service Deleted' });
        }
      }
      setShowConfirmDelete(false);
    } catch (err) {
      console.error("Logging error:", err);
    } finally {
      setIsProcessing(false);
    }
  };
>>>>>>> Karen2.0
  // --- Confirm Delete View ---
  if (showConfirmDelete) {
    return (
    <div className="w-full rounded-xl border border-app-dark/20 bg-app-light p-4 shadow-md animate-in fade-in slide-in-from-top-2 relative z-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg shrink-0">
            <IconTrash className="w-5 h-5 text-white stroke-white" />
          </div>
          <div>
            <h3 className="text-base-text font-medium text-text-dark  ">Delete this service?</h3>
            <p className="text-sm-text text-red-700 font-medium">This will permanently remove {service.name}.</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          
          <Button 
            variant="outline" 
            className="flex-1 !text-text-dark md:w-24 border-1 !border-app-dark text-sm-text font-medium   h-9 active:scale-95 transition-transform" 
            onClick={() => setShowConfirmDelete(false)} 
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 md:w-32 !bg-red-600 text-white text-sm-text font-medium   h-9 shadow-sm active:scale-95 transition-transform" 
            onClick={() => handleAction(onDelete, service.id, service)} 
            disabled={isProcessing}
          >
            {isProcessing ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
    );
  }

  // --- Edit/Add View ---
  if (isEditing) {
    return (
      <div className={`${containerBase} border-app-dark/20 bg-white shadow-md animate-in fade-in zoom-in-95 py-3 pt-2 relative z-20`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex-1 w-full space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1">
              <div className="space-y-1">
                <label className="text-micro font-medium text-text-dark/60  ml-1 ">Service Name</label>
                <Input 
  value={tempData?.name || ""} 
  onChange={(e) => setTempData({...tempData, name: e.target.value})} 
  className=" focus:ring-1 " 
/></div>
              <div className="space-y-1 relative z-20">
                <label className="text-micro font-medium text-text-dark/60  ml-1 ">Service Type</label>
                <ServiceTypeSelect value={tempData?.type || "wash_dry"} optionsMap={serviceTypeLabels} onChange={(newValue) => setTempData({...tempData, type: newValue})} />
              </div>
              <div className="space-y-1 relative z-10">
                <label className="text-micro font-medium text-text-dark/60  ml-1 ">Price (₱)</label>
                <Input type="number" value={tempData?.price_per_kg || ""} onChange={(e) => setTempData({...tempData, price_per_kg: e.target.value})} className=" focus:ring-1 " />
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-1.5 w-full md:w-auto relative z-0">
            <Button variant="success" className="flex-1 md:w-28 text-sm-text font-medium   bg-green-700 text-white hover:bg-green-800" onClick={() => handleAction(onSave, service.id, tempData)} disabled={isProcessing}>
              {isProcessing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <>{isNew ? <IconPlus className="w-3.5 h-3.5 mr-1 stroke-white text-white" /> : <IconCheckWhite className="w-3.5 h-3.5 mr-1" />}{isNew ? "Add" : "Save"}</>
              )}
            </Button>
            <Button variant="outline" className=" flex-1 md:w-28 text-sm-text font-medium  " onClick={onCancel} disabled={isProcessing}>
              <IconX className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal View ---
  return (
    <div className={`${containerBase} ${service.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'} !py-4 flex items-center relative z-0`}>
      <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center shadow-hollow justify-center border shrink-0 bg-app-light`}>
              <IconPackage className="w-5 h-5 text-text-dark stroke-text-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base-text font-bold text-slate-900 truncate  ">{service.name}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className="bg-blue-100/50 text-blue-700 border-blue-200 px-3    py-0.5">{serviceTypeLabels[service.type] || service.type}</Badge>
                <Badge className="bg-white text-gray-600 border-gray-200 px-2   font-bold py-0.5">₱{Number(service.price_per_kg).toFixed(2)}</Badge>
                <Badge className={`  py-0.5 ${service.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{service.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex !flex-row md:flex-col items-center justify-end gap-2 shrink-0 ml-auto">
          {service.is_active && (
            <Button variant="outline" className=" flex-1 md:w-28 text-sm-text font-medium   px-3 border-gray-100 hover:bg-app-dark/5" onClick={() => onEdit(service)}>
              <IconEdit2 className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
          <div className="flex flex-row gap-2 justify-end">
            {!service.is_active && (
              <Button 
                onClick={() => setShowConfirmDelete(true)} 
                className=" px-2.5 bg-transparent text-red-600 shrink-0 hover:bg-transparent hover:opacity-100 transition-none"
              >
                <IconTrash className="w-5 h-5 text-text-dark/80 stroke-text-dark/80" />
              </Button>
            )}
            <Button 
              onClick={() => handleAction(onToggle, service.id, service)} 
              className={`
                 flex-1 md:w-28 text-sm-text font-medium  px-3 transition-all active:scale-95
                ${service.is_active 
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/20" 
                  : "bg-green-700 hover:bg-green-800 text-white shadow-md shadow-emerald-900/20"
                }
              `} 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                service.is_active ? "Disable" : "Enable"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}