import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { IconGift, IconStar, IconAward } from "../icons";
// Ensure you have an IconLoading or use a simple text fallback
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore"; 

export const LoyaltyStatus = ({
  customer,
  onApplyFreeService,
  selectedServices, 
  Button,
  Badge,
}) => {
  const { loyaltySettings } = useLoyaltyStore();

  // 1. New states for async operations and error handling
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState(null);

  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // 2. PERFORMANCE: Debounced Resize Listener
  useEffect(() => {
    let timeoutId;
    const detectSize = () => {
      clearTimeout(timeoutId);
      // Wait 150ms after the user stops resizing before updating state
      timeoutId = setTimeout(() => {
        setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
      }, 150);
    };
    
    window.addEventListener("resize", detectSize);
    return () => {
      window.removeEventListener("resize", detectSize);
      clearTimeout(timeoutId); // Cleanup to prevent memory leaks
    };
  }, []);

  if (!loyaltySettings?.is_enabled || !customer) return null;

  // 3. MATH SAFETY: Prevent negative numbers and Division by Zero
  const currentPoints = Math.max(0, customer.loyalty_points !== undefined ? customer.loyalty_points : (customer.order_count || 0));
  const required = Math.max(1, loyaltySettings.orders_required || 10); // Enforce minimum of 1
  
  const availableRewards = Math.floor(currentPoints / required);
  const progressToNext = currentPoints % required;
  const neededForNext = required - progressToNext;
  const isRewardInCart = selectedServices?.some((s) => s.is_reward) || false;

  // 4. SECURE HANDLER: Prevent double-clicks and handle backend errors
  const handleApplyReward = async () => {
    if (isApplying || isRewardInCart) return;

    setIsApplying(true);
    setError(null);

    try {
      if (onApplyFreeService) {
        await onApplyFreeService(); // Wait for the store/backend to apply it
      }
    } catch (err) {
      console.error("Reward Application Error:", err);
      setError("Failed to apply reward. Try again.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      {availableRewards > 0 && !isRewardInCart && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          <Confetti
            width={windowDimension.width}
            height={windowDimension.height}
            recycle={false} // Prevents infinite loop memory leak
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
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            availableRewards > 0 ? "bg-amber-500" : "bg-blue-600"
          }`}
        />

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
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
                <h3 className="text-nano font-medium uppercase  text-text-dark/40 leading-none">
                  {availableRewards > 0 ? `${availableRewards} Reward${availableRewards > 1 ? 's' : ''} Ready` : "Loyalty Progress"}
                </h3>
                <p className="text-sm-text font-medium text-text-dark mt-1">
                  {availableRewards > 0
                    ? isRewardInCart 
                        ? "Voucher applied to cart" 
                        : "You can claim a free service!"
                    : `${neededForNext} more orders to next reward`}
                </p>
              </div>
            </div>

            <Badge
              className={`text-micro px-2 py-0.5 tracking-tighter ${
                availableRewards > 0
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-blue-100 text-blue-800 border-blue-200"
              }`}
            >
              {progressToNext}/{required}
            </Badge>
          </div>

          {/* ERROR MESSAGE DISPLAY */}
          {error && (
            <div className="mt-1 mb-2 p-1.5 bg-red-50 text-red-500 text-nano rounded-md border border-red-100 text-center">
              {error}
            </div>
          )}

          {availableRewards > 0 && (
            <Button
              onClick={handleApplyReward}
              disabled={isRewardInCart || isApplying}
              size="sm"
              className={`w-full mt-2 !h-9 text-micro font-bold shadow-sm border-none transition-all duration-200 tracking-widest flex justify-center items-center ${
                isRewardInCart || isApplying
                  ? "!bg-gray-100 !text-text-dark/70 cursor-not-allowed" 
                  : "!bg-amber-500 hover:!bg-amber-600 !text-white active:scale-95"
              }`}
            >
              {isApplying ? (
                "Applying..."
              ) : (
                <>
                  <IconAward className={`w-4 h-4 mr-1.5 ${isRewardInCart ? "!stroke-text-dark/70" : "!stroke-white"}`} />
                  {isRewardInCart ? "Reward Applied" : "Apply Reward"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};