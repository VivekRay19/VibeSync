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
          indigo: "#6366F1",
        },
        liquid: {
          dark: "#06070B",
          card: "rgba(18, 21, 33, 0.65)",
          cardHover: "rgba(26, 31, 48, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
          borderHover: "rgba(255, 255, 255, 0.16)",
          active: "rgba(147, 51, 234, 0.2)",
        },
      },
      boxShadow: {
        "glow-purple": "0 0 25px -5px rgba(168, 85, 247, 0.4)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.4)",
        "glow-combined": "0 0 35px -5px rgba(147, 51, 234, 0.3), 0 0 35px -5px rgba(6, 182, 212, 0.2)",
        "liquid-glass": "0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)",
        "liquid-panel": "0 20px 50px 0 rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.14)",
        "liquid-dock": "0 -10px 40px -5px rgba(0, 0, 0, 0.7), 0 0 30px -10px rgba(139, 92, 246, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)",
        "aurora-glow": "0 0 60px -10px rgba(147, 51, 234, 0.3), 0 0 80px -20px rgba(6, 182, 212, 0.2)",
      },
      backdropBlur: {
        '2xl': '24px',
        '3xl': '36px',
        '4xl': '48px',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "vibesync-gradient": "linear-gradient(135deg, #9333EA 0%, #3B82F6 50%, #06B6D4 100%)",
        "liquid-mesh": "radial-gradient(circle at 10% 20%, rgba(147, 51, 234, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.1) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;
