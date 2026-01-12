/**
 * LUMI - Test Setup
 * 
 * Global test setup and mocks.
 */

import { vi } from 'vitest';

// ============================================
// GLOBAL MOCKS
// ============================================

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
        localStorageMock.store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
        localStorageMock.store = {};
    }),
};

global.localStorage = localStorageMock;

// Mock window
global.window = {
    ...global.window,
    localStorage: localStorageMock,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    CustomEvent: class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options?.detail;
        }
    },
};

// Mock document
global.document = {
    ...global.document,
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    createElement: vi.fn((tag) => ({
        tagName: tag.toUpperCase(),
        className: '',
        style: {},
        innerHTML: '',
        textContent: '',
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(() => false),
        },
    })),
    head: {
        appendChild: vi.fn(),
    },
    documentElement: {
        getAttribute: vi.fn(() => 'dark'),
        setAttribute: vi.fn(),
    },
};

// Mock fetch
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
);

// Reset mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.store = {};
});
