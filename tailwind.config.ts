import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ph: {
          blue: {
            DEFAULT: "#0038A8",
            dark: "#002870",
            light: "#E8EEF9",
          },
          red: {
            DEFAULT: "#CE1126",
            dark: "#9E0D1E",
            light: "#FCE8EB",
          },
          gold: {
            DEFAULT: "#FCD116",
            dark: "#C9A612",
            light: "#FFF8D6",
          },
          cream: "#FFFBF5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
