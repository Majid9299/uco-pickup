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
    // مشروع Node منفصل بتبعياته وإعداداته الخاصة — لازم يُفحص لوحده
    // (npm run lint من داخل whatsapp-service/) مو ضمن فحص تطبيق Next.js
    "whatsapp-service/**",
  ]),
]);

export default eslintConfig;
