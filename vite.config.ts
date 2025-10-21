// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";
// import { componentTagger } from "lovable-tagger";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   server: {
//     host: "::",
//     port: 8080,
//   },
//   plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
//   define: {
//     global: 'globalThis',
//   },
//   optimizeDeps: {
//     exclude: ['@elastic/elasticsearch']
//   },
//   build: {
//     rollupOptions: {
//       external: ['@elastic/elasticsearch']
//     }
//   }
// }));


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  // <-- add this preview block
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: "all",
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@elastic/elasticsearch']
  },
  build: {
    rollupOptions: {
      external: ['@elastic/elasticsearch']
    }
  }
}));