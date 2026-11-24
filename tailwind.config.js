/** @type {import('tailwindcss').Config} */
// Palet Rplanner (lihat docs/BRANDKIT.md).
// Skala bawaan Tailwind (blue, green, red, amber, orange, gray) sengaja ditimpa
// dengan turunan warna brand, supaya komponen lama ikut konsisten.
const v = (name) => `rgb(var(--rp-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        rp: {
          canvas: v('canvas'),
          surface: v('surface'),
          'surface-2': v('surface-2'),
          line: v('line'),
          navy: v('navy'),
          royal: v('royal'),
          sky: v('sky'),
          mist: v('mist'),
          action: v('action'),
          'action-press': v('action-press'),
          in: v('in'),
          'in-soft': v('in-soft'),
          out: v('out'),
          'out-soft': v('out-soft'),
          warn: v('warn'),
          'warn-soft': v('warn-soft'),
          ink: v('ink'),
          'ink-2': v('ink-2'),
          'ink-inverse': v('ink-inverse'),
        },
        blue: {
          50: '#EEF5FD', 100: '#DCEAFB', 200: '#BCD6F6', 300: '#8DB9EF', 400: '#5A97E6',
          500: '#2F74DF', 600: '#1F5FDB', 700: '#174BB0', 800: '#12408F', 900: '#0B3270', 950: '#071F47',
        },
        green: {
          50: '#E9F7F0', 100: '#CDEEDD', 200: '#9FDDBE', 300: '#6BC79C', 400: '#34B07A',
          500: '#1C9A63', 600: '#138A55', 700: '#0F6E44', 800: '#0C5636', 900: '#0A4630', 950: '#052A1C',
        },
        red: {
          50: '#FDF0EE', 100: '#FBDCD8', 200: '#F5B8B1', 300: '#EE8F84', 400: '#E5685B',
          500: '#D64A3E', 600: '#C8372D', 700: '#A42B23', 800: '#84241E', 900: '#6B201B', 950: '#3B0E0B',
        },
        amber: {
          50: '#FFF8EB', 100: '#FFEDC8', 200: '#FFD98F', 300: '#FCC15A', 400: '#F2A93A',
          500: '#DB8C12', 600: '#B86E00', 700: '#925600', 800: '#744405', 900: '#5F3807', 950: '#371E00',
        },
        orange: {
          50: '#FFF3EA', 100: '#FFE3CF', 200: '#FFC6A0', 300: '#FFA369', 400: '#FF8A3D',
          500: '#F26A1B', 600: '#D9570D', 700: '#B4440B', 800: '#8F3710', 900: '#742F11', 950: '#3F1505',
        },
        gray: {
          50: '#F4F7FB', 100: '#EAEFF5', 200: '#DCE5F0', 300: '#C3CFDE', 400: '#7A8AA2',
          500: '#5E6F87', 600: '#4A5B72', 700: '#24324A', 800: '#121B2C', 900: '#0B1220', 950: '#060A13',
        },
      },
      boxShadow: {
        'rp-1': '0 1px 2px rgba(11, 60, 122, 0.06)',
        'rp-2': '0 8px 24px -8px rgba(11, 60, 122, 0.25)',
      },
    },
  },
  plugins: [],
};
