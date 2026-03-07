/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
   "./src/**/*.{js,jsx,ts,tsx}",
  ],
  plugins: [],
  theme: {
    extend: {
      fontSize: {
        // --- PROFESSIONAL TYPOGRAPHY SCALE ---
        'h1': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'base-text': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'sm-text': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'micro': ['11px', { lineHeight: '14px', fontWeight: '600' }],
        'nano': ['10px', { lineHeight: '12px', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      colors: {
        // Base Theme Colors
        'app-light': '#F9FAFB',
        'app-light-secondary': '#F3f4f6',
        'app-dark': '#252525',
        'text-dark': '#1F2937',
        'text-light': '#E5E7EB',
        
        // Primary Action
        'btn-primary': '#0284c7',

        
        'status-pending': '#ffb414ff',   // Electric Yellow
        'status-process': '#2563eb',    // Power Blue
        'status-ready': '#059669',      // Rich Emerald
        'status-complete': '#7c3aed',   // Royal Violet
        'status-picked': '#4b5563',     // Steel Gray

        //  'status-pending': '#1F2937',   // Electric Yellow
        // 'status-process': '#1F2937',    // Power Blue
        // 'status-ready': '#1F2937',      // Rich Emerald
        // 'status-complete': '#1F2937',   // Royal Violet
        // 'status-picked': '#1F2937',     // Steel Gray
      },
      boxShadow: {
        'hollow': 'inset 3px 3px 6px 0px rgba(0, 0, 0, 0.1), inset -3px -3px 6px 0px rgba(255, 255, 255, 1)',
      }
    },
  },
}