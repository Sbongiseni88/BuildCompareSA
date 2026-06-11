import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Most remaining `any`s sit at LLM/serialization boundaries where the
      // payload is genuinely untyped until validated (team_standards.md
      // mandates validation of every external/AI payload). Keep the signal
      // visible as a warning; new code should still prefer `unknown`.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local artefacts that are not part of the app source:
    ".swc/**",
    "venv/**",
    "scraper/venv/**",
    "coverage/**",
    "public/**",
    // Root-level scratch/debug scripts kept for reference only:
    "scratch.js",
    "test-lucide.js",
    "test-script-skipped.js",
  ]),
]);

export default eslintConfig;
