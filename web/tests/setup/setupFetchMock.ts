// Setup para mocks de fetch (Vitest)
if (!globalThis.fetch) {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) }) as any;
}
export {};
