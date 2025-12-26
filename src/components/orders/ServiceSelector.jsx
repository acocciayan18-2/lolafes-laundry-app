import React, { useState } from "react";
import { IconPackage, IconPlus, IconTrash } from "../icons";

export const ServiceSelector = ({
  services,
  selectedServices,
  setSelectedServices,
  Button,
  Input,
  Badge,
}) => {
  const [newServiceWeight, setNewServiceWeight] = useState({});

  const serviceTypeLabels = {
    wash_only: "Wash Only",
    wash_fold: "Wash & Fold",
    wash_dry: "Wash & Dry",
    wash_dry_fold: "Wash, Dry & Fold",
    dry_only: "Dry Only",
    press_only: "Press Only",
  };

  const addService = (service) => {
    const weight = parseFloat(newServiceWeight[service.id]) || 0;
    if (weight <= 0) return;

    const existingIndex = selectedServices.findIndex((s) => s.id === service.id);

    if (existingIndex !== -1) {
      const updatedServices = [...selectedServices];
      const existingService = updatedServices[existingIndex];
      const newTotalWeight = existingService.weight_kg + weight;

      updatedServices[existingIndex] = {
        ...existingService,
        weight_kg: newTotalWeight,
        subtotal: newTotalWeight * service.price_per_kg,
      };
      setSelectedServices(updatedServices);
    } else {
      const subtotal = weight * service.price_per_kg;
      setSelectedServices([...selectedServices, {
        id: service.id,
        service_name: service.name,
        service_type: service.type,
        weight_kg: weight,
        price_per_kg: service.price_per_kg,
        subtotal: subtotal,
      }]);
    }
    setNewServiceWeight({ ...newServiceWeight, [service.id]: "" });
  };

  const removeService = (index) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const updateServiceWeight = (index, newWeight) => {
    const weight = parseFloat(newWeight) || 0;
    const updatedServices = [...selectedServices];
    updatedServices[index] = {
      ...updatedServices[index],
      weight_kg: weight,
      subtotal: weight * updatedServices[index].price_per_kg,
    };
    setSelectedServices(updatedServices);
  };

  return (
    <div className="bg-white/80 shadow-[rgba(50,50,93,0.15)_0px_50px_100px_-20px,rgba(0,0,0,0.1)_0px_30px_60px_-30px] rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <IconPackage className="w-6 h-6 !text-blue-600 !stroke-blue-600" />
          Services
        </h3>
      </div>

      <div className="p-6 space-y-6 pt-2">
        <h3 className="text-l font-medium text-gray-900 ml-1">Available Services</h3>

        {/* --- AVAILABLE SERVICES LIST --- */}
        <div className="grid gap-3">
          {services.map((service) => (
            <div key={service.id} className="group bg-blue-100/50 rounded-xl p-4 border border-blue-400 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-sm hover:border-blue-500">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg">{service.name}</h4>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-blue-100/50 text-blue-700 border-blue-200 px-3">
                    {serviceTypeLabels[service.type] || service.type}
                  </Badge>
                  <Badge className="bg-white text-gray-600 border-gray-200 px-3 font-mono">
                    ₱{service.price_per_kg}/kg
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 items-center p-2 rounded-lg">
                <Input
                  placeholder="Weight"
                  type="text"
                  inputMode="decimal"
                  value={newServiceWeight[service.id] || ""}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val.startsWith('0')) return;
                    if (val.split('.').length > 2) return;
                    setNewServiceWeight({ ...newServiceWeight, [service.id]: val });
                  }}
                  className="w-24 !h-10 !focus:border-black !focus:ring-0 text-center font-normal"
                />
                <Button
                  onClick={() => addService(service)}
                  disabled={!newServiceWeight[service.id] || parseFloat(newServiceWeight[service.id]) <= 0}
                  className="h-10 w-10 !p-0 shadow-sm transition-all !bg-blue-600 hover:!bg-blue-700 disabled:!bg-blue-300 !border-0"
                >
                  <IconPlus className="w-5 h-5 !text-white !stroke-white" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* --- SELECTED ITEMS SECTION --- */}
        {selectedServices.map((service, index) => (
  <div 
    key={index} 
    className={`
      flex items-center justify-between p-4 pt-3 pb-3 rounded-xl border border-green-700 transition-all hover:bg-white
      ${service.is_reward 
        ? "bg-green-50/50 !border-green-700 shadow-[0_0_10px_rgba(21,128,61,0.1)]" 
        : "bg-gray-50/50 border-gray-100"
      }
    `}
  >
    <div className="flex-1 pr-4">
      <div className="flex items-center mb-1">
        <p className="font-bold text-gray-900 text-sm leading-none">
          {service.service_name}
        </p>
      </div>
      
      <p className={`text-xxs tracking-tighter font-mono ${service.is_reward ? "text-green-700 font-bold" : "text-gray-500"}`}>
        {service.is_reward ? "LOYALTY REWARD APPLIED" : `₱ ${service.price_per_kg}/kg`}
      </p>
    </div>

    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Weight</span>
        <Input
          type="number"
          value={service.weight_kg}
          readOnly={service.is_reward}
          className={`w-14 !h-10 !p-1 text-center font-bold !text-xs !focus:border-black !focus:ring-0 !rounded-md ${
            service.is_reward ? "bg-white border-green-200 text-green-700 cursor-not-allowed" : "text-gray-900"
          }`}
        />
      </div>

      <div className="text-right min-w-[70px]">
        <span className="text-[10px] font-bold text-gray-400 uppercase block">Subtotal</span>
        <p className={`font-black ${service.is_reward ? "text-green-700" : "text-blue-600"}`}>
          ₱{service.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeService(index)}
        className="!text-red-500 hover:!text-red-700 hover:!bg-red-50 !p-2 transition-colors"
      >
        <IconTrash className="w-5 h-5 !text-red-500 !stroke-red-500" />
      </Button>
    </div>
  </div>
))}
      </div>
    </div>
  );
};