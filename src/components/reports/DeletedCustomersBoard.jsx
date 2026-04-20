import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion'; 
import { IconTrash, IconInfo } from '../icons'; 

// ✨ APPLIED: Added the onDataStatus prop to communicate with the parent
export default function DeletedCustomersBoard({ onDataStatus }) {
  const [archivedCustomers, setArchivedCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States for Info Tooltip
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef(null);

  // Click-Outside Listener for Tooltip
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setShowInfo(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

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
  }, [onDataStatus]);

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
    <section 
      className="bg-white rounded-xl shadow-md border border-app-dark/10 transition-all duration-300 flex flex-col max-h-[350px]  overflow-hidden mt-4"
      aria-labelledby="deleted-customers-heading"
    >
      <div className="p-5 flex-1 flex flex-col overflow-hidden">
        
        {/* --- HEADER --- */}
        <header className="flex justify-between items-start gap-1 mb-4 shrink-0">
          
          {/* LEFT: Title, Info & Badge */}
          <div className="min-w-0 flex-1 relative" ref={infoRef}>
            
            <div className="flex items-center gap-2 mb-1">
              <h2 id="deleted-customers-heading" className="text-sm-text font-bold text-text-dark/70 truncate uppercase tracking-tight">
                Archived Customers
              </h2>
              
              <button 
                onClick={() => setShowInfo(!showInfo)} 
                className="text-text-dark/30 hover:text-app-dark focus:outline-none focus-visible:ring-2 rounded-full"
                aria-label="Information about Archived Customers"
                aria-expanded={showInfo}
              >
                 <IconInfo className="w-4 h-4" aria-hidden="true" />
              </button>
              
              <AnimatePresence>
                {showInfo && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="absolute left-0 top-7 w-64 p-3 bg-white border border-app-dark/30 shadow-xl rounded-lg z-[100]"
                    role="tooltip"
                  >
                    <p className="text-sm-text text-text-dark/90 leading-relaxed font-normal">
                     A read-only archive of deleted customer profiles. This ensures that historical order data remains intact even after a customer is removed from the active system.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BADGE (Below Title) */}
            <div className="relative mt-2 flex items-center gap-1.5 z-10">
              <span className=" text-rose-600 text-micro font-bold px-1.5 py-0.5 " aria-label={`${archivedCustomers.length} archived customers visible`}>
                {archivedCustomers.length} Deleted Profiles
              </span>
            </div>

          </div>

          {/* RIGHT: Icon Block */}
          <div className="p-2.5 rounded-lg border border-app-dark/10 shadow-hollow shrink-0 " aria-hidden="true">
            <IconTrash className="w-5 h-5 text-text-dark" />
          </div>
          
        </header>

        {/* --- WIDGET LIST / BODY --- */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" aria-live="polite" aria-busy={isLoading}>
          
          {/* State Handlers */}
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center opacity-70 py-10">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm-text text-text-dark/80  ">Loading archives...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center py-10 opacity-70">
              <p className="text-sm-text text-rose-600  ">{error}</p>
            </div>
          ) : archivedCustomers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-10 opacity-50">
              <IconTrash className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
              <p className="text-sm-text text-text-dark font-bold">No deleted customers found</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {archivedCustomers.map((customer) => (
                  <motion.div
                    layout
                    key={customer.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full text-left relative overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-300 group p-3.5"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/50 transition-all group-hover:bg-rose-400 group-hover:w-1.5" aria-hidden="true" />

                    <div className="flex items-start justify-between pl-2">
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
                      
                      <div className="shrink-0 flex flex-col items-end">
                        <span className="text-micro text-rose-600 font-bold leading-tight">
                          {formatSafeDate(customer.archivedAt)}
                        </span>
                        <span className="text-nano text-text-dark/50 mt-0.5 uppercase font-bold tracking-wider">
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
    </section>
  );
}