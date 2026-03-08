import { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { useSettingsStore } from '../../store/settings/useSettingsStore';
import { useNotificationStore } from '../../store/ui/useNotificationStore'; // ✨ Imported
import { IconClock } from '../icons';
import 'react-day-picker/dist/style.css';

/**
 * 🎨 CUSTOM STYLING: Full background blue highlights (No Circles)
 */
const calendarStyles = `
  .rdp { margin: 0; --rdp-cell-size: 40px; }
  .rdp-day_selected { 
    background-color: #e0f2fe !important; /* Light blue bg */
    color: #0369a1 !important; 
    font-weight: 800 !important; 
    border-radius: 8px !important; /* Rounded corners instead of circle */
  }
  .rdp-day:hover:not(.rdp-day_selected) { 
    background-color: #f8fafc; 
    border-radius: 8px; 
  }
  .rdp-head_cell { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 800; }
`;

export default function StoreShiftSettings() {
  const { systemConfig, setOperatingHours } = useSettingsStore();
  const showNotification = useNotificationStore((state) => state.showNotification);
  
  const operatingHours = systemConfig?.operatingHours;

  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [isSaving, setIsSaving] = useState(false);

  const openTimeRef = useRef(null);
  const closeTimeRef = useRef(null);

  useEffect(() => {
    if (operatingHours) {
      setIsEnabled(operatingHours.isEnabled ?? false);
      setOpenTime(operatingHours.openTime || "08:00");
      setCloseTime(operatingHours.closeTime || "22:00");
      if (operatingHours.allowedDays) {
        setSelectedDays(operatingHours.allowedDays.map(d => new Date(d)));
      }
    }
 }, [operatingHours]);

  const handleSave = async () => {
    if (selectedDays.length === 0 && isEnabled) {
      showNotification("Please select at least one day on the calendar.", "info");
      return;
    }

    setIsSaving(true);
    try {
      const configPayload = {
        allowedDays: selectedDays.map(day => day.toISOString()),
        openTime,
        closeTime,
        isEnabled
      };
      await setOperatingHours(configPayload);
      showNotification("System access hours updated!", "success");
    } catch (err) {
      showNotification("Failed to sync settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTo12Hr = (timeStr) => {
    if (!timeStr) return "--:--";
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      <style>{calendarStyles}</style>
      
      {/* HEADER & MASTER TOGGLE */}
      <div className="flex flex-col sm:flex-row !mt-0 items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-bold text-h3  mb-1">System Access Restriction</h2>
            <p className="text-micro text-text-dark/70">Enable to lock the system outside shift hours</p>
          </div>
        </div>

        <button 
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-500 ${!isEnabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
        <div className="space-y-3">
          <label className="text-sm-text font-medium text-text-dark/70 ml-1">Active Operating Dates</label>
          <div className="p-3 bg-white rounded-3xl border border-slate-300 flex justify-center">
            <DayPicker mode="multiple" selected={selectedDays} onSelect={setSelectedDays} />
          </div>
        </div>

        <div className="flex flex-col gap-6 py-2">
            <div className="grid grid-cols-1 gap-4">
              <div onClick={() => openTimeRef.current?.showPicker()} className="group relative flex items-center justify-between w-full h-16 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all cursor-pointer">
                <div className="flex flex-col items-start">
                  <label className="text-micro font-medium text-text-dark/70 group-hover:text-emerald-600">Shift Starts At:</label>
                  <span className="text-sm-text font-bold text-text-dark">{formatTo12Hr(openTime)}</span>
                </div>
                <input ref={openTimeRef} type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="absolute inset-0 opacity-0 pointer-events-none" />
                <IconClock className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
              </div>

              <div onClick={() => closeTimeRef.current?.showPicker()} className="group relative flex items-center justify-between w-full h-16 px-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all cursor-pointer">
                <div className="flex flex-col items-start">
                  <label className="text-micro font-medium text-text-dark/70 group-hover:text-emerald-600">Shift Ends At:</label>
                  <span className="text-sm-text font-bold text-text-dark">{formatTo12Hr(closeTime)}</span>
                </div>
                <input ref={closeTimeRef} type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="absolute inset-0 opacity-0 pointer-events-none" />
                <IconClock className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />
              </div>
            </div>

            <div className="p-2">
               <p className="text-micro font-bold text-text-dark/70 mb-1">Status Summary</p>
               <p className="text-micro text-text-dark/70 leading-relaxed">
                {isEnabled 
                  ? `System will lock except during the ${selectedDays.length} selected dates between ${formatTo12Hr(openTime)} and ${formatTo12Hr(closeTime)}.`
                  : "Restrictions are currently disabled."}
               </p>
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-[180px] py-3 bg-app-dark hover:bg-app-dark/90 text-white rounded-2xl  text-sm active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-100"
        >
          {isSaving ? "Syncing..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}