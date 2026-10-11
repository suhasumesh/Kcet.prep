import type { Config } from 'tailwindcss';

/**
 * Warm paper ground, deep navy for structure, one coral accent for action.
 * The palette is deliberately narrow: an exam app is read for hours, so colour
 * is reserved for meaning (right, wrong, which subject) rather than decoration.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf8f5',
        line: '#e9e4db',
        ink: {
          50: '#f7f6f3', 100: '#efedE8', 200: '#e2ded5', 300: '#c6c0b4',
          400: '#9a948a', 500: '#736f67', 600: '#555249', 700: '#3c3a34',
          800: '#272723', 900: '#17171a', 950: '#0d0d0f',
        },
        navy: {
          50: '#eef0fa', 100: '#dadef3', 200: '#b4bce8', 300: '#8490d6',
          400: '#5b67bd', 500: '#3c47a0', 600: '#2a3380', 700: '#1e2566',
          800: '#171d52', 900: '#131a4a', 950: '#0b0f2e',
        },
        coral: {
          50: '#fdf2f1', 100: '#fbe2df', 200: '#f7c7c2', 300: '#f0a097',
          400: '#e8776b', 500: '#e2574c', 600: '#cc3e33', 700: '#aa3028',
          800: '#8c2b25', 900: '#752a25',
        },
        physics: '#3b5bdb',
        chemistry: '#0e8a6b',
        maths: '#6d4aff',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,23,26,.04)',
        lift: '0 2px 8px rgba(23,23,26,.07), 0 1px 2px rgba(23,23,26,.05)',
        pop: '0 12px 32px rgba(23,23,26,.14)',
      },
      letterSpacing: {
        label: '0.11em',
      },
    },
  },
  plugins: [],
};
export default config;
