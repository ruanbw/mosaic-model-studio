import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'app-vendor': ['@tanstack/react-query', 'dompurify', 'i18next', 'nanoid', 'react-hook-form', 'react-i18next', 'zod', 'zustand'],
          'openai-sdk': ['openai'],
          'anthropic-sdk': ['@anthropic-ai/sdk'],
          'google-genai-sdk': ['@google/genai'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-switch'],
        },
      },
    },
  },
})
