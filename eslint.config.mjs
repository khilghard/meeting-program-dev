import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

export default [
  // ------------------------------------------------------------
  // Browser JS (main.js, qr.js, app.js)
  // ------------------------------------------------------------
  {
    files: ["js/**/*.js"],
    ignores: ["server.js", "../service-worker.js", "js/workers/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        location: "readonly",
        alert: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        jsQR: "readonly",
        AbortController: "readonly",
        confirm: "readonly",
        indexedDB: "readonly",
        globalThis: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly",
        Blob: "readonly"
      }
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...prettierConfig.rules,

      indent: ["error", 2],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "no-unused-vars": ["warn"],
      "no-undef": ["error"]
    }
  },

  // ------------------------------------------------------------
  // Service Worker
  // ------------------------------------------------------------
  {
    files: ["service-worker.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        console: "readonly"
      }
    },
    rules: {
      indent: ["error", 2],
      semi: ["error", "always"],
      quotes: ["error", "double"]
    }
  },

  // ------------------------------------------------------------
  // Web Workers (data.worker.js, workerInterface.js)
  // ------------------------------------------------------------
  {
    files: ["js/workers/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        self: "readonly",
        Worker: "readonly",
        console: "readonly",
        fetch: "readonly",
        MessageChannel: "readonly",
        globalThis: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly"
      }
    },
    rules: {
      indent: ["error", 2],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "no-unused-vars": ["warn"]
    }
  },

  // ------------------------------------------------------------
  // Node server
  // ------------------------------------------------------------
  {
    files: ["server.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        __dirname: "readonly",
        console: "readonly",
        process: "readonly"
      }
    },
    rules: {
      indent: ["error", 2],
      semi: ["error", "always"],
      quotes: ["error", "double"]
    }
  },

  // ------------------------------------------------------------
  // Jest Test Files
  // ------------------------------------------------------------
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Jest globals
        test: "readonly",
        expect: "readonly",
        describe: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",

        // Node globals for Jest environment
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly"
      }
    },
    rules: {
      indent: ["error", 2],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "no-undef": "off" // Jest defines globals dynamically
    }
  }
];
