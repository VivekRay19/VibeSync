import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090A0F",
        foreground: "#F3F4F6",
        surface: {
          950: "#090A0F",
          900: "#0F1117",
          850: "#141722",
          800: "#1B1F2E",
          750: "#22273B",
          700: "#2B324B",
          600: "#3D4668",
        },
        brand: {
          purple: "#9333EA",
          "purple-light": "#A855F7",
          "purple-glow": "#C084FC",
          blue: "#2563EB",
          cyan: "#06B6D4",
          "cyan-light": "#38BDF8",
        },
      },
      boxShadow: {
        "glow-purple": "0 0 25px -5px rgba(168, 85, 247, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.4)",
        "glow-combined": "0 0 35px -5px rgba(147, 51, 234, 0.3), 0 0 35px -5px rgba(6, 182, 212, 0.2)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "vibesync-gradient": "linear-gradient(135deg, #9333EA 0%, #3B82F6 50%, #06B6D4 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
