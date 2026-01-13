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
        // 我们把所有可能出问题的“刺头”都列在这里
        external: [
          // 1. 之前报错过的：
          /^js-yaml/, 
          /^electron-debug/, 
          /^keyboardevent-from-electron-accelerator/,
          /^ajv/,
          /^uri-js/,
          /^json-schema-traverse/,
          /^fast-deep-equal/,
          
          // 2. 这次报错的（自动更新相关）：
          /^electron-updater/, 
          /^sax/,
          
          // 3. 预防性加入的（常见报错大户）：
          /^semver/,            // 版本号工具，经常报错
          /^source-map-support/,// 调试工具，经常报错
          /^axios/,             // 网络库，经常报错
          /^adm-zip/,           // 解压库
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
      alias: {
        alias: {
        crypto: resolve(__dirname, 'src/renderer/src/polyfills/crypto.ts'),
      },
      },
    },
  },
});
