import React, { useState, useEffect } from "react";
import { IconGift, IconStar, IconSave } from "../icons";

// --- Local UI Components ---
const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 block mb-1">
    {children}
  </label>
);

const Input = ({ id, type, value, onChange, min, step, className }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    min={min}
    step={step}
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${className}`}
  />
);

const Switch = ({ checked, onCheckedChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`
      peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2
      ${checked ? 'bg-purple-600' : 'bg-gray-200'}
    `}
  >
    <span
      className={`
        pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform 
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const Button = ({ children, onClick, disabled, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none h-10 px-4 py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
);

export default function LoyaltySettings() {
  const [settings, setSettings] = useState({
    is_enabled: true,
    orders_required: 4,
    free_service_kg: 8,
    free_service_type: "wash_dry"
  });
  const [isSaving, setIsSaving] = useState(false);

  // Simulate Load
  useEffect(() => {
    // In a real app, fetch data here
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Saved:", settings);
    alert("Loyalty settings saved successfully!");
    setIsSaving(false);
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border-0 shadow-xl overflow-hidden">
      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <IconGift className="w-6 h-6 text-purple-600" />
          Customer Loyalty Program
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Reward returning customers with free services
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
              settings.is_enabled 
                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                : 'bg-gray-400'
            }`}>
              <IconStar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Loyalty Program Status</h4>
              <p className="text-xs text-gray-600">
                {settings.is_enabled ? 'Active for all customers' : 'Disabled - no rewards'}
              </p>
            </div>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) => setSettings({...settings, is_enabled: checked})}
          />
        </div>

        {/* Conditional Content */}
        {settings.is_enabled && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Settings Configuration */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orders_required">Orders Required for Free Service</Label>
                <Input
                  id="orders_required"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.orders_required}
                  onChange={(e) => setSettings({...settings, orders_required: parseInt(e.target.value) || 4})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="free_service_kg">Free Service Weight (kg)</Label>
                <Input
                  id="free_service_kg"
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={settings.free_service_kg}
                  onChange={(e) => setSettings({...settings, free_service_kg: parseFloat(e.target.value) || 8})}
                />
              </div>
            </div>

            {/* Program Preview */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <IconGift className="w-5 h-5 text-amber-600" />
                Program Preview
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• Customer completes <Badge className="bg-blue-100 text-blue-800">{settings.orders_required} orders</Badge></p>
                <p>• Gets <Badge className="bg-green-100 text-green-800">{settings.free_service_kg}kg FREE</Badge> wash & dry service on next visit</p>
                <p>• Loyalty counter resets to 0 after claiming free service</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <IconSave className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}