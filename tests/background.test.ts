import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetChromeMocks, mockChrome } from './setup';

async function flushPromises() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

describe('background', () => {
  let background: typeof import('../src/background');

  beforeEach(async () => {
    resetChromeMocks();
    vi.resetModules();
    background = await import('../src/background');
  });

  describe('normalizeUrl', () => {
    it('strips hash from URL', () => {
      expect(background.normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    });

    it('returns original for invalid URL', () => {
      expect(background.normalizeUrl('not-a-url')).toBe('not-a-url');
    });

    it('preserves query parameters', () => {
      expect(background.normalizeUrl('https://example.com/page?q=1')).toBe('https://example.com/page?q=1');
    });
  });

  describe('getReaderUrls / setReaderUrl', () => {
    it('returns empty object when storage is empty', async () => {
      const urls = await background.getReaderUrls();
      expect(urls).toEqual({});
    });

    it('saves and retrieves a URL', async () => {
      await background.setReaderUrl('https://example.com/article', true);
      const urls = await background.getReaderUrls();
      expect(urls['https://example.com/article']).toBe(true);
    });

    it('removes a URL when disabled', async () => {
      await background.setReaderUrl('https://example.com/article', true);
      await background.setReaderUrl('https://example.com/article', false);
      const urls = await background.getReaderUrls();
      expect(urls['https://example.com/article']).toBeUndefined();
    });

    it('normalizes URL before saving', async () => {
      await background.setReaderUrl('https://example.com/page#hash', true);
      const urls = await background.getReaderUrls();
      expect(urls['https://example.com/page']).toBe(true);
      expect(urls['https://example.com/page#hash']).toBeUndefined();
    });
  });

  describe('updateActionUI', () => {
    it('sets ON badge for enabled', async () => {
      await background.updateActionUI(1, true);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'ON' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 1, color: '#166534' });
      expect(mockChrome.action.setTitle).toHaveBeenCalledWith({ tabId: 1, title: 'Reader Friendly: ON' });
    });

    it('sets OFF badge for disabled', async () => {
      await background.updateActionUI(1, false);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'OFF' });
      expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 1, color: '#6b7280' });
      expect(mockChrome.action.setTitle).toHaveBeenCalledWith({ tabId: 1, title: 'Reader Friendly: OFF' });
    });
  });

  describe('chrome.action.onClicked', () => {
    it('toggles reader mode ON', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);

      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'ON' });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SET_READER_MODE',
        enabled: true,
      });
    });

    it('toggles reader mode OFF on second click', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);
      mockChrome.tabs.sendMessage.mockClear();

      await mockChrome.action.onClicked.trigger(tab);
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SET_READER_MODE',
        enabled: false,
      });
    });

    it('ignores tabs without id or url', async () => {
      const tab = { id: undefined, url: undefined } as unknown as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);
      expect(mockChrome.action.setBadgeText).not.toHaveBeenCalled();
    });
  });

  describe('chrome.tabs.onActivated', () => {
    it('restores badge state from tabState', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);
      mockChrome.action.setBadgeText.mockClear();

      await mockChrome.tabs.onActivated.trigger({ tabId: 1, windowId: 1 });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'ON' });
    });
  });

  describe('chrome.tabs.onUpdated', () => {
    it('restores reader mode from storage when URL changes', async () => {
      await background.setReaderUrl('https://example.com/article', true);
      const tab = { id: 1, url: 'https://example.com/article' } as chrome.tabs.Tab;

      await mockChrome.tabs.onUpdated.trigger(1, { url: 'https://example.com/article' }, tab);
      await flushPromises();

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SET_READER_MODE',
        enabled: true,
      });
    });

    it('updates badge on loading without URL change', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);
      mockChrome.action.setBadgeText.mockClear();

      await mockChrome.tabs.onUpdated.trigger(1, { status: 'loading' }, tab);
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'ON' });
    });
  });

  describe('chrome.tabs.onRemoved', () => {
    it('clears tab state', async () => {
      const tab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab;
      await mockChrome.action.onClicked.trigger(tab);

      await mockChrome.tabs.onRemoved.trigger(1, { windowId: 1, isWindowClosing: false });
      await mockChrome.tabs.onActivated.trigger({ tabId: 1, windowId: 1 });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'OFF' });
    });
  });

  describe('chrome.runtime.onMessage CHECK_READER_MODE', () => {
    it('responds with enabled status from storage', async () => {
      await background.setReaderUrl('https://example.com/page', true);
      const sendResponse = vi.fn();
      const message = { type: 'CHECK_READER_MODE' };
      const sender = { tab: { id: 1, url: 'https://example.com/page' } } as chrome.runtime.MessageSender;

      mockChrome.runtime.onMessage.trigger(message, sender, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ enabled: true });
      expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'ON' });
    });

    it('responds disabled when not in storage', async () => {
      const sendResponse = vi.fn();
      const message = { type: 'CHECK_READER_MODE' };
      const sender = { tab: { id: 2, url: 'https://example.com/other' } } as chrome.runtime.MessageSender;

      mockChrome.runtime.onMessage.trigger(message, sender, sendResponse);
      await flushPromises();

      expect(sendResponse).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('chrome.runtime.onInstalled', () => {
    it('registers initial badge state', () => {
      expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    });
  });
});
