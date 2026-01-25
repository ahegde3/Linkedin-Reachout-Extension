import { defineConfig, build } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs'

// Custom plugin to handle Chrome extension build
function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      
      // Build content script separately with IIFE format
      await build({
        configFile: false,
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/index.ts'),
            name: 'content',
            formats: ['iife'],
            fileName: () => 'content.js',
          },
          rollupOptions: {
            output: {
              extend: true,
            },
          },
        },
      })
      
      // Build background script separately with IIFE format
      await build({
        configFile: false,
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/background/index.ts'),
            name: 'background',
            formats: ['iife'],
            fileName: () => 'background.js',
          },
        },
      })
      
      // Move popup.html from src/popup to root of dist and fix paths
      const srcPopup = resolve(distDir, 'src/popup/index.html')
      const destPopup = resolve(distDir, 'popup.html')
      if (existsSync(srcPopup)) {
        let htmlContent = readFileSync(srcPopup, 'utf-8')
        // Fix relative paths - the HTML is in a nested directory but we move it to root
        htmlContent = htmlContent.replace(/\.\.\/\.\.\/popup\.js/g, './popup.js')
        htmlContent = htmlContent.replace(/\.\.\/\.\.\/popup\.css/g, './popup.css')
        writeFileSync(destPopup, htmlContent)
        // Clean up src directory
        rmSync(resolve(distDir, 'src'), { recursive: true, force: true })
      }
      
      // Remove the index.js chunk file (not needed)
      const indexJsPath = resolve(distDir, 'index.js')
      if (existsSync(indexJsPath)) {
        rmSync(indexJsPath)
      }
      
      // Copy manifest.json to dist
      copyFileSync(
        resolve(__dirname, 'public/manifest.json'),
        resolve(distDir, 'manifest.json')
      )
      
      // Copy icons
      const iconsDir = resolve(distDir, 'icons')
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true })
      }
      
      const sizes = [16, 32, 48, 128]
      sizes.forEach(size => {
        const srcPath = resolve(__dirname, `public/icons/icon${size}.svg`)
        const destPath = resolve(distDir, `icons/icon${size}.svg`)
        if (existsSync(srcPath)) {
          copyFileSync(srcPath, destPath)
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [chromeExtensionPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'popup.css'
          }
          return '[name].[ext]'
        },
      },
    },
  },
  publicDir: false,
})
