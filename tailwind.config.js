/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        linkedin: {
          blue: '#0a66c2',
          'blue-dark': '#004182',
          'blue-light': '#70b5f9',
        },
      },
    },
  },
  plugins: [],
}

