import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion'; 
import { IconTrash } from '../icons'; 

// ✨ APPLIED: Added the onDataStatus prop to communicate with the parent
export default function DeletedCustomersBoard({ onDataStatus }) {
  const [archivedCustomers, setArchivedCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'deleted_customers'),
      orderBy('archivedAt', 'desc'),
      limit(50) 
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArchivedCustomers(data);
        setIsLoading(false);
        
        // ✨ FIRE THE CALLBACK: Tell the parent if it should stay visible or hide
        if (onDataStatus) {
          onDataStatus(data.length > 0);
        }
      }, 
      (err) => {
        console.error("[DeletedCustomersBoard] Error:", err);
        setError("Failed to load archived customers.");
        setIsLoading(false);
        
        // ✨ Hide on error to keep the dashboard clean
        if (onDataStatus) onDataStatus(false); 
      }
    );

    return () => unsubscribe();
  }, [onDataStatus]); // ✨ Added dependency

  const formatSafeDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch (e) {
      return "Invalid";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border flex flex-col max-h-[450px] overflow-hidden relative mt-4">
      
      {/* --- WIDGET HEADER --- */}
      <div className="px-5 py-3.5 border-b border-rose-50 flex justify-between items-center">
        <div className="flex items-center gap-3 pl-2">
          <div className="p-1.5 bg-white border rounded-lg text-text-dark shadow-hollow">
            <IconTrash className="w-5 h-5 text-rose-500" /> 
          </div>
          <div>
            <h2 className="text-base-text font-bold text-text-dark">Archived Customers</h2>
            <p className="text-micro font-normal text-rose-600">Deleted profiles & stats</p>
          </div>
        </div>
        <span 
          className="bg-app-dark/5 text-text-dark text-micro px-2 py-0.5 rounded-full" 
          aria-label={`${archivedCustomers.length} archived customers visible`}
        >
          {archivedCustomers.length}
        </span>
      </div>

      {/* --- WIDGET LIST --- */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        
        {/* State Handlers */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin mb-4"></div>
            <p className="text-sm-text text-slate-500">Loading archives...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-10 bg-rose-50 rounded-2xl border border-rose-100 mx-1">
            <p className="text-sm-text text-rose-600">{error}</p>
          </div>
        ) : archivedCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mx-1">
            <p className="text-sm-text text-slate-500">No deleted customers found.</p>
          </div>
        ) : (
          
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {archivedCustomers.map((customer) => (
                <motion.div
                  layout
                  key={customer.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-rose-100/60 shadow-sm hover:shadow-md hover:border-rose-300 transition-all duration-300 group p-3.5"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-400 transition-all group-hover:w-2" aria-hidden="true" />

                  <div className="flex items-start justify-between pl-1.5">
                    <div className="min-w-0 pr-3 flex flex-col">
                      <h3 className="text-sm-text font-bold text-text-dark truncate">
                        {customer.name || "Unknown"}
                      </h3>
                      <span className="text-micro text-text-dark/60 truncate mt-0.5">
                        {customer.phone || "No phone recorded"}
                      </span>
                      <span className="text-micro text-text-dark/60 truncate">
                        {customer.address || "No address recorded"}
                      </span>
                    </div>
                    
                    <div className="shrink-0 flex flex-col items-end px-1">
                      <span className="text-micro text-rose-600 leading-tight">
                        {formatSafeDate(customer.archivedAt)}
                      </span>
                      <span className="text-micro text-text-dark mt-0.5 font-bold">
                        {customer.order_count || 0} orders
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}