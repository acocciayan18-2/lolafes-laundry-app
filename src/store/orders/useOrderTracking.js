/**
 * @file useOrderTracking.js
 * @version 1.1.0 - Enterprise Edition
 * @description Secure, read-only data hook for public order tracking.
 * Implements strict input sanitization, case-insensitive URL parsing, and PII masking.
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

// ==========================================
// 🛡️ SECURITY & UTILITIES
// ==========================================

/**
 * @description Prevents NoSQL Injection and XSS via the URL parameters.
 * Automatically converts lowercase inputs (ord-123) to database uppercase (ORD-123).
 */
const sanitizeOrderId = (rawId) => {
  if (typeof rawId !== 'string') return "";
  // ✨ FIX: Added .toUpperCase() and restricted the regex to uppercase letters and numbers
  return rawId.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 20);
};

/**
 * @description Masks customer identity for public viewing (e.g., "Maria D." -> "M**** D.")
 * Complies with data privacy standards.
 */
const maskPII = (name) => {
  if (!name || name.length < 2) return "Customer";
  const parts = name.split(" ");
  if (parts.length === 1) return `${name.charAt(0)}****`;
  return `${parts[0].charAt(0)}**** ${parts[parts.length - 1].charAt(0)}.`;
};

// ==========================================
// ⚛️ DATA ORCHESTRATOR
// ==========================================

export const useOrderTracking = (rawOrderNumber) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(async () => {
    const safeOrderNumber = sanitizeOrderId(rawOrderNumber);
    
    if (!safeOrderNumber) {
      setError("Invalid Tracking Link.");
      setIsLoading(false);
      return;
    }

    try {
      // Limit(1) ensures we don't accidentally fetch multiple records
      const q = query(
        collection(db, "orders"), 
        where("order_number", "==", safeOrderNumber), 
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError("Order not found. Please check your tracking link.");
        setOrder(null);
      } else {
        const rawData = snapshot.docs[0].data();
        
        const safePayload = {
          order_number: rawData.order_number,
          status: rawData.status || 'pending',
          customer_name: maskPII(rawData.customer_name),
          handover_method: rawData.handover_method,
          services_count: Array.isArray(rawData.services) ? rawData.services.length : 0,
          created_at: rawData.created_at?.toDate()?.toISOString() || null
        };
        
        setOrder(safePayload);
        setError(null);
      }
    } catch (err) {
      console.error("[Tracking System] Query Error:", err);
      setError("Unable to connect to the tracking server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [rawOrderNumber]);

  useEffect(() => {
    fetchOrder();
    
    const pollInterval = setInterval(fetchOrder, 60000);
    return () => clearInterval(pollInterval);
  }, [fetchOrder]);

  return { order, isLoading, error, refetch: fetchOrder };
};