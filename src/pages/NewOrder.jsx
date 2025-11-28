import React, { useState } from "react";


const SERVICE_OPTIONS = [
  { id: 1, name: "Regular Wash & Dry", price: 25 },
  { id: 2, name: "Wash, Dry & Fold", price: 35 },
  { id: 3, name: "Premium Wash, Dry & Press", price: 45 },
];

const PAYMENT_METHODS = ["Cash", "GCash", "Card"];

export default function NewOrder() {
  // Customer Information State
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Service Selection State
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [specialNotes, setSpecialNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // Local state to track input values for weights
  const [inputWeights, setInputWeights] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomer({ ...customer, [name]: value });
  };

  const handleWeightChange = (serviceId, value) => {
    setInputWeights({ ...inputWeights, [serviceId]: value });
  };

  const addService = (service) => {
    const weight = parseFloat(inputWeights[service.id]);
    
    if (!weight || weight <= 0) {
      alert("Please enter a valid weight.");
      return;
    }

    const subtotal = service.price * weight;
    const newServiceItem = { ...service, weight, subtotal };

    // Update state
    setSelectedServices([...selectedServices, newServiceItem]);
    setTotalAmount(totalAmount + subtotal);
    
    // Clear the input for that specific service
    setInputWeights({ ...inputWeights, [service.id]: "" });
  };

  const handleCreateOrder = () => {
    if (!customer.name || !customer.phone || selectedServices.length === 0) {
      alert("Please fill customer details and add at least one service.");
      return;
    }

    // Logic to send to Firebase would go here
    console.log("Order Created:", { customer, selectedServices, totalAmount, paymentMethod, specialNotes });
    alert("✅ Order Created Successfully!");
  };

  return (
    <div className="p-4 w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">New Order</h1>
        <p className="text-gray-500">Create a new laundry order</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Customer & Services */}
        <section className="md:col-span-7 space-y-6">
          
          {/* Customer Form */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h5 className="text-lg font-semibold mb-4 text-gray-700">👤 Customer Information</h5>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customer.name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customer.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={customer.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h5 className="text-lg font-semibold mb-4 text-gray-700">📦 Services</h5>
            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => (
                <div key={service.id} className="flex justify-between items-center border border-gray-100 p-3 rounded bg-gray-50">
                  <div>
                    <h6 className="font-medium text-gray-800">{service.name}</h6>
                    <small className="text-gray-500">₱{service.price}/kg</small>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Kg"
                      value={inputWeights[service.id] || ""}
                      onChange={(e) => handleWeightChange(service.id, e.target.value)}
                    />
                    <button
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      onClick={() => addService(service)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Order Summary */}
        <aside className="md:col-span-5">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-4">
            <h5 className="text-lg font-semibold mb-4 text-gray-700">📋 Order Summary</h5>
            
            {/* Customer Details Summary */}
            <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p className="font-medium text-gray-800">Customer:</p>
              <p>{customer.name || "No name provided"}</p>
              <p>{customer.phone || "No phone provided"}</p>
              <p>{customer.address}</p>
            </div>

            {/* Selected Services List */}
            <div className="mb-4">
              <p className="font-medium text-gray-800 mb-2">Services ({selectedServices.length})</p>
              <ul className="space-y-2 text-sm">
                {selectedServices.length === 0 ? (
                  <li className="text-gray-400 italic">No services added yet.</li>
                ) : (
                  selectedServices.map((item, index) => (
                    <li key={index} className="flex justify-between text-gray-600 border-b border-dashed border-gray-200 pb-1">
                      <span>{item.weight}kg {item.name}</span>
                      <span className="font-medium text-gray-800">₱{item.subtotal.toFixed(2)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center text-xl font-bold text-gray-900 border-t border-gray-200 pt-3 mb-4">
              <span>Total:</span>
              <span>₱{totalAmount.toFixed(2)}</span>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Add notes..."
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select 
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded transition-colors shadow-sm"
              onClick={handleCreateOrder}
            >
              Create Order
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}