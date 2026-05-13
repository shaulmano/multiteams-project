/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0f1117',
          800: '#161b27',
          700: '#1e2537',
          600: '#252d42',
          500: '#2d3654'
        }
      }
    }
  },
  plugins: []
};
