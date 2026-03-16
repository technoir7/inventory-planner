import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        sand: "#f4efe8",
        pine: "#1d5c4f",
        amber: "#c7802c",
        coral: "#c14c37"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
