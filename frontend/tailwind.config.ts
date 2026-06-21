import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Figma design tokens
        cream: "#faf1e3",
        "brown-primary": "#957139",
        "brown-dark": "#88642a",
        // Note card category colors
        "cat-random":  { border: "#ef9c66", bg: "rgba(239,156,102,0.5)" },
        "cat-school":  { border: "#fcdc94", bg: "rgba(252,220,148,0.5)" },
        "cat-personal":{ border: "#78aba8", bg: "rgba(120,171,168,0.5)" },
        "cat-drama":   { border: "#d4a5c9", bg: "rgba(212,165,201,0.5)" },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ['"Inria Serif"', "Georgia", "serif"],
      },
      borderWidth: {
        "3": "3px",
      },
    },
  },
  plugins: [],
};
export default config;
