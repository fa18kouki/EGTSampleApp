/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      width: {
        '9/10': '90%',
        '25.75': '103px',
        "4.5": "18px",
      },
      maxWidth: {
        '9/10': '90%',
        '4/5': '80%',
        "1/3": "33.333333%",
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      boxShadow: {
        error: 'rgba(182, 52, 67, 1) 1px 1px 2px, rgba(182, 52, 67, 1) 0px 0px 1px',
      },
      spacing: {
        '1.25': '0.3125rem', // 5px
      },
      flexGrow: {
        '0.3': 0.3,
      },
      height: {
        '4.5': '45px',
      },
    },
  },
  plugins: [],
}

