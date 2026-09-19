# 🕵️ Dark Pattern Detective — Hack Devengers 2.0

A local-first Chrome extension that detects **potential dark-pattern signals** in live webpages, explains the evidence, highlights the source element, and maps findings to relevant categories from India's CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023.

## What changed in v1.1

- 9 detector families instead of 5:
  - False Urgency
  - Pre-checked Opt-in / Basket Sneaking signal
  - Confirm Shaming
  - Hidden Decline / Interface Interference signal
  - Forced Continuity Risk
  - SaaS Billing
  - Interface Interference
  - Trick Wording
  - Nagging
  - Drip Pricing
- Evidence snippets for every finding
- Confidence indicator for every finding
- High / Medium / Low summary in the popup and on-page panel
- Dynamic-page rescanning using a debounced MutationObserver
- SPA navigation/hash-change rescans
- Local-only analysis; no backend or API key
- Clearer language: findings are presented as **heuristic signals**, not legal conclusions
- Improved popup UI and extension badge

## Demo

`demo-page.html` intentionally contains multiple signals so the complete workflow can be demonstrated without relying on a third-party site.

## Install

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder
5. If testing `demo-page.html` directly as a `file://` page, enable **Allow access to file URLs** for the extension
6. Open `demo-page.html` and click the extension icon
7. Click a finding's **Show evidence on page** action

## Important

The detector is a heuristic prototype. A detection is not proof that a company has violated a law. The CCPA label indicates the closest relevant category in the 2023 guidelines, not a legal determination.

## Technical design

- Chrome Manifest V3
- Vanilla JavaScript
- Content script scans the visible DOM locally
- Shadow DOM isolates the on-page UI
- Debounced MutationObserver catches many dynamically inserted elements
- WCAG contrast-ratio calculation supports the hidden-decline detector
- No external dependencies and no page data sent to a server

## Suggested judge demo

1. Open the included demo page.
2. Let the extension scan automatically.
3. Show the summary: number of signals + severity distribution.
4. Open one finding and show its evidence.
5. Click **Show evidence on page** and let the extension highlight the exact element.
6. Open the popup and show the CCPA category mapping.
7. Add an element dynamically or change the page, then use **Rescan** to demonstrate dynamic-page support.
