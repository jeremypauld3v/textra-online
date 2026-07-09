/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // OLED-friendly: keep true black for backgrounds (pixels off = battery save)
        void: "#000000",
        surface: "#0A0A0A",
        field: "#111111",
        // Accent palette — adds life without breaking OLED
        mystic: {
          DEFAULT: "#7C3AED",  // Indigo-violet — primary actions, HP
          400: "#A78BFA",
          500: "#7C3AED",
          600: "#6D28D9",
        },
        gold: {
          DEFAULT: "#F59E0B",  // Amber — treasure, XP, warnings
          400: "#FBBF24",
          500: "#F59E0B",
        },
        verdant: {
          DEFAULT: "#10B981",  // Emerald — healing, safe zone, success
          400: "#34D399",
          500: "#10B981",
        },
        crimson: {
          DEFAULT: "#EF4444",  // Red — damage, danger, enemies
          400: "#F87171",
          500: "#EF4444",
        },
        frost: {
          DEFAULT: "#F1F5F9",  // Warm white — primary text
          muted: "#94A3B8",    // Gray — secondary text
          faint: "#64748B",    // Steel — disabled text
        },
      },
      fontFamily: {
        sans: "System",
        pixel: "Silkscreen",
        "pixel-bold": "Silkscreen-Bold",
      },
      fontWeight: {
        bold: "700",
        black: "900",
      },
    },
  },
  plugins: [],
}
