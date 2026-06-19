// design-sync preview stub for `server-only` and `next/headers` — no-op so a
// browser bundle never throws at module eval if a component transitively imports them.
export const cookies = () => ({
  get: (_n?: string) => undefined,
  getAll: () => [] as { name: string; value: string }[],
  set: () => {},
  delete: () => {},
  has: () => false,
});
export const headers = () => new Headers();
export const draftMode = () => ({ isEnabled: false, enable: () => {}, disable: () => {} });
