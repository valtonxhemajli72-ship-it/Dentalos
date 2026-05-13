import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f7f8fa",
        ink: "#111827",
        muted: "#5b6472",
        line: "#d9dee7",
        brand: {
          50: "#eefaf7",
          100: "#d4f0e9",
          500: "#168a75",
          600: "#117461",
          700: "#0e5d4f",
        },
        clinic: {
          amber: "#b7791f",
          blue: "#2b6cb0",
          rose: "#be4b5b",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
