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
        'xxs': '12px',
      },
      colors: {
        // These names match the variables in index.css
        main: 'var(--color-bg-main)',
        card: 'var(--color-bg-card)',
        surface: 'var(--color-bg-surface)',
        'border-theme': 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
      },
    },
  },
}
