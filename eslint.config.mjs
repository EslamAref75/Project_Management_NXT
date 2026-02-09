import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.js", "scripts/**/*.ts", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off"
    }
  },
  {
    // Temporary overrides for existing codebase issues
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn"
    }
  },
  {
    // Stricter rules for critical domains (auth, permissions, RBAC)
    files: [
      "src/lib/auth.ts",
      "src/lib/permissions.ts",
      "src/lib/rbac*.ts",
      "src/lib/rbac-helpers.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
]);

export default eslintConfig;
