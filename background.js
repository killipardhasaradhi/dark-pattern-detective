chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "DP_RESULTS" || !sender.tab || sender.tab.id == null) return;

  const tabId = sender.tab.id;
  const count = Number(msg.count || 0);
  const risk = msg.summary?.risk || "CLEAR";

  if (!count) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  chrome.action.setBadgeText({ tabId, text: String(Math.min(count, 99)) });
  const color = risk === "HIGH" ? "#dc2626" : risk === "MEDIUM" ? "#d97706" : "#64748b";
  chrome.action.setBadgeBackgroundColor({ tabId, color });
});
