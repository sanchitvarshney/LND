/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // MSCorpres brand teal — built around the website primary #04b0a8
        // and the deep execution teal #017b75.
        brand: {
          50: '#effbf9', 100: '#d4f4ef', 200: '#aae8e1', 300: '#74d6cc',
          400: '#3cc2b6', 500: '#04b0a8', 600: '#03938c', 700: '#017b75',
          800: '#075f5b', 900: '#0a4d4a', 950: '#032f2d',
        },
        // Ink — MSCorpres heading near-black (#020817 family)
        ink: { DEFAULT: '#020817', soft: '#111827', mute: '#5b6472' },
      },
      fontFamily: {
        sans: ['"Work Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Roboto Slab"', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Stripe-style layered elevation
        card: '0 1px 2px rgba(2,8,23,.04), 0 1px 3px rgba(2,8,23,.05), 0 0 0 1px rgba(2,8,23,.03)',
        soft: '0 4px 6px -2px rgba(2,8,23,.05), 0 16px 32px -12px rgba(2,8,23,.14)',
        lift: '0 2px 4px rgba(2,8,23,.04), 0 8px 20px -6px rgba(2,8,23,.10)',
        // brand emphasis (kept names from previous system for compatibility)
        glow: '0 2px 8px -2px rgba(4,176,168,.35), 0 6px 20px -4px rgba(4,176,168,.25)',
        'glow-lg': '0 4px 12px -2px rgba(4,176,168,.4), 0 12px 32px -6px rgba(4,176,168,.3)',
        'glow-cyan': '0 2px 12px -2px rgba(14,165,233,.35)',
        'glow-emerald': '0 2px 12px -2px rgba(16,185,129,.3)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'check-pop': {
          '0%': { transform: 'scale(.4)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(.6)', opacity: '.45' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 2px 10px -2px rgba(4,176,168,.35)' },
          '50%': { boxShadow: '0 4px 22px -2px rgba(4,176,168,.55)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'float-slow': 'float 13s ease-in-out infinite',
        'fade-up': 'fade-up .45s cubic-bezier(.21,.61,.35,1) both',
        'fade-in': 'fade-in .35s ease both',
        shimmer: 'shimmer 2.4s linear infinite',
        'check-pop': 'check-pop .5s cubic-bezier(.34,1.56,.64,1) both',
        ripple: 'ripple 1.6s cubic-bezier(.2,.6,.4,1) infinite',
        'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
