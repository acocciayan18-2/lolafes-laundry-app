export const NewOrderSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2">
      
      {/* HEADER SKELETON */}
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-64 bg-gray-200 rounded-md"></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* LEFT COLUMN SKELETON */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Form Box */}
          <div className="h-48 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
             <div className="h-6 w-32 bg-gray-200 rounded"></div>
             <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-gray-100 rounded-xl"></div>
                <div className="h-12 bg-gray-100 rounded-xl"></div>
             </div>
          </div>

          {/* Service Selector Box */}
          <div className="h-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
             <div className="h-6 w-40 bg-gray-200 rounded"></div>
             <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-20 bg-gray-100 rounded-full"></div>
                ))}
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-24 bg-gray-50 rounded-xl"></div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN SKELETON (Summary) */}
        <div className="lg:col-span-1">
          <div className="h-[500px] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="h-8 w-full bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-50 rounded-xl"></div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-full bg-gray-100 rounded"></div>
              <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
            </div>
            <div className="h-12 w-full bg-gray-200 rounded-xl mt-auto"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// src/components/skeleton-loader.jsx

// ... keep your NewOrderSkeleton here

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2 space-y-4">
      
      {/* HEADER GHOST */}
      <div className="flex flex-row justify-between gap-6 pt-2">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-48 bg-gray-200 rounded-md"></div>
        </div>
        <div className="flex gap-2">
           <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
           <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      {/* INTELLIGENCE TICKER GHOST */}
      <div className="h-12 w-full bg-white/60 rounded-xl border border-gray-100 shadow-sm"></div>

      {/* QUICK STATS GHOST (4 Boxes) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="h-4 w-20 bg-gray-100 rounded"></div>
              <div className="h-7 w-7 bg-gray-100 rounded-lg"></div>
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>

      {/* DATA GRIDS GHOST (Two large side-by-side boxes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today Orders Ghost */}
        <div className="lg:col-span-6 h-[420px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-gray-50 rounded-xl"></div>
          ))}
        </div>
        {/* Activity Ghost */}
        <div className="lg:col-span-6 h-[420px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
           <div className="h-6 w-32 bg-gray-200 rounded"></div>
           {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-full shrink-0"></div>
              <div className="space-y-2 w-full">
                <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-50 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);


// src/components/skeleton-loader.jsx

export const OrderListSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2">
      
      {/* HEADER GHOST */}
      <div className="flex flex-row items-center mb-6 gap-4 pt-2">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
            <div className="h-5 w-8 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-4 w-52 bg-gray-200 rounded-md mt-2"></div>
        </div>
        <div className="w-9 h-9 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
      </div>

      {/* SEARCH & FILTERS GHOST */}
      <div className="flex flex-col lg:flex-row gap-2 mb-6">
        <div className="relative w-full lg:flex-1 h-11 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        <div className="flex gap-2 h-11">
           <div className="w-32 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
           <div className="w-32 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>

      {/* ORDER CARDS LIST GHOST */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-5 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-100 rounded"></div>
              </div>
              <div className="flex gap-4">
                <div className="h-3 w-32 bg-gray-100 rounded"></div>
                <div className="h-3 w-24 bg-gray-100 rounded"></div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-16 bg-gray-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// src/components/skeleton-loader.jsx

export const CustomerListSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2 space-y-4">
      
      {/* HEADER GHOST */}
      <div className="flex justify-between items-center mb-3 pt-2">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-56 bg-gray-200 rounded-md"></div>
        </div>
      </div>

      {/* SEARCH BAR GHOST */}
      <div className="h-12 w-full bg-white rounded-xl border border-gray-100 shadow-sm mb-3"></div>

      {/* STATS GHOST (e.g., 3 small boxes) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/60 rounded-xl border border-gray-100 shadow-sm"></div>
        ))}
      </div>

      {/* CUSTOMER CARDS GHOST */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-full bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            {/* Avatar Ghost */}
            <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0"></div>
            
            {/* Details Ghost */}
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
              <div className="flex gap-4">
                <div className="h-3 w-24 bg-gray-100 rounded"></div>
                <div className="h-3 w-32 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// src/components/skeleton-loader.jsx

export const ServicesSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2 space-y-4">
      
      {/* HEADER GHOST */}
      <div className="flex justify-between items-center mb-3 pt-2">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-52 bg-gray-200 rounded-md"></div>
        </div>
        <div className="w-9 h-9 bg-white rounded-xl border border-gray-100 shadow-sm"></div>
      </div>

      {/* LOYALTY SETTINGS GHOST */}
      <div className="h-24 w-full bg-white/60 rounded-2xl border border-gray-100 shadow-sm mb-3"></div>

      {/* SERVICES LIST GHOST */}
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Icon Circle Ghost */}
              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0"></div>
              
              {/* Name and Price Ghost */}
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-20 bg-gray-100 rounded"></div>
              </div>
            </div>

            {/* Actions Ghost */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-16 bg-gray-50 rounded-lg"></div>
              <div className="h-8 w-8 bg-gray-50 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// src/components/skeleton-loader.jsx

export const ReportsSkeleton = () => (
  <div className="min-h-screen bg-app-light p-2 animate-pulse">
    <div className="max-w-6xl mx-auto px-1 md:px-2 space-y-6">
      
      {/* HEADER GHOST */}
      <div className="pt-2 space-y-2">
        <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
        <div className="h-4 w-52 bg-gray-200 rounded-md"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* KPI CARDS GHOST */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm"></div>
        ))}

        {/* SALES PERFORMANCE GHOST */}
        <div className="lg:col-span-4 h-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-5 w-48 bg-gray-200 rounded"></div>
          <div className="h-full w-full bg-gray-50 rounded-xl"></div>
        </div>

        {/* OPERATIONAL PULSE GHOST */}
        <div className="lg:col-span-4 h-48 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded"></div>
          <div className="h-full w-full bg-gray-50 rounded-xl"></div>
        </div>

        {/* BOTTOM ROW GHOSTS */}
        <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-full w-full bg-gray-100 rounded-xl"></div>
        </div>
        <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-full w-full bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);