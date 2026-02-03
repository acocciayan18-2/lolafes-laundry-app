import { Shirt } from 'lucide-react';

const ANIMATION_CONFIG = {
  duration: '1.5s',
};

export default function LaundryLoader({ className = "" }) {
  return (
    <div className={`relative w-24 h-24 ${className}`}>
      
      {/* Machine Body */}
      <div className="absolute inset-0 rounded-3xl bg-white shadow-md border border-gray-300" />

      {/* Glass Door & Animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gray-100/50 border-4 border-gray-300 backdrop-blur-sm flex items-center justify-center">
        <div
          className="w-full h-full flex items-center justify-center animate-spin"
          style={{ animationDuration: ANIMATION_CONFIG.duration }}
        >
          <Shirt className="w-8 h-8 text-gray-600 -rotate-45" />
        </div>
      </div>

      {/* Control Panel Details */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-gray-500 rounded-full shadow-lg" />
      <div className="absolute top-2 right-5 w-2 h-2 bg-gray-400 rounded-full" />
      
    </div>
  );
}