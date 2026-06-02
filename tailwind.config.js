/** @type {import('tailwindcss').Config} */
export default {
  // room renders dark-only (the map + panels assume a dark surface), but the
  // suite-standard class-based dark mode is declared so `dark:` variants follow
  // the `dark` class on <html> rather than the OS preference. No light theme.
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@swissnovo/shared/dist/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Suite-wide three-token typography (mirrors --hood-* CSS vars):
        // sans → Inter (UI body, headings, controls)
        // display / varela → Varela Round (brand wordmark only)
        // mono → JetBrains Mono (parcel IDs, EGRID, code surfaces)
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Varela Round', 'system-ui', 'sans-serif'],
        varela: ['Varela Round', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Cascadia Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
