/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import {
  defineConfig,
  externalizeDepsPlugin,
  bytecodePlugin,
} from 'electron-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json';
import { getExternalPkgs } from './scripts/getExternalPkgs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    define: {
      'process.env.UI_TARS_APP_PRIVATE_KEY_BASE64': JSON.stringify(
        process.env.UI_TARS_APP_PRIVATE_KEY_BASE64,
      ),
    },
    build: {
      outDir: 'dist/main',
      lib: {
        entry: './src/main/main.ts',
      },
      rollupOptions: {
        // ——————【全家桶黑名单】——————
        // 保持之前的修复逻辑不变，继续排除这些报错包
        external: [
          /^js-yaml/, 
          /^electron-debug/, 
          /^keyboardevent-from-electron-accelerator/,
          /^ajv/,
          /^uri-js/,
          /^json-schema-traverse/,
          /^fast-deep-equal/,
          /^electron-updater/, 
          /^sax/,
          /^semver/,            
          /^source-map-support/,
          /^axios/,             
          /^adm-zip/,           
          /^builder-util-runtime/ 
        ],
        // ——————【修改结束】——————
        output: {
          manualChunks(id): string | void {
            if (id.includes('app_private')) {
              return 'app_private';
            }
          },
        },
      },
    },
    plugins: [
      bytecodePlugin({
        chunkAlias: 'app_private',
        protectedStrings: [process.env.UI_TARS_APP_PRIVATE_KEY_BASE64!],
      }),
      tsconfigPaths(),
      externalizeDepsPlugin({
        include: [...getExternalPkgs()],
      }),
      {
        name: 'native-node-module-path',
        enforce: 'pre',
        resolveId(source) {
          if (source.includes('screencapturepermissions.node')) {
            return {
              id: '@computer-use/mac-screen-capture-permissions/build/Release/screencapturepermissions.node',
              external: true,
            };
          }
          return null;
        },
      },
    ],
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: './src/preload/index.ts',
      },
    },
    plugins: [tsconfigPaths()],
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          main: resolve('./src/renderer/index.html'),
        },
      },
      minify: true,
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },
    plugins: [react(), tsconfigPaths(), tailwindcss()],
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
    resolve: {
      // ——————【这里是刚才报错的地方，已修正】——————
      alias: {
        crypto: resolve(__dirname, 'src/renderer/src/polyfills/crypto.ts'),
      },
      // ——————【修正结束】——————
    },
  },
});
