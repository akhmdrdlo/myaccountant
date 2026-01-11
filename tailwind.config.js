/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brimo: {
          primary: '#00529C', // BRImo Navy
          secondary: '#0077C8', // Lighter Blue
          accent: '#F97316', // Orange
          bg: '#F9FAFB', // Off-white
        },
        slate: {
          900: '#0f172a', // Restore standard slate-900 or redefine explicitly if needed
        }
      }
    },
  },
  plugins: [],
}
