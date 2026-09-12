/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#c8102e', deep: '#17181c' },
        surface: { DEFAULT: '#232120', light: '#2a2827' },
        accent: { DEFAULT: '#4fbde3', 600: '#3a9cc4' },
        fav: { DEFAULT: '#6fcda2', bg: 'rgba(111,205,162,0.14)' },
        unfav: { DEFAULT: '#f2879f', bg: 'rgba(242,135,159,0.14)' },
        muted: '#a19b95',
        subtle: '#6a635d',
        soft: '#a19b95',
        hair: 'rgba(241,238,234,0.13)',
        divider: 'rgba(241,238,234,0.22)',
        note: '#7fd0ec',
        n1: '#ded9d3', n2: '#a49d96', n3: '#8d8781', n4: '#6a635d',
        s1: '#6fc9e8', s2: '#3f93b3', s3: '#256278',
      },
      fontFamily: {
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'kpi': ['31px', { letterSpacing: '-0.02em', lineHeight: '1.1' }],
        'kpi-unit': ['19px', { color: '#a19b95' }],
        'section-title': ['26px', { letterSpacing: '-0.02em' }],
        'subsection-title': ['23px', { letterSpacing: '-0.01em' }],
        'tab': ['14.5px', { lineHeight: '1.4' }],
        'body-sm': ['13.5px', { lineHeight: '1.5' }],
        'body-xs': ['12.5px', { lineHeight: '1.5' }],
        'label': ['11px', { letterSpacing: '0.08em' }],
        'label-sm': ['11.5px', { letterSpacing: '0.06em' }],
        'table-head': ['11px', { letterSpacing: '0.08em' }],
        'table-body': ['13.5px', { lineHeight: '1.5' }],
      },
      spacing: {
        'section': '44px',
        'block': '46px',
      },
    },
  },
  plugins: [],
}
