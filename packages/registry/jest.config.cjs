module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          target: "es2021",
        },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  testMatch: ["**/__tests__/**/*.unit.spec.[jt]s"],
  modulePathIgnorePatterns: ["dist/"],
  transformIgnorePatterns: [
    // bun hoists deps under node_modules/.bun/<pkg>/node_modules/<pkg>/... —
    // a simple "not immediately followed by" lookahead misses that nesting,
    // so scan the rest of the path for the package name instead.
    "node_modules/(?!.*(@medusajs|meilisearch))",
  ],
}
