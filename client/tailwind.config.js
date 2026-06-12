/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-theme remap: the app was written light-first against the slate scale,
        // so the scale is inverted here — slate-900 renders near-white, slate-50 near-black.
        slate: {
          50: '#0a0f1f', 100: '#111a33', 200: '#22304f', 300: '#3d4d78',
          400: '#7e8db4', 500: '#98a6cb', 600: '#b3bfdd', 700: '#cdd6ec',
          800: '#e3e9f8', 900: '#f3f6ff', 950: '#ffffff',
        },
        brand: {
          50: '#101736', 100: '#16204a', 200: '#26336e', 300: '#9db1ff',
          400: '#7d94ff', 500: '#6478ff', 600: '#5560f8', 700: '#4f46e5',
          800: '#4338ca', 900: '#312e81', 950: '#0b1026',
        },
        accent: { cyan: '#22d3ee', violet: '#a78bfa', fuchsia: '#e879f9' },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 32px rgba(3,7,22,.45)',
        soft: '0 16px 48px rgba(3,7,22,.55)',
        glow: '0 0 24px rgba(100,120,255,.35)',
        'glow-lg': '0 0 18px rgba(100,120,255,.5), 0 0 60px rgba(100,120,255,.25)',
        'glow-cyan': '0 0 24px rgba(34,211,238,.35)',
        'glow-emerald': '0 0 24px rgba(52,211,153,.35)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 18px rgba(100,120,255,.35)' },
          '50%': { boxShadow: '0 0 38px rgba(100,120,255,.65)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'check-pop': {
          '0%': { transform: 'scale(.4)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ripple: {
          '0%': { transform: 'scale(.6)', opacity: '.45' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'fade-up': 'fade-up .5s ease both',
        shimmer: 'shimmer 3.2s linear infinite',
        'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
        'spin-slow': 'spin-slow 14s linear infinite',
        'fade-in': 'fade-in .35s ease both',
        'check-pop': 'check-pop .5s cubic-bezier(.34,1.56,.64,1) both',
        ripple: 'ripple 1.6s cubic-bezier(.2,.6,.4,1) infinite',
      },
    },
  },
  plugins: [],
};
