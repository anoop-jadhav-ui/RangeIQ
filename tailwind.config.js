/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // iOS System Colors
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          indigo: '#5856D6',
          orange: '#FF9500',
          pink: '#FF2D55',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
          // Grays
          gray: {
            1: '#8E8E93',
            2: '#AEAEB2',
            3: '#C7C7CC',
            4: '#D1D1D6',
            5: '#E5E5EA',
            6: '#F2F2F7',
          },
        },
        // Tata Brand Colors
        tata: {
          blue: '#1E3A8A',
          dark: '#0F172A',
        },
        // Range Colors
        range: {
          excellent: '#34C759',
          good: '#30D158',
          moderate: '#FFCC00',
          low: '#FF9500',
          critical: '#FF3B30',
        },
        // Background Colors
        background: {
          primary: '#F2F2F7',
          secondary: '#FFFFFF',
          tertiary: '#F2F2F7',
          dark: {
            primary: '#000000',
            secondary: '#1C1C1E',
            tertiary: '#2C2C2E',
          },
        },
      },
      fontFamily: {
        'sf-pro': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'ios-largetitle': ['34px', { lineHeight: '41px', letterSpacing: '0.37px', fontWeight: '700' }],
        'ios-title1': ['28px', { lineHeight: '34px', letterSpacing: '0.36px', fontWeight: '700' }],
        'ios-title2': ['22px', { lineHeight: '28px', letterSpacing: '0.35px', fontWeight: '700' }],
        'ios-title3': ['20px', { lineHeight: '25px', letterSpacing: '0.38px', fontWeight: '600' }],
        'ios-headline': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '600' }],
        'ios-body': ['17px', { lineHeight: '22px', letterSpacing: '-0.41px', fontWeight: '400' }],
        'ios-callout': ['16px', { lineHeight: '21px', letterSpacing: '-0.32px', fontWeight: '400' }],
        'ios-subhead': ['15px', { lineHeight: '20px', letterSpacing: '-0.24px', fontWeight: '400' }],
        'ios-footnote': ['13px', { lineHeight: '18px', letterSpacing: '-0.08px', fontWeight: '400' }],
        'ios-caption1': ['12px', { lineHeight: '16px', letterSpacing: '0px', fontWeight: '400' }],
        'ios-caption2': ['11px', { lineHeight: '13px', letterSpacing: '0.07px', fontWeight: '400' }],
      },
      borderRadius: {
        'ios-sm': '8px',
        'ios-md': '12px',
        'ios-lg': '16px',
        'ios-xl': '20px',
        'ios-card': '14px',
      },
      boxShadow: {
        'ios-sm': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'ios-md': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'ios-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'ios-card': '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'ios-bounce': 'ios-bounce 0.3s ease-out',
        'ios-fade-in': 'ios-fade-in 0.25s ease-out',
        'ios-slide-up': 'ios-slide-up 0.35s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
      },
      keyframes: {
        'ios-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
        },
        'ios-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ios-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      backdropBlur: {
        'ios': '20px',
      },
    },
  },
  plugins: [],
}
