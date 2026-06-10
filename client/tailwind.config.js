/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3fb', 100: '#d7e3f6', 200: '#b0c6ec', 300: '#84a4df',
          400: '#5b82d1', 500: '#3b62bd', 600: '#2c4a7c', 700: '#243d66',
          800: '#1f3454', 900: '#14213d', 950: '#0f1b2d',
        },
      },
      fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(16,27,45,.08), 0 1px 2px rgba(16,27,45,.04)', soft: '0 4px 20px rgba(16,27,45,.08)' },
    },
  },
  plugins: [],
};
