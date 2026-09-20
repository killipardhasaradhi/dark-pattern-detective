const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const listEl = document.getElementById("list");
const rescanBtn = document.getElementById("rescan");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function renderSummary(summary, count) {
  if (!summaryEl) return;
  const s = summary || { high: 0, medium: 0, low: 0, risk: "CLEAR", manipulationScore: 0 };
  summaryEl.innerHTML = `
    <div class="risk ${s.risk.toLowerCase()}">${s.risk === "CLEAR" ? "✓" : "⚠"} ${s.risk} SIGNAL LEVEL <span>${count || 0} findings</span></div>
    <div class="score">Manipulation Score: <b>${s.manipulationScore ?? 0}</b>/100</div>
    <div class="stats">
      <div><b>${s.high || 0}</b><small>HIGH</small></div>
      <div><b>${s.medium || 0}</b><small>MEDIUM</small></div>
      <div><b>${s.low || 0}</b><small>LOW</small></div>
    </div>`;
}

function render(findings, summary) {
  const safeFindings = Array.isArray(findings) ? findings : [];
  renderSummary(summary, safeFindings.length);

  if (!safeFindings.length) {
    statusEl.textContent = "No potential dark-pattern signals detected.";
    listEl.innerHTML = `<div class="empty">✓ Nothing suspicious was detected in the visible page.<small>A clean result is not proof that a page is free of manipulation.</small></div>`;
    return;
  }

  statusEl.textContent = `${safeFindings.length} potential signal${safeFindings.length > 1 ? "s" : ""} detected`;
  listEl.innerHTML = safeFindings.map(f => `
    <div class="item">
      <div class="item-top">
        <div class="item-type ${escapeHtml(f.severity)}">${escapeHtml(f.type)}</div>
        <span class="confidence">${escapeHtml(f.confidence)}%</span>
      </div>
      <div class="item-msg">${escapeHtml(f.message)}</div>
      <div class="evidence"><b>Evidence:</b> ${escapeHtml(f.evidence || "Signal detected from page structure/text.")}</div>
      ${f.ccpaCategory ? `<div class="item-ccpa">India CCPA 2023: ${escapeHtml(f.ccpaCategory)}</div>` : ""}
    </div>`).join("");
}

function queryActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs && tabs[0]) callback(tabs[0].id);
  });
}

function requestResults() {
  queryActiveTab(tabId => {
    chrome.tabs.sendMessage(tabId, { type: "DP_GET_RESULTS" }, response => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = "Scanner unavailable on this page.";
        renderSummary({ high: 0, medium: 0, low: 0, risk: "CLEAR" }, 0);
        listEl.innerHTML = `<div class="empty">Reload the page or enable extension access for this site.</div>`;
        return;
      }
      render(response?.findings, response?.summary);
    });
  });
}

rescanBtn.addEventListener("click", () => {
  rescanBtn.disabled = true;
  rescanBtn.textContent = "Scanning…";
  statusEl.textContent = "Running local detectors…";
  queryActiveTab(tabId => {
    chrome.tabs.sendMessage(tabId, { type: "DP_RESCAN" }, () => {
      setTimeout(() => {
        rescanBtn.disabled = false;
        rescanBtn.textContent = "Rescan this page";
        requestResults();
      }, 250);
    });
  });
});

const downloadBtn = document.getElementById("download");
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    queryActiveTab(tabId => {
      chrome.tabs.sendMessage(tabId, { type: "DP_DOWNLOAD" }, () => {});
    });
  });
}

requestResults();
