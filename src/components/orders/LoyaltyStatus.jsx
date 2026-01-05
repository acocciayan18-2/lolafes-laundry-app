import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { IconGift, IconStar, IconAward } from "../icons";
import { useLoyaltyStore } from "../../store/services/useLoyaltyStore"; 

export const LoyaltyStatus = ({
  customer,
  onApplyFreeService,
  selectedServices, 
  Button,
  Badge,
}) => {
  const { loyaltySettings } = useLoyaltyStore();

  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const detectSize = () => {
      setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", detectSize);
    return () => window.removeEventListener("resize", detectSize);
  }, []);

  if (!loyaltySettings?.is_enabled || !customer) return null;

  // --- LOGIC UPDATE: USE LOYALTY POINTS ---
  // Default to 0 if field doesn't exist yet (for old customers)
  const currentPoints = customer.loyalty_points !== undefined ? customer.loyalty_points : (customer.order_count || 0);
  const required = loyaltySettings.orders_required || 10;

  // Calculate Available Rewards
  // Simple Division: If I have 21 points and need 10, I have 2 rewards available.
  const availableRewards = Math.floor(currentPoints / required);

  // Calculate Progress
  const progressToNext = currentPoints % required;
  const neededForNext = required - progressToNext;

  const isRewardInCart = selectedServices?.some((s) => s.is_reward) || false;
  // ----------------------------------------

  return (
    <>
      {availableRewards > 0 && !isRewardInCart && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
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
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            availableRewards > 0 ? "bg-yellow-500" : "bg-blue-600"
          }`}
        />

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  availableRewards > 0 ? "bg-yellow-50" : "bg-blue-50"
                }`}
              >
                {availableRewards > 0 ? (
                  <IconGift className="w-5 !stroke-yellow-600" />
                ) : (
                  <IconStar className="w-5 !stroke-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-400 leading-none">
                  {availableRewards > 0 ? `${availableRewards} Reward${availableRewards > 1 ? 's' : ''} Ready` : "Loyalty Progress"}
                </h3>
                <p className="text-sm font-medium text-gray-800">
                  {availableRewards > 0
                    ? isRewardInCart 
                        ? "Voucher applied to cart" 
                        : "You can claim a free wash!"
                    : `${neededForNext} more orders to next reward`}
                </p>
              </div>
            </div>

            <Badge
              className={`text-[10px] px-2 py-0.5 font-mono ${
                availableRewards > 0
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {progressToNext}/{required}
            </Badge>
          </div>

          {availableRewards > 0 && (
            <Button
              onClick={onApplyFreeService}
              disabled={isRewardInCart}
              size="sm"
              className={`w-full mt-3 !h-9 font-bold shadow-sm border-none text-xs transition-all duration-200 ${
                isRewardInCart 
                  ? "!bg-gray-100 !text-gray-400 cursor-not-allowed" 
                  : "!bg-yellow-500 hover:!bg-yellow-600 !text-white"
              }`}
            >
              <IconAward className={`w-4 h-4 mr-1 ${isRewardInCart ? "!stroke-gray-400" : "!stroke-white"}`} />
              {isRewardInCart ? "Reward Applied" : "Apply Reward"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};