/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9',      // Sky 500 - TotalSpine Blue (calming medical blue)
        secondary: '#64748b',    // Slate 500 - Professional grey
        background: '#f8fafc',   // Slate 50 - Soft background (easier on eyes)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Disable Tailwind's preflight to avoid conflicts with Ant Design
  corePlugins: {
    preflight: false,
  },
}
