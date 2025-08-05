import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 6650000, // Set to 4MB or any higher value
      },
      manifest: {
        name: "16 Hours",
        short_name: "16 Hours",
        start_url: "./",
        display: "standalone",
        theme_color: "#FDDEE6",
        background_color: "#ffffff",
        description: "PWA install handler package for 16 Hours",
        icons: [
          {
            src: "https://res.cloudinary.com/dtkeyccga/image/upload/v1751074363/1_ku5wny.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "https://res.cloudinary.com/dtkeyccga/image/upload/v1751074363/1_ku5wny.png",
            sizes: "256x256",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "https://res.cloudinary.com/dtkeyccga/image/upload/v1751074363/1_ku5wny.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
