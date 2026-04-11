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
        sans: "Silkscreen-Regular",
        pixel: "Silkscreen-Regular",
        "pixel-bold": "Silkscreen-Bold",
      },
    },
  },
  plugins: [],
}
