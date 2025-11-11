import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { viteSingleFile } from "vite-plugin-singlefile";
import yaml from "@modyfi/vite-plugin-yaml";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isSingleFile = process.env.BUILD_SINGLE_FILE === "true";

  return {
    plugins: [
      vue(),
      yaml(),
      ...(isSingleFile ? [viteSingleFile()] : [vueDevTools()]),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    ...(isSingleFile
      ? {
          publicDir: false, // シングルファイルビルド時はpublicフォルダをコピーしない
          build: {
            outDir: "dist-single",
            cssCodeSplit: false,
            rollupOptions: {
              output: {
                inlineDynamicImports: true,
              },
            },
          },
        }
      : {}),
  };
});
