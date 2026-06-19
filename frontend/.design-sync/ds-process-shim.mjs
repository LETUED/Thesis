// Injected FIRST in the synth entry (before any component module evaluates) so
// browser-bundled code that reads process.env.NEXT_PUBLIC_* (lib/api, supabase
// client) doesn't throw "process is not defined" and kill the whole IIFE.
globalThis.process = globalThis.process || {
  env: { NODE_ENV: "development" },
  browser: true,
  version: "",
  platform: "browser",
  nextTick: (fn) => setTimeout(fn, 0),
};
if (!globalThis.process.env) globalThis.process.env = { NODE_ENV: "development" };
