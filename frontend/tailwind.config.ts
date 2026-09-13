import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7c5cff",
          accent: "#00d4ff",
        },
      },
    },
  },
  plugins: [],
};

export default config;
