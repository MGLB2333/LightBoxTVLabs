/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#BEFA4F',
          teal: '#5AA7B9',
          pink: '#E83399',
          purple: '#513A6B',
        },
        primary: {
          50: '#e6f7fc',
          100: '#bfeafb',
          200: '#99def9',
          300: '#66ccef',
          400: '#33b9e5',
          500: '#02b3e5',
          600: '#029fcf',
          700: '#027fa5',
          800: '#025f7a',
          900: '#013f50',
        },
      }
    },
  },
  plugins: [],
} 