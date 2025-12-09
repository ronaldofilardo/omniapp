// Mock do Sentry para testes
export const init = vi.fn();
export const captureException = vi.fn();
export const captureMessage = vi.fn();
export const setUser = vi.fn();
export const setContext = vi.fn();
export const setTag = vi.fn();
export const addBreadcrumb = vi.fn();

export default {
  init,
  captureException,
  captureMessage,
  setUser,
  setContext,
  setTag,
  addBreadcrumb,
};
