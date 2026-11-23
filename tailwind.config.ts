import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sarabun)", "Sarabun", "Prompt", "Noto Sans Thai", "sans-serif"],
        serif: ["var(--font-serif-thai)", "Noto Serif Thai", "Charm", "serif"],
        display: ["var(--font-charm)", "Charm", "Noto Serif Thai", "serif"],
      },
      colors: {
        lacquer: {
          950: "#080605",
          900: "#0e0b08",
          800: "#17120d",
          700: "#241c14",
        },
        heritage: {
          200: "#efe6d5",
          300: "#e5c98b",
          400: "#c9a461",
          500: "#a9813c",
          600: "#8c6d32",
        },
      },
    },
  },
  plugins: [],
};

export default config;
