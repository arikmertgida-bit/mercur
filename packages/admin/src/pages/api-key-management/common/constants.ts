// Matches @medusajs/types' `ApiKeyType` string-literal union structurally
// (rather than redeclaring it as a TS enum) so values here are directly
// assignable to the SDK's AdminCreateApiKey payload without a cast.
export const ApiKeyType = {
  SECRET: "secret",
  PUBLISHABLE: "publishable",
} as const

export type ApiKeyType = (typeof ApiKeyType)[keyof typeof ApiKeyType]
