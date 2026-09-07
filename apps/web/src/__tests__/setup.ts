import '@testing-library/jest-dom';

// Reliable in-memory storage mock for jsdom in Node 25
const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string): string | null => mockStore[key] ?? null,
  setItem: (key: string, value: string): void => {
    mockStore[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete mockStore[key];
  },
  clear: (): void => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  },
  key: (index: number): string | null => Object.keys(mockStore)[index] ?? null,
  get length(): number {
    return Object.keys(mockStore).length;
  },
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
