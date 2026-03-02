import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// NOTE: Change `base` to match your GitHub repository name for GitHub Pages deploy.
// Example: base: '/investment-market-analysis/'
export default defineConfig({
  plugins: [react()],
  base: '/invest_analystics/',
});
