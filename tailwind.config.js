/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nucleo: '#461D77',
        litio: '#4FD1C5',
        ionizado: '#3FAA88',
        violeta: '#7177EC',
        calido: '#FAF5E6',
        tecnico: '#171717',
        mineral: '#C59E4D',
        levanda: '#DCDDEE',
      },
    },
  },
  plugins: [],
};
