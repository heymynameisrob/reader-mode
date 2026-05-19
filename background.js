const tabState = new Map();

async function updateActionUI(tabId, enabled) {
  await chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: enabled ? "#166534" : "#6b7280"
  });
  await chrome.action.setTitle({
    tabId,
    title: enabled ? "Reader Friendly: ON" : "Reader Friendly: OFF"
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const nextEnabled = !tabState.get(tab.id);
  tabState.set(tab.id, nextEnabled);
  await updateActionUI(tab.id, nextEnabled);
  chrome.tabs.sendMessage(tab.id, {
    type: "SET_READER_MODE",
    enabled: nextEnabled
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
  if (changeInfo.status !== "loading") return;
  const enabled = !!tabState.get(tabId);
  await updateActionUI(tabId, enabled);
});
