/**
 * PARK — Tailwind Configuration
 * ====================================
 * `sage` is PARK's brand color, sampled from the logo (the muted
 * green-teal in the icon and wordmark). It replaces amber everywhere
 * in the UI — this is a deliberate palette correction so the app
 * actually matches the logo instead of clashing with it.
 *
 * The scale is built around the logo's mid-tone (~#7A9E8E) so
 * `sage-600` is the "brand accent" weight used for buttons/links/
 * active states, matching how `amber-600` was used before.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  "#f2f7f5",
          100: "#e3ede8",
          200: "#c7dbd2",
          300: "#a3c3b5",
          400: "#82ac9c",
          500: "#6b9686",   // logo icon mid-tone
          600: "#587e6d",   // primary brand accent (replaces amber-600)
          700: "#48685a",
          800: "#3b544a",
          900: "#31463e",
          950: "#192723",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "serif"],
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
