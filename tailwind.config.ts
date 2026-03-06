import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "tarot-bg": "#050816",
        "tarot-card": "#0f172a",
        "tarot-accent": "#fbbf24"
      }
    }
  },
  plugins: []
};

export default config;

