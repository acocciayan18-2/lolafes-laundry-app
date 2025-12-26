import React, { useState, useEffect } from "react";
import { IconUsers, IconSearch, IconPlus } from "../components/icons";
import CustomerStats from "../components/customers/CustomerStats";
import CustomerCard from "../components/customers/CustomerCard";

// Mock Data
const MOCK_CUSTOMERS = [
  { id: 1, name: "Juan Dela Cruz", phone: "09123456789", address: "Unit 101, Taguig City", created_date: new Date().toISOString() },
  { id: 2, name: "Maria Clara", phone: "09987654321", address: "BGC, Taguig", created_date: new Date().toISOString() },
  { id: 3, name: "Jose Rizal", phone: "09111112222", address: "Laguna", created_date: "2023-12-01T10:00:00Z" },
  { id: 4, name: "Andres Bonifacio", phone: "09223334444", address: "Tondo, Manila", created_date: "2023-11-15T08:30:00Z" },
];

// Local UI Helpers
const Input = ({ className, ...props }) => (
  <input 
    className={`flex h-12 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} 
    {...props} 
  />
);

const Button = ({ children, className = "", onClick }) => (
  <button 
    onClick={onClick}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none px-4 py-2 ${className}`}
  >
    {children}
  </button>
);

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setCustomers(MOCK_CUSTOMERS);
    setIsLoading(false);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <IconUsers className="w-8 h-8 text-blue-600" />
              Customers
            </h1>
            <p className="text-gray-600 mt-1">Manage your customer database</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg">
            <IconPlus className="w-5 h-5 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <IconSearch className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search customers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm shadow-sm text-base"
          />
        </div>

        {/* Stats */}
        <CustomerStats customers={customers} />

        {/* List */}
        <div className="grid gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white/60 rounded-xl h-24 animate-pulse shadow-sm" />
            ))
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))
          ) : (
            <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-300">
              <div className="flex justify-center mb-4">
                <IconUsers className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                {searchTerm ? "No customers found" : "No customers yet"}
              </h3>
              <p className="text-gray-400">
                {searchTerm 
                  ? "Try adjusting your search term"
                  : "Customers will appear here when you create orders"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}