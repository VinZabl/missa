/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          accent: '#8F1EAE', // Purple accent (Miss △)
          accent2: '#8F1EAE', // Purple accent (Miss △)
          dark: '#141414', // Off-black background
          cream: '#F5F5F5',
          beige: '#E5E5E5',
          latte: '#D5D5D5',
          espresso: '#8F1EAE',
          light: '#1A1A1A',
          // Miss △ theme colors
          primary: '#8F1EAE', // Purple primary
          secondary: '#A533C6', // Lighter purple secondary
          darkBg: '#141414', // Off-black main background
          darkCard: '#1A1A1A', // Slightly lighter card background
          glass: 'rgba(143, 30, 174, 0.1)', // Glass effect with purple
          text: '#FFFFFF', // White text for dark background
          textMuted: '#B0B0B0' // Muted text
        }
      },
      fontFamily: {
        'sans': ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'anton': ['Anton', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};