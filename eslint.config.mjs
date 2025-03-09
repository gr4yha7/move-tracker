import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [...compat.extends(
  "eslint:recommended",
  "plugin:@typescript-eslint/eslint-recommended",
  "plugin:@typescript-eslint/recommended",
), {
  plugins: {
    "@typescript-eslint": typescriptEslint,
  },

  languageOptions: {
    parser: tsParser,
  },

  rules: {
    indent: ["warn", 2],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    // "no-console": 1,
    "comma-dangle": [0],
    "arrow-parens": [0],
    "object-curly-spacing": ["warn", "always"],
    "array-bracket-spacing": ["off"],
    "class-methods-use-this": "off",

    "prefer-destructuring": ["error", {
      object: true,
      array: false,
    }],

    "import/prefer-default-export": [0],
  },
}];