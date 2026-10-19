/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FDFCFB',
          100: '#FBF9F5',
          200: '#F4F1EA',
          300: '#EBE7DE',
          400: '#DDD7CA',
        },
        cobalt: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brutal-xs': '1.5px 1.5px 0px 0px #171717',
        'brutal-sm': '2px 2px 0px 0px #171717',
        'brutal': '3px 3px 0px 0px #171717',
        'brutal-lg': '5px 5px 0px 0px #171717',
        'brutal-cobalt': '3px 3px 0px 0px #1D4ED8',
      },
    },
  },
  plugins: [],
}
