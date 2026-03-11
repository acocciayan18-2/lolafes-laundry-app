import { useState, useEffect, useRef, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore';
import { useActivityStore } from '../../store/activities/useActivityStore';
import { IconClock } from '../icons';
import Button from '../ui/Button';
import 'react-day-picker/dist/style.css';

const calendarStyles = `
  .rdp { margin: 0; --rdp-cell-size: 40px; }
  .rdp-day_selected { 
    background-color: #e0f2fe !important; 
    color: #0369a1 !important; 
    font-weight: 800 !important; 
    border-radius: 8px !important; 
  }
  .rdp-day:hover:not(.rdp-day_selected) { 
    background-color: #f8fafc; 
    border-radius: 8px; 
  }
  .rdp-head_cell { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 800; }
  
  /* Hide scrollbar for the custom dropdown */
  .hide-scroll::-webkit-scrollbar { display: none; }
  .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`;

// --- HELPER ARRAYS FOR TIME PICKER ---
const HOURS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

// ==========================================
// 1. CUSTOM DROPDOWN TIME PICKER
// ==========================================
const DropdownTimePicker = ({ isOpen, onClose, value, onSave }) => {
  const dropdownRef = useRef(null);

  // Parse incoming "HH:mm" (24hr) safely
  const parseInitialTime = useCallback((time24) => {
    let [h, m] = (time24 || "08:00").split(':').map(Number);
    if (isNaN(h)) h = 8;
    if (isNaN(m)) m = 0;
    const p = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12 || 12;
    return { h: h12.toString().padStart(2, '0'), m: m.toString().padStart(2, '0'), p };
  }, []);

  const [selectedH, setSelectedH] = useState('08');
  const [selectedM, setSelectedM] = useState('00');
  const [selectedP, setSelectedP] = useState('AM');

  // Sync state & handle outside clicks
  useEffect(() => {
    if (isOpen) {
      const parsed = parseInitialTime(value);
      setSelectedH(parsed.h);
      setSelectedM(parsed.m);
      setSelectedP(parsed.p);

      // Outside click listener
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, value, parseInitialTime, onClose]);

  const handleApply = (e) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    let h24 = parseInt(selectedH, 10);
    if (selectedP === 'PM' && h24 !== 12) h24 += 12;
    if (selectedP === 'AM' && h24 === 12) h24 = 0;
    onSave(`${h24.toString().padStart(2, '0')}:${selectedM}`);
    onClose();
  };

  // Scrollable Column Component (Safe mounting auto-scroll)
  const ScrollColumn = ({ items, selected, onSelect }) => {
    const colRef = useRef(null);

    useEffect(() => {
      if (colRef.current) {
        const index = items.indexOf(selected);
        if (index !== -1) {
          colRef.current.scrollTop = index * 48;
        }
      }
    }, [items, selected]);

    return (
      <div 
        ref={colRef} 
        className="flex-1 h-48 overflow-y-auto hide-scroll snap-y snap-mandatory bg-white border-x first:border-l-0 last:border-r-0 border-slate-100"
      >
        <div className="h-[72px]" />
        {items.map(item => (
          <div
            key={item}
            onClick={(e) => { e.stopPropagation(); onSelect(item); }}
            className={`h-12 flex items-center justify-center snap-center cursor-pointer transition-all duration-200 select-none ${
              selected === item 
                ? 'text-text-dark font-bold text-xl bg-app-dark-50/50' 
                : 'text-text-dark/60 font-medium text-sm hover:text-text-dark/80 hover:bg-slate-50'
            }`}
          >
            {item}
          </div>
        ))}
        <div className="h-[72px]" /> 
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      ref={dropdownRef}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute top-[calc(100%+8px)] left-0 w-full max-w-[170px] bg-white rounded-2xl shadow-sm border border-slate-200 z-[999] overflow-hidden flex flex-col"
    >
      <div className="flex w-full relative border-b border-slate-100 bg-white">
          <div className="absolute top-1/2 left-0 w-full h-12 -translate-y-1/2 bg-transparent border-y border-emerald-500/20 pointer-events-none" />
          <ScrollColumn items={HOURS} selected={selectedH} onSelect={setSelectedH} />
          <ScrollColumn items={MINUTES} selected={selectedM} onSelect={setSelectedM} />
          <ScrollColumn items={PERIODS} selected={selectedP} onSelect={setSelectedP} />
      </div>
      <div className="p-3 bg-slate-50 flex justify-end gap-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="px-4 py-2 rounded-xl font-medium text-xs text-text-dark/70 "
        >
          Cancel
        </button>
        <button 
          onClick={handleApply} 
          className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-app-dark hover:bg-app-dark/90 transition-colors active:scale-95"
        >
          Apply
        </button>
      </div>
    </motion.div>
  );
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function StoreShiftSettings() {
  const { systemConfig, setOperatingHours } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { logActivity } = useActivityStore();
  
  const operatingHours = systemConfig?.operatingHours;

  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [isSaving, setIsSaving] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    if (operatingHours) {
      setIsEnabled(operatingHours.isEnabled ?? false);
      setOpenTime(operatingHours.openTime || "08:00");
      setCloseTime(operatingHours.closeTime || "22:00");
      
      if (Array.isArray(operatingHours.allowedDays)) {
        const validDates = operatingHours.allowedDays
          .map(d => new Date(d))
          .filter(d => !isNaN(d.getTime()));
        setSelectedDays(validDates);
      }
    }
  }, [operatingHours]);

  const handleSave = async () => {
    if (isEnabled && (!selectedDays || selectedDays.length === 0)) {
      showNotification("Please select at least one active day on the calendar.", "info");
      return;
    }

    setIsSaving(true);
    try {
      const configPayload = {
        allowedDays: (selectedDays || []).map(day => day.toISOString()),
        openTime: openTime || "08:00",
        closeTime: closeTime || "22:00",
        isEnabled
      };
      await setOperatingHours(configPayload);
      showNotification("System access hours updated!", "success");
      
      const statusText = isEnabled ? `Enabled (${formatTo12Hr(openTime)} - ${formatTo12Hr(closeTime)})` : "Disabled";
      logActivity?.(`Settings: Shift Restrictions ${statusText}`);
    } catch (err) {
      console.error("Shift Settings Sync Error:", err);
      showNotification("Failed to sync settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTo12Hr = useCallback((timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return "--:--";
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    if (isNaN(h)) return "--:--";
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }, []);

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative z-[10]">
      <style>{calendarStyles}</style>
      
      <div className="flex flex-col sm:flex-row !mt-0 items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-bold text-base-text mb-1 text-text-dark">System Access Restriction</h2>
            <p className="text-micro text-text-dark/70">Enable to lock the system outside shift hours</p>
          </div>
        </div>

        <button 
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:ring-offset-1 ${isEnabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500 ${!isEnabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
        
        <div className="space-y-3 relative z-0">
          <label className="text-sm-text font-medium text-text-dark/70 ml-1">Active Operating Dates</label>
          <div className="p-3 bg-white rounded-3xl border border-slate-300 flex justify-center shadow-sm">
            <DayPicker mode="multiple" selected={selectedDays} onSelect={setSelectedDays} />
          </div>
        </div>

        {/* Added high z-index here to prevent dropdowns from hiding behind the calendar */}
        <div className="flex flex-col gap-6 py-2 relative z-[50]">
            <div className="grid grid-cols-1 gap-4">
              
              {/* SHIFT STARTS DROPDOWN TRIGGER */}
              <div className="relative">
                <div 
                  onClick={() => setActiveDropdown(activeDropdown === 'open' ? null : 'open')} 
                  className={`group relative flex items-center justify-between w-full h-16 px-5 rounded-2xl border transition-all cursor-pointer ${activeDropdown === 'open' ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300'}`}
                >
                  <div className="flex flex-col items-start pointer-events-none">
                    <label className={`text-micro font-medium transition-colors ${activeDropdown === 'open' ? 'text-emerald-600' : 'text-text-dark/70 group-hover:text-emerald-600'}`}>Shift Starts At:</label>
                    <span className="text-sm-text font-bold text-text-dark">{formatTo12Hr(openTime)}</span>
                  </div>
                  <IconClock className={`w-5 h-5 transition-colors pointer-events-none ${activeDropdown === 'open' ? 'text-emerald-500' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                </div>
                
                <AnimatePresence>
                  {activeDropdown === 'open' && (
                    <DropdownTimePicker 
                      isOpen={true} 
                      onClose={() => setActiveDropdown(null)} 
                      value={openTime} 
                      onSave={setOpenTime} 
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* SHIFT ENDS DROPDOWN TRIGGER */}
              <div className="relative">
                <div 
                  onClick={() => setActiveDropdown(activeDropdown === 'close' ? null : 'close')} 
                  className={`group relative flex items-center justify-between w-full h-16 px-5 rounded-2xl border transition-all cursor-pointer ${activeDropdown === 'close' ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/20' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300'}`}
                >
                  <div className="flex flex-col items-start pointer-events-none">
                    <label className={`text-micro font-medium transition-colors ${activeDropdown === 'close' ? 'text-emerald-600' : 'text-text-dark/70 group-hover:text-emerald-600'}`}>Shift Ends At:</label>
                    <span className="text-sm-text font-bold text-text-dark">{formatTo12Hr(closeTime)}</span>
                  </div>
                  <IconClock className={`w-5 h-5 transition-colors pointer-events-none ${activeDropdown === 'close' ? 'text-emerald-500' : 'text-slate-300 group-hover:text-emerald-500'}`} />
                </div>

                <AnimatePresence>
                  {activeDropdown === 'close' && (
                    <DropdownTimePicker 
                      isOpen={true} 
                      onClose={() => setActiveDropdown(null)} 
                      value={closeTime} 
                      onSave={setCloseTime} 
                    />
                  )}
                </AnimatePresence>
              </div>

            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-micro font-bold text-text-dark/80 mb-1 flex items-center gap-1.5">
                 <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                 Status Summary
               </p>
               <p className="text-micro text-text-dark/70 leading-relaxed pl-3">
                {isEnabled 
                  ? `System will lock except during the ${selectedDays?.length || 0} selected dates between ${formatTo12Hr(openTime)} and ${formatTo12Hr(closeTime)}.`
                  : "Restrictions are currently disabled. System is accessible 24/7."}
               </p>
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-50">
        <Button 
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          isLoading={isSaving}
          className="w-full sm:w-[180px] !py-3 !rounded-2xl !text-sm shadow-lg shadow-slate-100 active:scale-95 transition-all"
        >
          {isSaving ? "Syncing..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}