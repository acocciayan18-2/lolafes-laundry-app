import React from "react";
import { useActivityStore } from '../../store/activities/useActivityStore'; 

// --- DATE HELPER ---
const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// --- SOURCE-BASED ICONS (Increased default size to w-6 h-6) ---
const IconLaundryBasket = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <path d="M320 64C326.6 64 332.9 66.7 337.4 71.5L481.4 223.5L481.9 224L560 224C577.7 224 592 238.3 592 256C592 270.5 582.4 282.7 569.2 286.7L523.1 493.9C516.6 523.2 490.6 544 460.6 544L179.3 544C149.3 544 123.3 523.2 116.8 493.9L70.8 286.7C57.6 282.8 48 270.5 48 256C48 238.3 62.3 224 80 224L158.1 224L158.6 223.5L302.6 71.5C307.1 66.7 313.4 64 320 64zM320 122.9L224.2 224L415.8 224L320 122.9zM240 328C240 314.7 229.3 304 216 304C202.7 304 192 314.7 192 328L192 440C192 453.3 202.7 464 216 464C229.3 464 240 453.3 240 440L240 328zM320 304C306.7 304 296 314.7 296 328L296 440C296 453.3 306.7 464 320 464C333.3 464 344 453.3 344 440L344 328C344 314.7 333.3 304 320 304zM448 328C448 314.7 437.3 304 424 304C410.7 304 400 314.7 400 328L400 440C400 453.3 410.7 464 424 464C437.3 464 448 453.3 448 440L448 328z"/>
  </svg>
);

export const IconNewOrder = ({ className = "w-6 h-6" }) => <IconLaundryBasket className={className} />;
export const IconOrdersList = ({ className = "w-6 h-6" }) => <IconLaundryBasket className={className} />;

export const IconServices = ({ className = "w-6 h-6" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <path d="M415.9 274.5C428.1 271.2 440.9 277 446.4 288.3L465 325.9C475.3 327.3 485.4 330.1 494.9 334L529.9 310.7C540.4 303.7 554.3 305.1 563.2 314L582.4 333.2C591.3 342.1 592.7 356.1 585.7 366.5L562.4 401.4C562.4 401.4 562.4 401.4 562.4 401.4C564.3 406.1 566 411 567.4 416.1C568.8 421.2 569.7 426.2 570.4 431.3L608.1 449.9C619.4 455.5 625.2 468.3 621.9 480.4L614.9 506.6C611.6 518.7 600.3 526.9 587.7 526.1L545.7 523.4C539.4 531.5 532.1 539 523.8 545.4L526.5 587.3C527.3 599.9 519.1 611.3 507 614.5L480.8 621.5C468.6 624.8 455.9 619 450.3 607.7L431.7 570.1C421.4 568.7 411.3 565.9 401.8 562L366.8 585.3C356.3 592.3 342.4 590.9 333.5 582L314.3 562.8C305.4 553.9 304 540 311 529.5L334.3 494.5C332.4 489.8 330.7 484.9 329.3 479.8C327.9 474.7 327 469.6 326.3 464.6L288.6 446C277.3 440.4 271.6 427.6 274.8 415.5L281.8 389.3C285.1 377.2 296.4 369 309 369.8L350.9 372.5C357.2 364.4 364.5 356.9 372.8 350.5L370.1 308.7C369.3 296.1 377.5 284.7 389.6 281.5L415.8 274.5zM448.4 404C424.1 404 404.4 423.7 404.5 448.1C404.5 472.4 424.2 492 448.5 492C472.8 492 492.5 472.3 492.5 448C492.4 423.6 472.7 404 448.4 404zM224.9 18.5L251.1 25.5C263.2 28.8 271.4 40.2 270.6 52.7L267.9 94.5C276.2 100.9 283.5 108.3 289.8 116.5L331.8 113.8C344.3 113 355.7 121.2 359 133.3L366 159.5C369.2 171.6 363.5 184.4 352.2 190L314.5 208.6C313.8 213.7 312.8 218.8 311.5 223.8C310.2 228.8 308.4 233.8 306.5 238.5L329.8 273.5C336.8 284 335.4 297.9 326.5 306.8L307.3 326C298.4 334.9 284.5 336.3 274 329.3L239 306C229.5 309.9 219.4 312.7 209.1 314.1L190.5 351.7C184.9 363 172.1 368.7 160 365.5L133.8 358.5C121.6 355.2 113.5 343.8 114.3 331.3L117 289.4C108.7 283 101.4 275.6 95.1 267.4L53.1 270.1C40.6 270.9 29.2 262.7 25.9 250.6L18.9 224.4C15.7 212.3 21.4 199.5 32.7 193.9L70.4 175.3C71.1 170.2 72.1 165.2 73.4 160.1C74.8 155 76.4 150.1 78.4 145.4L55.1 110.5C48.1 100 49.5 86.1 58.4 77.2L77.6 58C86.5 49.1 100.4 47.7 110.9 54.7L145.9 78C155.4 74.1 165.5 71.3 175.8 69.9L194.4 32.3C200 21 212.7 15.3 224.9 18.5zM192.4 148C168.1 148 148.4 167.7 148.4 192C148.4 216.3 168.1 236 192.4 236C216.7 236 236.4 216.3 236.4 192C236.4 167.7 216.7 148 192.4 148z"/>
  </svg>
);

export const IconLoyalty = ({ className = "w-6 h-6" }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
    <path d="M96 128C60.7 128 32 156.7 32 192L32 256C32 264.8 39.4 271.7 47.7 274.6C66.5 281.1 80 299 80 320C80 341 66.5 358.9 47.7 365.4C39.4 368.3 32 375.2 32 384L32 448C32 483.3 60.7 512 96 512L544 512C579.3 512 608 483.3 608 448L608 384C608 375.2 600.6 368.3 592.3 365.4C573.5 358.9 560 341 560 320C560 299 573.5 281.1 592.3 274.6C600.6 271.7 608 264.8 608 256L608 192C608 156.7 579.3 128 544 128L96 128zM448 400L448 240L192 240L192 400L448 400zM144 224C144 206.3 158.3 192 176 192L464 192C481.7 192 496 206.3 496 224L496 416C496 433.7 481.7 448 464 448L176 448C158.3 448 144 433.7 144 416L144 224z"/>
  </svg>
);

const IconActivity = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default function RecentActivity() {
  const activities = useActivityStore((state) => state.activities);

  const getActivityConfig = (item) => {
    const defaultConfig = { 
      title: item?.customLabel || "Update Logged", 
      icon: <IconOrdersList className="w-6 h-6 text-slate-500" /> 
    };

    if (!item) return defaultConfig;

    if (item.actionType === 'created') {
      return { 
        title: item.customLabel || "New Order Created", 
        icon: <IconNewOrder className="w-6 h-6 text-blue-600" /> 
      };
    }

    if (item.customLabel?.toLowerCase().includes("loyalty") || item.order_number === "CONFIG") {
      return { 
        title: item.customLabel, 
        icon: <IconLoyalty className="w-6 h-6 text-purple-600" /> 
      };
    }

    if (item.order_number === "SERVICE" || item.order_number === "NEW" || item.order_number === "EDITED") {
      return { 
        title: item.customLabel, 
        icon: <IconServices className="w-6 h-6 text-emerald-600" /> 
      };
    }

    return { 
      title: item.customLabel || "Status Updated", 
      icon: <IconOrdersList className="w-6 h-6 text-amber-600" /> 
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[450px] min-h-[300px] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <IconActivity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 tracking-tight">Recent Activity</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 !pl-5 mb-6 !pr-5 space-y-3 custom-scrollbar">
        {activities.length > 0 ? (
          activities.map((item) => {
            const config = getActivityConfig(item);
            
            return (
              <div key={item.activity_id} className="flex items-center gap-4 group py-1">
                {/* ICON BOX: Increased color contrast and icon size */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 bg-slate-50 border border-slate-100 shadow-sm`}>
                  {config.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate tracking-tight">
                        {config.title}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        {formatTimeAgo(item.timestamp)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                        {item.customer_name}
                    </p>
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                    <p className="font-mono text-[10px] rounded font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5">
                        #{item.order_number}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
            <IconOrdersList className="w-12 h-12 mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-400">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}