import { vi } from 'vitest';

export interface MockedEvent {
  listeners: Function[];
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  trigger(...args: any[]): Promise<void>;
  reset(): void;
}

class MockEventImpl implements MockedEvent {
  listeners: Function[] = [];
  addListener = vi.fn((fn: Function) => this.listeners.push(fn));
  removeListener = vi.fn();

  async trigger(...args: any[]) {
    for (const fn of this.listeners) {
      const result = fn(...args);
      if (result && typeof result.then === 'function') {
        await result;
      }
    }
  }

  reset() {
    this.listeners.length = 0;
    this.addListener.mockClear();
    this.removeListener.mockClear();
  }
}

class MockStorageArea {
  data: Record<string, any> = {};

  get = vi.fn(async (keys?: any) => {
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    }
    if (Array.isArray(keys)) {
      const result: Record<string, any> = {};
      for (const key of keys) {
        result[key] = this.data[key];
      }
      return result;
    }
    if (keys && typeof keys === 'object') {
      const result: Record<string, any> = {};
      for (const key of Object.keys(keys)) {
        result[key] = this.data[key] ?? keys[key];
      }
      return result;
    }
    return { ...this.data };
  });

  set = vi.fn(async (items: Record<string, any>) => {
    Object.assign(this.data, items);
  });

  remove = vi.fn();
  clear = vi.fn();

  reset() {
    this.data = {};
    this.get.mockClear();
    this.set.mockClear();
    this.remove.mockClear();
    this.clear.mockClear();
  }
}

const mockStorage = new MockStorageArea();

export interface MockedChrome {
  runtime: {
    onInstalled: MockedEvent;
    onMessage: MockedEvent;
    sendMessage: ReturnType<typeof vi.fn>;
    lastError: any;
  };
  action: {
    setBadgeText: ReturnType<typeof vi.fn>;
    setBadgeBackgroundColor: ReturnType<typeof vi.fn>;
    setTitle: ReturnType<typeof vi.fn>;
    onClicked: MockedEvent;
  };
  tabs: {
    onActivated: MockedEvent;
    onRemoved: MockedEvent;
    onUpdated: MockedEvent;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  storage: {
    local: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
      data: Record<string, any>;
    };
  };
}

(globalThis as any).chrome = {
  runtime: {
    onInstalled: new MockEventImpl(),
    onMessage: new MockEventImpl(),
    sendMessage: vi.fn(),
    lastError: undefined,
  },
  action: {
    setBadgeText: vi.fn(async () => undefined),
    setBadgeBackgroundColor: vi.fn(async () => undefined),
    setTitle: vi.fn(async () => undefined),
    onClicked: new MockEventImpl(),
  },
  tabs: {
    onActivated: new MockEventImpl(),
    onRemoved: new MockEventImpl(),
    onUpdated: new MockEventImpl(),
    sendMessage: vi.fn(async () => undefined),
  },
  storage: {
    local: mockStorage,
  },
};

export const mockChrome: MockedChrome = (globalThis as any).chrome;

export function resetChromeMocks() {
  mockChrome.runtime.onInstalled.reset();
  mockChrome.runtime.onMessage.reset();
  mockChrome.action.onClicked.reset();
  mockChrome.tabs.onActivated.reset();
  mockChrome.tabs.onRemoved.reset();
  mockChrome.tabs.onUpdated.reset();
  mockChrome.runtime.sendMessage.mockClear();
  mockChrome.tabs.sendMessage.mockClear();
  mockChrome.action.setBadgeText.mockClear();
  mockChrome.action.setBadgeBackgroundColor.mockClear();
  mockChrome.action.setTitle.mockClear();
  mockStorage.reset();
  mockChrome.runtime.lastError = undefined;
}
