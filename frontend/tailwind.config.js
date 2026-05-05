/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        panel: "#171717",
        line: "#404040",
        text: "#e5e5e5",
        muted: "#737373",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
