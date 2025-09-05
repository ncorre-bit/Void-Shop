module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0b0b0b",
        accent: "#111827",
        glass: "rgba(255,255,255,0.75)",
        bg: "#e3efe3"
      },
      screens: {
        mobile: "320px"
      }
    },
  },
  plugins: [],
}
