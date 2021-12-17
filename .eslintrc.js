module.exports = {
  env: {
    commonjs: true,
    es2021: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 13,
  },
  rules: {
    indent: ["error", "tab"],
    quotes: ["error", "single"],
    semi: ["error", "always"],
  },
};
