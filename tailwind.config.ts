import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      ayotd: { red: "#b91c35", deep: "#741526", ink: "#09090b", panel: "#151519" }
    },
    boxShadow: { glow: "0 0 30px rgba(185,28,53,.18)" }
  }},
  plugins: []
};
export default config;
