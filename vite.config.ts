import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Mapping GEMINI_API_KEY to standard process.env.API_KEY for consistency if needed, 
    // though the system prompt enforces using process.env.API_KEY directly.
    // We also expose the one requested by the user just in case they use that specific var name in their .env
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.API_KEY), 
  },
});