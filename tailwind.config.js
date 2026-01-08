/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F0F2F5", // Slight gray for depth
        foreground: "#0F172A", // Slate-900
        primary: "#2563EB", // Royal Blue
        secondary: "#059669", // Emerald Green (Success/Field)
        accent: "#4F46E5", // Indigo (Data/Tech)
        danger: "#DC2626", // Red-600
        surface: "#FFFFFF",
        "brutal-border": "#1E293B", // Slate-800
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #1E293B',
        'brutal-sm': '2px 2px 0px 0px #1E293B',
        'glow': '0 0 15px rgba(37, 99, 235, 0.2)',
      }
    },
  },
  plugins: [],
}
