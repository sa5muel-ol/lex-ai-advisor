import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [
      "juristinsight.com",
      "www.juristinsight.com",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      // optional: only needed if you rely on HMR via your domain behind TLS
      // host: "juristinsight.com",
      // protocol: "wss",
      // port: 443
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,   // <--- match nginx proxy_pass port
    allowedHosts: [
      "juristinsight.com",
      "www.juristinsight.com",
      "localhost",
      "127.0.0.1"
    ]
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: { global: 'globalThis' },
  optimizeDeps: { exclude: ['@elastic/elasticsearch'] },
  build: { rollupOptions: { external: ['@elastic/elasticsearch'] } }
}));