import { defineConfig } from "vite";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { alias: { "@": resolve("src") } },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve("src/main.jsx"),
      name: "LiuyinUI",
      formats: ["iife"],
      fileName: () => "ui.js",
      cssFileName: "ui",
    },
    minify: true,
  },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
