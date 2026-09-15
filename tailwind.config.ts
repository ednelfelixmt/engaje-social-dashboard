import type { Config } from 'tailwindcss';
export default { darkMode: ['class'], content: ['./src/**/*.{ts,tsx}'], theme: { extend: { colors: { primary: 'var(--primary)', background: 'var(--background)' } } }, plugins: [] } satisfies Config;
