/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F0",
        paper2: "#F2EDDF",
        card: "#FFFFFF",
        ink: "#14110D",
        ink2: "#3B342B",
        soft: "#6B6157",
        mute: "#A19888",
        hair: "#E8DFCB",
        hair2: "#D9CFB9",
        red: "#C8311E",
        redDeep: "#8E1F14",
        amber: "#B26A00",
        green: "#2F7A52",
        blue: "#2A4A6B",
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Times New Roman"', 'Georgia', 'serif'],
        sans: ['Inter', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        kicker: '0.18em',
        widerk: '0.16em',
      },
    },
  },
  plugins: [],
};
