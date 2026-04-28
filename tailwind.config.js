/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vividia: {
          bg: '#F8F7FF',
          purple: '#7F77DD',
          teal: '#1D9E75',
          ink: '#211F39',
          muted: '#6D698B',
          card: '#FFFFFF',
          line: 'rgba(0,0,0,0.06)',
          coral: '#FF7E6B',
          amber: '#F3B34C',
        },
      },
      boxShadow: {
        glow: '0 18px 40px rgba(127, 119, 221, 0.14)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
