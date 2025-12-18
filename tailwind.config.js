/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brimo: {
          primary: '#00529C', // BRImo Navy
          secondary: '#0077C8', // Lighter Blue
          accent: '#F97316', // Orange
          bg: '#F9FAFB', // Off-white
        },
        slate: '#1E293B', // Define slate base color for user's convenience
      }
    },
  },
  plugins: [],
}
