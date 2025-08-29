import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  root: 'ui',
  build: {
    outDir: '../dist-ui'
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/websocket': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  }
})