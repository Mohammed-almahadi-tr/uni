// Stub for the 'server-only' package under Vitest.
//
// 'server-only' resolves to a module that throws when loaded outside a React
// Server Component. Tests exercise these modules directly in Node, which is a
// server context by definition, so the guard has nothing to protect here.
// The real import stays in the source files so that a genuine client-side
// import is still caught at build time.
export {};
