import { createRequire } from "module";

// `eslint-config-next` v16 ships CommonJS flat-config arrays. Use
// `createRequire` so we can load them from an ESM config file without
// extra tooling.
const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      "tests/**",
    ],
  },
  {
    rules: {
      // New React 19 rule — valid perf suggestion but not a correctness bug.
      // Track separately; don't block CI on it.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
