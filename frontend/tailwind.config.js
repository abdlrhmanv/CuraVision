module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080E1C',
        surface: '#0D1526',
        card: '#111D33',
        border: '#1A2844',
        accent: '#00C6B8',
        blue: '#4F8EFF',
        purple: '#9B6FFF',
        warn: '#FF6B5B',
        green: '#22C55E',
        yellow: '#FACC15',
        text: '#ECF0FA',
        muted: '#5A6F99',
        sub: '#1E2D4A',
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
