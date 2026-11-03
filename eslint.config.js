import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "vendor/", "css/", "screenshots/", "wallpapers/", "assets/"]
  },
  js.configs.recommended,
  {
    files: ["js/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        chrome: "readonly"
      }
    }
  }
];
