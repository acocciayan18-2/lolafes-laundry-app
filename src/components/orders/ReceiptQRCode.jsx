import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSettingsStore } from '../store/settings/useSettingsStore';
// ✨ IMPORT CRYPTO TOOLS
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Hex from 'crypto-js/enc-hex';

export const ReceiptQRCode = React.memo(({ orderNumber }) => {
  const systemConfig = useSettingsStore((state) => state.systemConfig);
  const isEnabled = systemConfig?.enableOrderTracking ?? true;

  const trackingUrl = useMemo(() => {
    if (!orderNumber || !isEnabled) return "";
    
    const safeId = orderNumber.toUpperCase();
    const secretKey = import.meta.env.VITE_TRACKING_SECRET || "lola-fe-super-secret-key-2026";
    
    const signature = hmacSHA256(safeId, secretKey).toString(Hex).substring(0, 8);
    
    const baseUrl = "https://customer-site-lolafes-laundry.vercel.app"; 
    
    return `${baseUrl}/track/${safeId.toLowerCase()}/${signature}`;
  }, [orderNumber, isEnabled]);

  if (!isEnabled || !trackingUrl) return null;

  return (
    <div className="flex flex-col items-center justify-center py-4 mt-4 border-t border-black border-dashed">
      <p className="text-micro font-bold uppercase tracking-widest text-black mb-2 text-center">
        Scan to Track Order
      </p>
      
      <div className="p-2 bg-white">
        <QRCodeSVG 
          value={trackingUrl} 
          size={120} 
          level="M" 
          marginSize={2} 
          fgColor="#000000" 
          bgColor="#FFFFFF"
        />
      </div>
      
    </div>
  );
});

ReceiptQRCode.displayName = "ReceiptQRCode";