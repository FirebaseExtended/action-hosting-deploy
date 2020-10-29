// babel config for jest tests
// https://jestjs.io/docs/en/getting-started#using-typescript
module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "current" } }],
    "@babel/preset-typescript",
  ],
};
