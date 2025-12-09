// Mock do LogRocket para testes
export const init = vi.fn();
export const identify = vi.fn();
export const track = vi.fn();
export const getSessionURL = vi.fn(() => 'https://logrocket.test/session/123');

export default {
  init,
  identify,
  track,
  getSessionURL,
};
