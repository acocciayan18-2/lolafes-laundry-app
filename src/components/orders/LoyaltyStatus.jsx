import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { IconGift, IconStar, IconAward } from "../icons";

export const LoyaltyStatus = ({
  customer,
  loyaltySettings,
  onApplyFreeService,
  selectedServices, // Added this prop
  Button,
  Badge,
}) => {
  const [windowDimension, setWindowDimension] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const detectSize = () => {
      setWindowDimension({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", detectSize);
    return () => window.removeEventListener("resize", detectSize);
  }, []);

  if (!loyaltySettings?.is_enabled || !customer) return null;

  const orderCount = customer.order_count || 0;
  const required = loyaltySettings.orders_required;
  const isEligible = orderCount >= required;

  // Check if a reward item is already present in the cart
  const isRewardApplied = selectedServices?.some((s) => s.is_reward) || false;

  return (
    <>
      {/* --- CONFETTI LAYER --- */}
      {isEligible && !isRewardApplied && (
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

      {/* --- MAIN COMPONENT CARD --- */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden relative z-10">
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 ${
            isEligible ? "bg-yellow-500" : "bg-blue-600"
          }`}
        />

        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isEligible ? "bg-yellow-50" : "bg-blue-50"
                }`}
              >
                {isEligible ? (
                  <IconGift className="w-5 !stroke-yellow-600" />
                ) : (
                  <IconStar className="w-5 !stroke-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-black text-[10px] uppercase tracking-wider text-gray-400 leading-none">
                  {isEligible ? "Reward Unlocked" : "Loyalty"}
                </h3>
                <p className="text-sm font-bold text-gray-900">
                  {isEligible
                    ? isRewardApplied ? "Reward in Cart" : "Free Wash Ready!"
                    : `${required - orderCount} more orders`}
                </p>
              </div>
            </div>

            <Badge
              className={`text-[10px] px-2 py-0.5 font-mono ${
                isEligible
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {orderCount}/{required}
            </Badge>
          </div>

          {/* Claim Button Logic */}
          {isEligible && (
            <Button
              onClick={onApplyFreeService}
              disabled={isRewardApplied}
              size="sm"
              className={`w-full mt-3 !h-9 font-bold shadow-sm border-none text-xs transition-all duration-200 ${
                isRewardApplied 
                  ? "!bg-gray-100 !text-gray-400 cursor-not-allowed" 
                  : "!bg-yellow-500 hover:!bg-yellow-600 !text-white"
              }`}
            >
              <IconAward className={`w-4 h-4 mr-1 ${isRewardApplied ? "!stroke-gray-400" : "!stroke-white"}`} />
              {isRewardApplied ? "Reward Applied" : "Apply Reward"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};