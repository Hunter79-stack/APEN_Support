/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Exclude ghost subdirectories created by FUSE that are not visible on Windows
    '!./app/dren/trellix/ubuntu/**/*',
    '!./app/dren/trellix/enterprise-linux/**/*',
  ],
  theme: {
    /* ── Fluid font scale ── */
    fontSize: {
      'xs':   ['clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem)', { lineHeight: '1.5' }],
      'sm':   ['clamp(0.875rem, 0.8rem  + 0.35vw, 1rem)',     { lineHeight: '1.6' }],
      'base': ['clamp(1rem,     0.9rem  + 0.5vw,  1.125rem)', { lineHeight: '1.65' }],
      'lg':   ['clamp(1.125rem, 1rem    + 0.6vw,  1.25rem)',  { lineHeight: '1.6' }],
      'xl':   ['clamp(1.25rem,  1.1rem  + 0.7vw,  1.5rem)',   { lineHeight: '1.5' }],
      '2xl':  ['clamp(1.5rem,   1.3rem  + 1vw,    1.875rem)', { lineHeight: '1.4' }],
      '3xl':  ['clamp(1.875rem, 1.6rem  + 1.25vw, 2.25rem)',  { lineHeight: '1.3' }],
      '4xl':  ['clamp(2.25rem,  1.9rem  + 1.75vw, 3rem)',     { lineHeight: '1.2' }],
      '5xl':  ['clamp(3rem,     2.5rem  + 2.5vw,  4rem)',     { lineHeight: '1.1' }],
      '6xl':  ['clamp(3.75rem,  3rem    + 3.5vw,  5rem)',     { lineHeight: '1.05' }],
    },
    extend: {
      spacing: {
        '18': '4.5rem',   /* w-18 / h-18 — ThemedLogo 'xl' size */
        '22': '5.5rem',
      },
      colors: {
        cyan: {
          400: '#00d4ff',
          500: '#00bfea',
          600: '#00a8d0',
        },
        navy: {
          950: '#060b18',
          900: '#0a0f1e',
          850: '#0d1428',
          800: '#111827',
          750: '#141c2e',
          700: '#1a2440',
        },
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        'glow-cyan':   'radial-gradient(ellipse at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
        'glow-indigo': 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'cyan-glow':    '0 0 20px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.1)',
        'cyan-glow-sm': '0 0 10px rgba(0,212,255,0.2)',
        'indigo-glow':  '0 0 20px rgba(99,102,241,0.3)',
        'card':         '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.4s ease-in-out',
        'float':      'float 6s ease-in-out infinite',
        'popIn':      'popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
