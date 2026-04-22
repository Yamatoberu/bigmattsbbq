import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        nav: "960px"
      },
      colors: {
        ember: {
          50: "#fff2ec",
          100: "#ffdccc",
          200: "#ffb9a1",
          300: "#ff8c6e",
          400: "#ff5f3b",
          500: "#e64622",
          600: "#b9341a",
          700: "#8c2613",
          800: "#5f1a0c",
          900: "#371008"
        },
        smoke: {
          50: "#0b0806",
          100: "#14100d",
          200: "#1e1712",
          300: "#2a1f19",
          400: "#3a2b23",
          500: "#4a382e",
          600: "#7b6959",
          700: "#b3a495",
          800: "#e0d4c6",
          900: "#f5efe6"
        }
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 19, 15, 0.15)",
        glow: "0 12px 30px rgba(230, 70, 34, 0.25)"
      },
      borderRadius: {
        xl: "1.25rem"
      },
      backgroundImage: {
        "ember-radial": "radial-gradient(circle at top, rgba(230,70,34,0.18), transparent 55%)",
        "grain": "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"n\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"80\" height=\"80\" filter=\"url(%23n)\" opacity=\"0.12\"/%3E%3C/svg%3E')"
      }
    }
  },
  plugins: []
};

export default config;
