/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        indigo: {
          500: "#6366f1",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        waveform: {
          "0%, 100%": { height: "8px" },
          "50%": { height: "32px" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out forwards",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        waveform: "waveform 0.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
