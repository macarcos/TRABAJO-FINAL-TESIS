/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unemi: {
          primary: "#6200EA", // Morado institucional
          secondary: "#3700B3",
          bg: "#F4F7FE",      // Fondo gris dashboard
          text: "#2B3674"     // Texto oscuro
        }
      }
    },
  },
  plugins: [],
}