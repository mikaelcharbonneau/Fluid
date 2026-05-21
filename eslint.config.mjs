import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
    ],
  },
  ...next,
  ...nextCoreWebVitals,
  prettier,
];

export default eslintConfig;
