/**
 * Dark Pattern Detective — enhanced content script
 * Local-first heuristic detector for common deceptive interface patterns.
 *
 * Important: findings are "potential" signals, not legal determinations.
 */
(function () {
  "use strict";

  const findings = [];
  let findingId = 0;
  let shadowRoot = null;
  let panelOpen = false;
  let scanTimer = null;
  let lastScanAt = 0;

  const CCPA_CATEGORY = {
    "False Urgency": "False Urgency",
    "Pre-checked Opt-in": "Basket Sneaking / Forced Action",
    "Confirmshaming": "Confirm Shaming",
    "Hidden Decline Button": "Interface Interference",
    "Forced Continuity Risk": "Subscription Trap / SaaS Billing",
    "Interface Interference": "Interface Interference",
    "Trick Wording": "Trick Wording",
    "Nagging": "Nagging",
    "Drip Pricing": "Drip Pricing",
    "SaaS Billing": "SaaS Billing"
  };

  const SEVERITY_WEIGHT = { low: 1, medium: 2, high: 3 };

  function textOf(el) {
    return ((el && (el.innerText || el.textContent)) || "").replace(/\s+/g, " ").trim();
  }

  function safeText(str, max = 140) {
    return String(str || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function parseColor(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map(v => parseFloat(v.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] === undefined ? 1 : parts[3]];
  }

  function relLuminance([r, g, b]) {
    const rgb = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrastRatio(fg, bg) {
    const a = relLuminance(fg) + 0.05;
    const b = relLuminance(bg) + 0.05;
    return Math.max(a, b) / Math.min(a, b);
  }

  function effectiveBackground(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const parsed = parseColor(getComputedStyle(node).backgroundColor);
      if (parsed && parsed[3] > 0) return parsed;
      node = node.parentElement;
    }
    return [255, 255, 255, 1];
  }

  function nearbyLabelText(input) {
    let text = "";
    if (input.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (label) text += " " + textOf(label);
      } catch (_) {}
    }
    const parentLabel = input.closest("label");
    if (parentLabel) text += " " + textOf(parentLabel);
    if (input.getAttribute("aria-label")) text += " " + input.getAttribute("aria-label");
    const container = input.closest("div, li, tr, p, fieldset");
    if (container) text += " " + safeText(container, 260);
    return text.toLowerCase();
  }

  function addFinding(type, severity, message, el, confidence, evidence) {
    if (!el || !isVisible(el)) return;
    const existing = findings.find(f => f.type === type && f.el === el);
    if (existing) return;

    findingId += 1;
    el.setAttribute("data-dp-id", String(findingId));
    findings.push({
      id: findingId,
      type,
      severity,
      message,
      evidence: evidence || safeText(message),
      confidence: Math.max(50, Math.min(99, Math.round(confidence || 70))),
      el,
      ccpaCategory: CCPA_CATEGORY[type] || null
    });
  }

  function buttonText(el) {
    return safeText(el, 100).toLowerCase();
  }

  // ---------- Detector 1: False urgency ----------
  const URGENCY_TEXT = /\b(only\s+\d+\s+(left|remaining)|hurry|offer ends|deal ends|sale ends|almost gone|selling fast|last chance|ends (today|tonight)|\d+\s+people\s+(are\s+)?(viewing|bought|booked))\b/i;
  const URGENCY_CLASS = /(countdown|timer|urgency|scarcity|hurry|flash-?sale)/i;

  function detectFalseUrgency() {
    document.querySelectorAll("body *").forEach(el => {
      if (el.children.length > 3) return;
      const text = safeText(textOf(el), 180);
      if (!text) return;
      const cls = typeof el.className === "string" ? el.className : "";
      const id = el.id || "";
      const textHit = URGENCY_TEXT.test(text);
      const classHit = URGENCY_CLASS.test(cls) || URGENCY_CLASS.test(id);
      const clock = /\b\d{1,2}:\d{2}(:\d{2})?\b/.test(text);
      if (isVisible(el) && ((textHit && (clock || /left|ends|hurry|chance/i.test(text))) || (classHit && (clock || textHit)))) {
        addFinding(
          "False Urgency", "medium",
          `Potential scarcity/countdown pressure: "${safeText(text, 90)}"`,
          el, textHit && clock ? 94 : 82,
          text
        );
      }
    });
  }

  // ---------- Detector 2: Basket sneaking / pre-checked opt-ins ----------
  const OPTIN_KEYWORDS = /(subscribe|newsletter|insurance|protection|add-?on|upsell|sign me up|opt.?in|marketing|special offers|keep me updated|save my (info|payment)|extended warranty)/i;

  function detectPrecheckedOptins() {
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
      if (!input.checked || !isVisible(input)) return;
      const context = nearbyLabelText(input);
      if (OPTIN_KEYWORDS.test(context)) {
        addFinding(
          "Pre-checked Opt-in", "high",
          `A paid, marketing, protection, or subscription option is already selected: "${safeText(context, 105)}"`,
          input, 96, safeText(context, 180)
        );
      }
    });
  }

  // ---------- Detector 3: Confirm shaming ----------
  const CONFIRMSHAME_PATTERNS = [
    /no thanks,?\s*i (don'?t|do not) (want|like)/i,
    /no,?\s*i (prefer|like) (paying|to pay)/i,
    /no,?\s*i don'?t (want|need) to (save|learn|improve)/i,
    /i (don'?t|do not) want (free|discounts|savings|to save money)/i,
    /no,?\s*i'?ll (pay full price|stay uninformed|risk it)/i,
    /maybe later,? i (like|enjoy) (missing out|paying more)/i,
    /i hate saving|i prefer paying more/i
  ];

  function detectConfirmshaming() {
    document.querySelectorAll("button, a, [role='button']").forEach(el => {
      const text = safeText(textOf(el), 140);
      if (!text || !isVisible(el)) return;
      const hit = CONFIRMSHAME_PATTERNS.find(re => re.test(text));
      if (hit) {
        addFinding(
          "Confirmshaming", "medium",
          `Opt-out wording uses guilt or a negative self-description: "${text}"`,
          el, 95, text
        );
      }
    });
  }

  // ---------- Detector 4: Hidden decline ----------
  const DECLINE_TEXT = /\b(cancel|decline|no thanks|reject all|opt out|unsubscribe|not interested|skip)\b/i;

  function detectHiddenDecline() {
    document.querySelectorAll("button, a, [role='button']").forEach(el => {
      const text = safeText(textOf(el), 60);
      if (!text || !DECLINE_TEXT.test(text) || !isVisible(el)) return;

      const style = getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize) || 16;
      const opacity = parseFloat(style.opacity);
      const fg = parseColor(style.color) || [0, 0, 0, 1];
      const bg = effectiveBackground(el);
      const ratio = contrastRatio(fg, bg);
      const tooSmall = fontSize < 11;
      const tooFaint = opacity < 0.55;
      const lowContrast = ratio < 3.0;

      if (tooSmall || tooFaint || lowContrast) {
        const reasons = [];
        if (tooSmall) reasons.push(`font-size ${fontSize}px`);
        if (tooFaint) reasons.push(`opacity ${opacity}`);
        if (lowContrast) reasons.push(`contrast ${ratio.toFixed(1)}:1`);
        addFinding(
          "Hidden Decline Button", "high",
          `"${text}" has unusually low visibility (${reasons.join(", ")}).`,
          el, Math.min(98, 76 + reasons.length * 7),
          `${text} — ${reasons.join(", ")}`
        );
      }
    });
  }

  // ---------- Detector 5: Subscription trap / SaaS billing ----------
  function detectForcedContinuity() {
    const bodyText = safeText(document.body ? textOf(document.body) : "", 30000);
    const trial = /\b(free trial|trial period|try for free)\b/i.test(bodyText);
    const autoCharge = /(automatically\s+(renew|charge|bill)|auto-?renew|will be charged|recurring\s+(payment|billing)|then\s+\$?\d+)/i.test(bodyText);
    const cancel = /(cancel anytime|cancel before|how to cancel|cancel your (subscription|trial)|easy to cancel)/i.test(bodyText);

    if (trial && autoCharge && !cancel) {
      const target = document.querySelector("form, [class*='trial'], [class*='checkout'], [class*='signup']") || document.body;
      addFinding(
        "Forced Continuity Risk", "high",
        "A free/low-cost trial appears to convert into recurring billing, but clear cancellation instructions were not found on this page.",
        target, 88, "Trial + recurring charge detected; cancellation language not found."
      );
    }

    if (/(free trial|trial period)/i.test(bodyText) && /(automatically\s+(renew|charge|bill)|auto-?renew|recurring\s+(payment|billing))/i.test(bodyText)) {
      const target = document.querySelector("form, [class*='trial'], [class*='checkout'], [class*='signup']") || document.body;
      addFinding(
        "SaaS Billing", "medium",
        "Recurring billing language is present alongside a trial offer. Review the renewal terms before accepting.",
        target, cancel ? 68 : 91,
        "Trial/recurring-billing language detected."
      );
    }
  }

  // ---------- Detector 6: Interface interference ----------
  const POSITIVE = /\b(accept|agree|continue|subscribe|buy now|start free|enable|yes|allow|confirm)\b/i;
  const NEGATIVE = /\b(reject|decline|cancel|no thanks|not now|skip|opt out|no)\b/i;

  function detectInterfaceInterference() {
    document.querySelectorAll("button, a, [role='button']").forEach(primary => {
      if (!isVisible(primary) || !POSITIVE.test(buttonText(primary))) return;
      const parent = primary.parentElement;
      if (!parent) return;
      const siblings = [...parent.querySelectorAll("button, a, [role='button']")].filter(isVisible);
      const opposing = siblings.find(x => x !== primary && NEGATIVE.test(buttonText(x)));
      if (!opposing) return;

      const p = getComputedStyle(primary);
      const o = getComputedStyle(opposing);
      const pSize = parseFloat(p.fontSize) || 16;
      const oSize = parseFloat(o.fontSize) || 16;
      const pOpacity = parseFloat(p.opacity);
      const oOpacity = parseFloat(o.opacity);
      const pRect = primary.getBoundingClientRect();
      const oRect = opposing.getBoundingClientRect();
      const pArea = pRect.width * pRect.height;
      const oArea = oRect.width * oRect.height;

      const contrast = (pArea > oArea * 1.8) || (pSize > oSize * 1.25) || (pOpacity > oOpacity + 0.25);
      if (contrast) {
        addFinding(
          "Interface Interference", "medium",
          `The positive action "${safeText(textOf(primary), 45)}" is visually emphasized over "${safeText(textOf(opposing), 45)}".`,
          opposing, 84,
          `Primary area ${Math.round(pArea)}px² vs opposing ${Math.round(oArea)}px²; font ${pSize}px vs ${oSize}px.`
        );
      }
    });
  }

  // ---------- Detector 7: Trick wording ----------
  const TRICK_WORDING = [
    /do not .*not/i,
    /uncheck .*not/i,
    /no .* not .*continue/i,
    /opt.?out.*(yes|agree|accept)/i,
    /yes.*(do not|don't).*want/i
  ];

  function detectTrickWording() {
    document.querySelectorAll("label, p, button, a, legend, [role='dialog']").forEach(el => {
      const text = safeText(textOf(el), 180);
      if (!text || !isVisible(el)) return;
      if (TRICK_WORDING.some(re => re.test(text))) {
        addFinding(
          "Trick Wording", "medium",
          `Potentially confusing choice wording: "${safeText(text, 110)}"`,
          el, 73, text
        );
      }
    });
  }

  // ---------- Detector 8: Nagging ----------
  function detectNagging() {
    const text = safeText(document.body ? textOf(document.body) : "", 30000);
    const repeated = (text.match(/(download our app|turn on notifications|enable notifications|enter your phone number|accept cookies)/gi) || []).length;
    if (repeated >= 2) {
      const target = document.querySelector("[role='dialog'], .modal, [class*='popup'], body");
      addFinding(
        "Nagging", "low",
        `Repeated requests for the same action were found (${repeated} occurrences).`,
        target, 72, "Repeated app/notification/phone/cookie request language."
      );
    }
  }

  // ---------- Detector 9: Drip pricing ----------
  function detectDripPricing() {
    const bodyText = safeText(document.body ? textOf(document.body) : "", 30000);
    const base = /(from|starting at|base price|subtotal)\s*[:\-]?\s*(₹|rs\.?|\\$|€|£)\s*\d+/i.test(bodyText);
    const fee = /(convenience fee|service fee|platform fee|handling fee|booking fee|processing fee|additional fee|taxes.*extra|fees.*extra)/i.test(bodyText);
    if (base && fee) {
      const target = document.querySelector("[class*='price'], [class*='checkout'], [class*='total'], form") || document.body;
      addFinding(
        "Drip Pricing", "medium",
        "A base price appears alongside additional fees or charges that may be revealed separately.",
        target, 79, "Base/starting price + fee language detected."
      );
    }
  }

  function calculateSummary() {
    const score = findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
    const high = findings.filter(f => f.severity === "high").length;
    const medium = findings.filter(f => f.severity === "medium").length;
    const low = findings.filter(f => f.severity === "low").length;
    const risk = score === 0 ? "CLEAR" : score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
    return { score, high, medium, low, risk };
  }

  function runAllDetectors() {
    if (Date.now() - lastScanAt < 350) return;
    lastScanAt = Date.now();
    findings.length = 0;
    findingId = 0;

    const detectors = [
      detectFalseUrgency,
      detectPrecheckedOptins,
      detectConfirmshaming,
      detectHiddenDecline,
      detectForcedContinuity,
      detectInterfaceInterference,
      detectTrickWording,
      detectNagging,
      detectDripPricing
    ];
    detectors.forEach(fn => { try { fn(); } catch (_) {} });

    renderOverlay();
    try {
      chrome.runtime.sendMessage({
        type: "DP_RESULTS",
        count: findings.length,
        summary: calculateSummary(),
        url: location.href
      }).catch(() => {});
    } catch (_) {}
  }

  // ---------- Overlay ----------
  function buildOverlay() {
    const host = document.createElement("div");
    host.id = "dark-pattern-detective-host";
    host.style.all = "initial";
    document.documentElement.appendChild(host);
    shadowRoot = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host{all:initial}
      .dp-badge{position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#dc2626;color:#fff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;font-weight:700;padding:10px 14px;border-radius:999px;box-shadow:0 5px 20px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;gap:7px;transition:.15s}
      .dp-badge:hover{transform:scale(1.03)} .dp-badge.clear{background:#15803d}
      .dp-panel{position:fixed;bottom:70px;right:20px;z-index:2147483647;width:370px;max-height:70vh;overflow:auto;background:#fff;color:#111;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:none}
      .dp-panel.open{display:block}
      .dp-head{padding:14px 16px;border-bottom:1px solid #eee}.dp-title{font-size:16px;font-weight:800}.dp-sub{color:#64748b;margin-top:3px;font-size:11px}
      .dp-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;padding:10px 12px;background:#f8fafc}.dp-stat{padding:8px;border-radius:10px;background:#fff;text-align:center;border:1px solid #e2e8f0}.dp-stat b{display:block;font-size:16px}.dp-stat span{font-size:10px;color:#64748b}
      .dp-risk{margin:10px 12px 4px;padding:9px 11px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-weight:700}.dp-risk.clear{background:#f0fdf4;border-color:#bbf7d0;color:#166534}
      .dp-item{padding:12px 14px;border-top:1px solid #f1f5f9}.dp-item-type{font-weight:800}.dp-item-type.high{color:#dc2626}.dp-item-type.medium{color:#d97706}.dp-item-type.low{color:#64748b}
      .dp-meta{display:flex;gap:7px;align-items:center;margin:5px 0}.dp-pill{font-size:10px;padding:2px 6px;border-radius:999px;background:#eef2ff;color:#3730a3}.dp-evidence{font-size:11px;color:#475569;line-height:1.4;margin-top:4px}
      .dp-item-msg{color:#334155;line-height:1.4}.dp-ccpa{color:#6d28d9;font-size:10px;font-weight:700;margin-top:5px}.dp-btn{margin-top:7px;border:0;background:none;color:#2563eb;font:600 11px inherit;cursor:pointer;padding:0}
      .dp-empty{padding:24px 16px;text-align:center;color:#475569}.dp-note{padding:9px 14px;font-size:10px;color:#64748b;background:#f8fafc}
      .dp-highlight-pulse{outline:3px solid #dc2626!important;outline-offset:3px!important}
    `;
    shadowRoot.appendChild(style);

    const badge = document.createElement("div");
    badge.id = "dp-badge"; badge.className = "dp-badge";
    badge.addEventListener("click", () => {
      panelOpen = !panelOpen;
      shadowRoot.getElementById("dp-panel").classList.toggle("open", panelOpen);
    });
    shadowRoot.appendChild(badge);

    const panel = document.createElement("div");
    panel.id = "dp-panel"; panel.className = "dp-panel";
    shadowRoot.appendChild(panel);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str || "");
    return div.innerHTML;
  }

  function renderOverlay() {
    if (!shadowRoot) buildOverlay();
    const badge = shadowRoot.getElementById("dp-badge");
    const panel = shadowRoot.getElementById("dp-panel");
    const summary = calculateSummary();

    if (!findings.length) {
      badge.className = "dp-badge clear";
      badge.textContent = "✓ No potential patterns found";
      panel.innerHTML = `<div class="dp-head"><div class="dp-title">Dark Pattern Detective</div><div class="dp-sub">Local analysis • ${escapeHtml(location.hostname || "this page")}</div></div><div class="dp-empty">No potential dark-pattern signals were detected in the visible page.</div><div class="dp-note">A clean result is not proof that a page is free of manipulation.</div>`;
      return;
    }

    badge.className = "dp-badge";
    badge.textContent = `⚠ ${findings.length} signal${findings.length === 1 ? "" : "s"} • ${summary.risk}`;

    const items = findings.map(f => `
      <div class="dp-item">
        <div class="dp-item-type ${f.severity}">${escapeHtml(f.type)}</div>
        <div class="dp-meta"><span class="dp-pill">${escapeHtml(f.severity.toUpperCase())}</span><span class="dp-pill">${f.confidence}% confidence</span></div>
        <div class="dp-item-msg">${escapeHtml(f.message)}</div>
        <div class="dp-evidence"><b>Evidence:</b> ${escapeHtml(f.evidence)}</div>
        ${f.ccpaCategory ? `<div class="dp-ccpa">India CCPA 2023: ${escapeHtml(f.ccpaCategory)}</div>` : ""}
        <button class="dp-btn" data-dp-jump="${f.id}">Show evidence on page →</button>
      </div>`).join("");

    panel.innerHTML = `
      <div class="dp-head"><div class="dp-title">🕵️ Dark Pattern Detective</div><div class="dp-sub">${escapeHtml(location.hostname || "this page")} • local-only scan</div></div>
      <div class="dp-summary">
        <div class="dp-stat"><b>${summary.high}</b><span>HIGH</span></div>
        <div class="dp-stat"><b>${summary.medium}</b><span>MEDIUM</span></div>
        <div class="dp-stat"><b>${summary.low}</b><span>LOW</span></div>
      </div>
      <div class="dp-risk ${summary.risk === "CLEAR" ? "clear" : ""}">${summary.risk === "HIGH" ? "⚠ High signal level" : summary.risk === "MEDIUM" ? "◼ Medium signal level" : "● Low signal level"} <span style="float:right">${findings.length} findings</span></div>
      ${items}
      <div class="dp-note">Heuristic signals are not legal conclusions. Review the evidence before deciding.</div>
    `;

    panel.querySelectorAll("[data-dp-jump]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-dp-jump");
        const target = document.querySelector(`[data-dp-id="${CSS.escape(id)}"]`);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("dp-highlight-pulse");
        setTimeout(() => target.classList.remove("dp-highlight-pulse"), 2200);
      });
    });
  }

  function scheduleScan(delay = 900) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(runAllDetectors, delay);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") scheduleScan(350);
  else document.addEventListener("DOMContentLoaded", () => scheduleScan(350), { once: true });

  const observer = new MutationObserver(() => scheduleScan(1000));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", () => scheduleScan(300));
  window.addEventListener("hashchange", () => scheduleScan(300));

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "DP_GET_RESULTS") {
      const summary = calculateSummary();
      sendResponse({
        count: findings.length,
        summary,
        findings: findings.map(f => ({
          id: f.id, type: f.type, severity: f.severity, message: f.message,
          evidence: f.evidence, confidence: f.confidence, ccpaCategory: f.ccpaCategory
        }))
      });
    } else if (msg.type === "DP_RESCAN") {
      runAllDetectors();
      sendResponse({ ok: true });
    }
    return true;
  });
})();
