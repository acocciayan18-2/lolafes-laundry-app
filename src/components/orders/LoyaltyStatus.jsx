import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Confetti from "react-confetti";
import { IconGift, IconStar, IconAward } from "../icons";
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore"; 

/**
 * @component LoyaltyStatus
 * @description Enterprise-grade widget for displaying and applying customer loyalty rewards.
 */
export const LoyaltyStatus = ({
  customer,
  onApplyFreeService,
  selectedServices, 
  Button,
  Badge,
}) => {
  // --- GLOBAL STATE ---
  const { loyaltySettings } = useLoyaltyStore();

  // --- LOCAL STATE ---
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState(null);
  const [windowDimension, setWindowDimension] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // --- REFS ---
  const isMounted = useRef(false);

  // --- DERIVED STATE & MEMOIZATION ---
  
  const isEnabled = loyaltySettings?.is_enabled === true;
  const isValidCustomer = customer && typeof customer === 'object';

  // Math Safety: Isolate calculation logic and properly export all required variables
  const { availableRewards, progressToNext, neededForNext, required } = useMemo(() => {
    // Determine the baseline requirement
    const req = Math.max(1, Number(loyaltySettings?.orders_required) || 10); 

    if (!isValidCustomer || !isEnabled) {
      return { availableRewards: 0, progressToNext: 0, neededForNext: 1, required: req };
    }

    const currentPoints = Math.max(0, Number(customer.loyalty_points ?? customer.order_count) || 0);
    
    return {
      availableRewards: Math.floor(currentPoints / req),
      progressToNext: currentPoints % req,
      neededForNext: req - (currentPoints % req),
      required: req // ✨ FIX: Exporting the variable back to the main component scope
    };
  }, [customer, loyaltySettings?.orders_required, isValidCustomer, isEnabled]);

  const isRewardInCart = useMemo(() => {
    if (!Array.isArray(selectedServices)) return false;
    return selectedServices.some((s) => s?.is_reward === true);
  }, [selectedServices]);

  const shouldShowConfetti = availableRewards > 0 && !isRewardInCart;

  // --- LIFECYCLE ---
  
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // PERFORMANCE: Conditional & Debounced Resize Listener
  useEffect(() => {
    if (!shouldShowConfetti) return;

    let timeoutId;
    const detectSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isMounted.current) {
          setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        }
      }, 150);
    };
    
    window.addEventListener("resize", detectSize, { passive: true });
    
    return () => {
      window.removeEventListener("resize", detectSize);
      clearTimeout(timeoutId);
    };
  }, [shouldShowConfetti]);

  // --- HANDLERS ---

  const handleApplyReward = useCallback(async () => {
    if (isApplying || isRewardInCart || availableRewards <= 0) return;

    setIsApplying(true);
    setError(null);

    try {
      if (typeof onApplyFreeService !== 'function') {
        throw new Error("System error: Reward handler configuration missing.");
      }
      
      await onApplyFreeService(); 
      
    } catch (err) {
      if (isMounted.current) {
        console.error("[LoyaltyStatus] Reward Application Error:", err?.message || err);
        setError(err?.message?.substring(0, 100) || "Failed to apply reward. Try again.");
      }
    } finally {
      if (isMounted.current) {
        setIsApplying(false);
      }
    }
  }, [isApplying, isRewardInCart, availableRewards, onApplyFreeService]);


  // --- EARLY RETURN ---
  if (!isEnabled || !isValidCustomer) return null;

  // --- RENDER ---
  return (
    <section aria-labelledby="loyalty-status-title" className="relative">
      {shouldShowConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden="true">
          <Confetti
            width={windowDimension.width}
            height={windowDimension.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.15}
            initialVelocityX={10}
            initialVelocityY={20}
            colors={['#EAB308', '#CA8A04', '#FDE047', '#3B82F6', '#60A5FA']}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden relative z-10">
        <div
          aria-hidden="true"
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            availableRewards > 0 ? "bg-amber-500" : "bg-blue-600"
          }`}
        />

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  availableRewards > 0 ? "bg-amber-50" : "bg-blue-50"
                }`}
              >
                {availableRewards > 0 ? (
                  <IconGift className="w-5 !stroke-amber-600" />
                ) : (
                  <IconStar className="w-5 !stroke-blue-600" />
                )}
              </div>
              <div>
                <h3 id="loyalty-status-title" className="text-nano font-medium uppercase text-text-dark/40 leading-none">
                  {availableRewards > 0 ? `${availableRewards} Reward${availableRewards > 1 ? 's' : ''} Ready` : "Loyalty Progress"}
                </h3>
                <p className="text-sm-text font-medium text-text-dark mt-1" aria-live="polite">
                  {availableRewards > 0
                    ? isRewardInCart 
                        ? "Voucher applied to cart" 
                        : "You can claim a free service!"
                    : `${neededForNext} more orders to next reward`}
                </p>
              </div>
            </div>

            <Badge
              aria-label={`Progress: ${progressToNext} out of ${required}`}
              className={`text-micro px-2 py-0.5 tracking-tighter ${
                availableRewards > 0
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-blue-100 text-blue-800 border-blue-200"
              }`}
            >
              {progressToNext}/{required}
            </Badge>
          </div>

          {error && (
            <div role="alert" className="mt-1 mb-2 p-1.5 bg-rose-50 text-rose-600 text-nano rounded-md border border-rose-100 text-center animate-fade-in">
              {error}
            </div>
          )}

          {availableRewards > 0 && (
            <Button
              onClick={handleApplyReward}
              disabled={isRewardInCart || isApplying}
              aria-busy={isApplying}
              size="sm"
              className={`w-full mt-2 !h-9 text-micro font-bold shadow-sm border-none transition-all duration-200 tracking-widest flex justify-center items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 ${
                isRewardInCart || isApplying
                  ? "!bg-gray-100 !text-text-dark/70 cursor-not-allowed" 
                  : "!bg-amber-500 hover:!bg-amber-600 !text-white active:scale-95"
              }`}
            >
              {isApplying ? (
                "Applying..."
              ) : (
                <>
                  <IconAward aria-hidden="true" className={`w-4 h-4 mr-1.5 ${isRewardInCart ? "!stroke-text-dark/70" : "!stroke-white"}`} />
                  {isRewardInCart ? "Reward Applied" : "Apply Reward"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};