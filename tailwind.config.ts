import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        coal: '#0b0c0f',
        charcoal: '#16171c',
        ember: '#f97316',
        smoke: '#1f2127',
        ash: '#9ca3af'
      },
      boxShadow: {
        glow: '0 10px 40px rgba(249,115,22,0.25)'
      },
      backgroundImage: {
        'smoke-texture':
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 30%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.04), transparent 25%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04), transparent 35%)'
      }
    }
  },
  plugins: []
};

export default config;
