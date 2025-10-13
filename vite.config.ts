import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT for GitHub Pages if deploying to a repo like username.github.io/REPO_NAME
  // Set base during deployment (we keep empty by default):
  base: ''
})
