import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Reliable in-memory sessionStorage mock for jsdom in Node 25
const mockSessionStorage = {
  getItem: (key: string): string | null => mockStore[`session_${key}`] ?? null,
  setItem: (key: string, value: string): void => {
    mockStore[`session_${key}`] = String(value);
  },
  removeItem: (key: string): void => {
    delete mockStore[`session_${key}`];
  },
  clear: (): void => {
    Object.keys(mockStore).forEach((k) => {
      if (k.startsWith('session_')) delete mockStore[k];
    });
  },
  key: (index: number): string | null => Object.keys(mockStore)[index] ?? null,
  get length(): number {
    return Object.keys(mockStore).length;
  },
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

// Mock fetch for jsdom environment to prevent undici AbortSignal cross-realm conflicts
globalThis.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve(
    new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
);

// Harmonize Node 25 native Request constructor with jsdom AbortSignal instances & relative paths
const OriginalRequest = globalThis.Request;
globalThis.Request = class extends OriginalRequest {
  constructor(input: any, init?: any) {
    let url = input;
    if (typeof url === 'string' && url.startsWith('/')) {
      url = `http://localhost${url}`;
    }
    if (init && typeof init === 'object') {
      const { signal: _signal, ...rest } = init;
      super(url, rest);
      return;
    }
    super(url);
  }
} as any;
window.Request = globalThis.Request;
