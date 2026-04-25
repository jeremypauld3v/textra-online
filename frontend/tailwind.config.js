/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#000000",
        },
      },
      fontFamily: {
        sans: "System",
        pixel: "System",
        "pixel-bold": "System",
      },
      fontWeight: {
        bold: "700",
        black: "900",
      },
    },
  },
  plugins: [],
}
