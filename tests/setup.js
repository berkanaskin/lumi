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
    location: {
        origin: 'http://localhost',
        href: 'http://localhost/',
        pathname: '/',
    },
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
        style: {
            setProperty: vi.fn(),
            removeProperty: vi.fn(),
            getPropertyValue: vi.fn(() => ''),
        },
        innerHTML: '',
        textContent: '',
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelector: vi.fn(() => null),
        querySelectorAll: vi.fn(() => []),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(() => null),
        removeAttribute: vi.fn(),
        focus: vi.fn(),
        click: vi.fn(),
        remove: vi.fn(),
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(() => false),
            toggle: vi.fn(),
        },
    })),
    head: {
        appendChild: vi.fn(),
    },
    body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        contains: vi.fn(() => false),
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
