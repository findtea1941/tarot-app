import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "tarot-bg": "#ffffff",
        "tarot-card": "#ffffff",
        "tarot-accent": "#059669",
        /** 案例分析页等浅色主题：面板绿、标题绿 */
        "tarot-panel": "#f0fdf4",
        "tarot-green": "#059669",
        "tarot-green-light": "#d1fae5"
      }
    }
  },
  plugins: []
};

export default config;

