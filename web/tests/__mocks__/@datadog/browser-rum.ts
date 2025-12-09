// Mock do DataDog RUM para testes
export const datadogRum = {
  init: vi.fn(),
  setUser: vi.fn(),
  addError: vi.fn(),
  addAction: vi.fn(),
  startView: vi.fn(),
  setGlobalContext: vi.fn(),
};

export default datadogRum;
