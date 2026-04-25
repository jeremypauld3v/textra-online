/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#08060d',
          800: '#16171d',
          700: '#1f2028',
        },
        accent: {
          DEFAULT: '#aa3bff',
          hover: '#c084fc',
        }
      },
      fontFamily: {
        pixel: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
