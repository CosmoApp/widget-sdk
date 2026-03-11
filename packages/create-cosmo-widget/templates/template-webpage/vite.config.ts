
import { defineConfig } from 'vite';
import { cosmo } from '@buildcosmo/vite-plugin';

export default defineConfig({
  plugins: [
    cosmo()
  ],
  build: {
    rollupOptions: {
      input: {
        script: 'src/script.ts',
        styles: 'src/styles.css'
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
