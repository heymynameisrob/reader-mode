const tabState = new Map<number, boolean>();
const READER_URLS_KEY = "readerUrls";

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return url;
  }
}

async function getReaderUrls(): Promise<Record<string, boolean>> {
  const result = await chrome.storage.local.get(READER_URLS_KEY);
  return (result[READER_URLS_KEY] as Record<string, boolean>) || {};
}

async function setReaderUrl(url: string, enabled: boolean): Promise<void> {
  const urls = await getReaderUrls();
  const normalized = normalizeUrl(url);
  if (enabled) {
    urls[normalized] = true;
  } else {
    delete urls[normalized];
  }
  await chrome.storage.local.set({ [READER_URLS_KEY]: urls });
}

async function updateActionUI(tabId: number, enabled: boolean): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: enabled ? "#166534" : "#6b7280",
  });
  await chrome.action.setTitle({
    tabId,
    title: enabled ? "Reader Friendly: ON" : "Reader Friendly: OFF",
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  const nextEnabled = !tabState.get(tab.id);
  tabState.set(tab.id, nextEnabled);
  await setReaderUrl(tab.url, nextEnabled);
  await updateActionUI(tab.id, nextEnabled);
  chrome.tabs.sendMessage(tab.id, {
    type: "SET_READER_MODE",
    enabled: nextEnabled,
  });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const enabled = !!tabState.get(tabId);
  await updateActionUI(tabId, enabled);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    const urls = await getReaderUrls();
    const normalized = normalizeUrl(changeInfo.url);
    const enabled = !!urls[normalized];
    tabState.set(tabId, enabled);
    await updateActionUI(tabId, enabled);
    if (enabled) {
      chrome.tabs.sendMessage(tabId, {
        type: "SET_READER_MODE",
        enabled: true,
      }).catch(() => {
        // Content script may not be ready yet; it will check on its own
      });
    }
    return;
  }

  if (changeInfo.status === "loading") {
    const enabled = !!tabState.get(tabId);
    await updateActionUI(tabId, enabled);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CHECK_READER_MODE" && sender.tab?.url) {
    const normalized = normalizeUrl(sender.tab.url);
    getReaderUrls().then((urls) => {
      const enabled = !!urls[normalized];
      const tabId = sender.tab?.id;
      if (enabled && tabId != null) tabState.set(tabId, true);
      if (tabId != null) updateActionUI(tabId, enabled);
      sendResponse({ enabled });
    });
    return true; // keep channel open for async response
  }
});
