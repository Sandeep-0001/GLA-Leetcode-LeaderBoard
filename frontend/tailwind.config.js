/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b132b',
        panel: '#1c2541',
        panelAlt: '#111936',
        border: '#3a506b',
        accent: '#a8dadc',
        text: '#e0e1dd',
      },
    },
  },
  plugins: [],
};
