import React, { useState, useEffect } from "react";
import LoyaltySettings from "../components/services/LoyaltySettings";
import { IconSettings, IconPlus, IconPackage, IconEdit2 } from "../components/icons";

// ==========================================
// 1. UI HELPERS (Locally defined for this page)
// ==========================================
const Button = ({ children, onClick, className = "", variant = "primary", ...props }) => {
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg",
    outline: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-md",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm"
  };
  return (
    <button 
      onClick={onClick} 
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none px-4 py-2 ${variants[variant] || variants.primary} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ id, type = "text", value, onChange, placeholder, required, className = "" }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
);

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 block mb-1">
    {children}
  </label>
);

const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

// ==========================================
// 2. CONFIG
// ==========================================
const serviceTypeLabels = {
  wash_only: "Wash Only",
  wash_dry: "Wash & Dry", 
  wash_dry_fold: "Wash, Dry & Fold",
  wash_dry_press: "Wash, Dry & Press",
  dry_only: "Dry Only",
  press_only: "Press Only"
};

const MOCK_SERVICES = [
  { id: 1, name: "Regular Wash & Dry", type: "wash_dry", price_per_kg: 35, duration_hours: 24, is_active: true },
  { id: 2, name: "Express Wash", type: "wash_dry_fold", price_per_kg: 65, duration_hours: 4, is_active: true },
  { id: 3, name: "Comforter Cleaning", type: "wash_only", price_per_kg: 150, duration_hours: 48, is_active: false },
];

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function Services() {
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: "", price_per_kg: "", type: "", duration_hours: "", is_active: true
  });

  useEffect(() => {
    // Simulate API Load
    setServices(MOCK_SERVICES);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingService) {
      const updatedServices = services.map(s => 
        s.id === editingService.id ? { ...s, ...formData, price_per_kg: parseFloat(formData.price_per_kg) } : s
      );
      setServices(updatedServices);
    } else {
      const newService = {
        id: Date.now(),
        ...formData,
        price_per_kg: parseFloat(formData.price_per_kg),
        duration_hours: parseFloat(formData.duration_hours)
      };
      setServices([newService, ...services]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: "", price_per_kg: "", type: "", duration_hours: "", is_active: true });
    setShowForm(false);
    setEditingService(null);
  };

  const editService = (service) => {
    setFormData({
      name: service.name,
      price_per_kg: service.price_per_kg.toString(),
      type: service.type,
      duration_hours: service.duration_hours?.toString() || "",
      is_active: service.is_active
    });
    setEditingService(service);
    setShowForm(true);
  };

  const toggleServiceStatus = (serviceId) => {
    const updatedServices = services.map(s => 
      s.id === serviceId ? { ...s, is_active: !s.is_active } : s
    );
    setServices(updatedServices);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <IconSettings className="w-8 h-8 text-blue-600" />
              Services Management
            </h1>
            <p className="text-gray-600 mt-1">Configure your laundry services and pricing</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <IconPlus className="w-5 h-5 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Loyalty Program Settings Component */}
        <div className="mb-8">
          <LoyaltySettings />
        </div>

        {/* Service Form */}
        {showForm && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border-0 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h3>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Service Name *</Label>
                      <Input id="name" placeholder="e.g. Regular Wash & Dry" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Service Type *</Label>
                      <div className="relative">
                        <select
                          id="type"
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                          required
                          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Select service type</option>
                          {Object.entries(serviceTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per KG (₱) *</Label>
                      <Input id="price" type="number" step="0.01" placeholder="25.00" value={formData.price_per_kg} onChange={(e) => setFormData({...formData, price_per_kg: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (hours)</Label>
                      <Input id="duration" type="number" placeholder="24" value={formData.duration_hours} onChange={(e) => setFormData({...formData, duration_hours: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit" variant="success">{editingService ? 'Update Service' : 'Add Service'}</Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="grid gap-4">
          {services.map((service) => (
            <div key={service.id} className={`rounded-xl border-0 shadow-lg p-6 transition-all duration-300 transform hover:-translate-y-1 ${service.is_active ? 'bg-white/90' : 'bg-gray-100/90 opacity-75'}`}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${service.is_active ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                      <IconPackage className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">{serviceTypeLabels[service.type]}</Badge>
                        <Badge className="bg-white text-green-700 border-green-200 border">₱{service.price_per_kg}/kg</Badge>
                        {service.duration_hours && <Badge className="bg-white text-gray-600 border-gray-200 border">{service.duration_hours}h duration</Badge>}
                        <Badge className={service.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>{service.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-9 text-sm" onClick={() => editService(service)}>
                    <IconEdit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    onClick={() => toggleServiceStatus(service.id)} 
                    variant={service.is_active ? "danger" : "success"}
                    className="h-9 text-sm"
                  >
                    {service.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && (
          <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-300">
            <div className="flex justify-center mb-4"><IconPackage className="w-16 h-16 text-gray-300" /></div>
            <h3 className="text-xl font-medium text-gray-500 mb-2">No services configured</h3>
            <p className="text-gray-400 mb-6">Start by adding your first laundry service</p>
            <Button onClick={() => setShowForm(true)}><IconPlus className="w-5 h-5 mr-2" /> Add First Service</Button>
          </div>
        )}
      </div>
    </div>
  );
}