# 🕵️ Dark Pattern Detective

A browser extension that scans any website in real time and exposes **dark patterns** — the manipulative UI/UX tricks companies use to pressure you into purchases, subscriptions, or giving up data you didn't mean to.

Built for **Hack Devengers 2.0** (24-hour open innovation hackathon).

## The Problem

Every person who shops, signs up for a trial, or browses the web today runs into design tricks engineered to override their judgment:
- Countdown timers that "expire" but reset on refresh
- Checkboxes pre-checked to opt you into newsletters, insurance, or paid add-ons
- Guilt-tripping decline buttons ("No thanks, I don't want to save money")
- Cancel/decline buttons hidden in tiny, low-contrast text
- Free trials that silently convert to paid subscriptions with no visible cancellation path

These are not accidents. Regulators worldwide have taken action:
- The US FTC secured a **$2.5 billion settlement from Amazon** in September 2025 over Prime's "Iliad Flow" cancellation dark pattern — cancelling required navigating four pages, six clicks, and fifteen options.
- **India's Central Consumer Protection Authority (CCPA)** issued the *Guidelines for Prevention and Regulation of Dark Patterns, 2023* — a legally enforceable framework defining 13 prohibited categories, with penalties of up to 2 years' imprisonment and ₹10 lakh fine for a first offense. Indian consumers are estimated to lose up to ₹280 billion annually to these tactics.

### Why this project, specifically
Several dark-pattern-detecting browser extensions already exist globally (built around US FTC / EU GDPR frameworks). **This project's distinct contribution is tagging every detection against India's own CCPA 2023 categories**, making it directly relevant to Indian users and Indian law — a gap not covered by existing English-first, US/EU-oriented tools.

## The Solution

**Dark Pattern Detective** is a lightweight Chrome extension (Manifest V3) that:
1. Scans the live DOM of every page you visit
2. Applies five independent heuristic detectors for known dark-pattern categories
3. Shows a floating on-page badge with a live count of patterns found
4. Lets you click any finding to jump straight to the offending element on the page, highlighted
5. Also shows a full breakdown in the toolbar popup, with the extension icon badge showing a live count

No servers, no accounts, no data leaves your browser — everything runs locally in the content script.

## Detection Categories

| Pattern | How it's detected |
|---|---|
| **Fake Urgency** | Regex + class-name matching for scarcity language ("Only 2 left", "Offer ends") combined with visible countdown-style timestamps |
| **Pre-checked Opt-ins** | Finds checked `<input type="checkbox">` elements whose surrounding label text matches newsletter/insurance/add-on keywords |
| **Confirmshaming** | Matches known guilt-tripping decline-button phrasing patterns ("No thanks, I don't want to save money") |
| **Hidden Decline Buttons** | Computes actual font-size, opacity, and WCAG contrast ratio of cancel/decline/unsubscribe buttons vs. their background, and flags ones designed to be hard to see or read |
| **Forced Continuity Risk** | Detects pages that mention a free trial + auto-charging language but contain no visible cancellation instructions |

Each finding is also tagged with the closest matching category under India's CCPA Dark Pattern Guidelines, 2023 (e.g. "False Urgency", "Basket Sneaking / Forced Action", "Confirmshaming", "Subscription Trap"), shown directly in both the on-page overlay and the popup.

## Tech Stack

- Vanilla JavaScript (no build step, no external dependencies)
- Chrome Extension Manifest V3 (content script + background service worker + popup)
- Shadow DOM for the in-page overlay, so it never inherits or clashes with the host site's styles
- WCAG relative-luminance contrast-ratio math for the hidden-button detector

## How to Run It

1. Clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select this project folder
5. Visit any website — the extension scans automatically. To see a guaranteed live demo with every pattern type present, open `demo-page.html` in this repo directly in Chrome (`File > Open File`)
6. Click the extension icon for a full popup breakdown, or click the on-page red badge (bottom-right corner) to jump directly to each flagged element

## Project Structure

```
dark-pattern-detective/
├── manifest.json      # Extension configuration (Manifest V3)
├── content.js         # Core detection engine + in-page overlay (runs on every page)
├── background.js      # Updates the toolbar badge count per tab
├── popup.html/css/js  # Toolbar popup UI
├── demo-page.html     # Self-contained page with every dark pattern type, for live demos
└── icons/              # Extension icons
```

## Why This Matters

Dark patterns are not a niche annoyance — they affect essentially every internet user, in every country, regardless of income or language, every time they shop or sign up online. Making these tricks *visible* is the first step to making informed consent possible again.

## Future Work

- Machine-learning classifier trained on a labeled dark-pattern dataset, layered on top of the current rule-based engine for higher recall
- Community-reported pattern database, crowd-sourced like an ad-blocker filter list
- Firefox/Edge ports
- Severity scoring aggregated into an overall site "manipulation score"

---
Built solo in 24 hours for Hack Devengers 2.0.

## Enhanced Features Added in v1.1

The original project and documentation above are preserved. The following features were added to the extension without removing the original functionality:

- Expanded detection coverage with additional heuristic signals:
  - SaaS Billing
  - Interface Interference
  - Trick Wording
  - Nagging
  - Drip Pricing
  - Hidden Decline / Interface Interference signals
  - Pre-checked Opt-in / Basket Sneaking signals
- Evidence snippets are shown for each detected finding.
- Each finding includes a confidence indicator.
- Findings are grouped into **High / Medium / Low** severity levels.
- The popup now includes an overall risk summary and severity counts.
- Added **Show evidence on page** so a finding can jump to and highlight the exact detected element.
- Added **Rescan this page** support for manually triggering a fresh scan.
- Added debounced **MutationObserver** support to detect many dynamically inserted page elements.
- Added rescanning support for SPA navigation, `popstate`, and hash changes.
- Improved the extension toolbar badge to reflect the detected risk level.
- Improved popup and on-page overlay UI for clearer presentation during demos.
- Kept the project **local-first**: no backend, external API, or API key is required for detection.
- Detection results are explicitly presented as **heuristic signals**, not legal conclusions.
- CCPA category labels are presented as the closest relevant category from the 2023 guidelines, not as a legal determination.

### Updated Demo Flow

The original `demo-page.html` is retained. The enhanced version can be used to demonstrate:

1. Automatic page scanning
2. Risk summary and severity distribution
3. Evidence snippets for detected signals
4. Exact on-page evidence highlighting
5. CCPA category mapping in the popup
6. Dynamic-page rescanning
7. Manual **Rescan this page** functionality

### Enhanced Technical Notes

The v1.1 implementation continues to use the original Manifest V3, Vanilla JavaScript, Shadow DOM, local DOM analysis, and WCAG contrast-ratio approach while extending the detection and presentation layers. No external dependencies were added.

## Enhanced Features Added in v1.2.0

The v1.2.0 release builds on the original Dark Pattern Detective and expands the extension into a more complete detection, explanation, scoring, and reporting tool.

The following features were added or improved in v1.2.0:

- Expanded the detector into **10 user-facing dark-pattern signal types**:
  - False Urgency
  - Pre-checked Opt-in
  - Confirmshaming
  - Hidden Decline Button
  - Forced Continuity Risk
  - SaaS Billing
  - Interface Interference
  - Trick Wording
  - Nagging
  - Drip Pricing

- Added a **Manipulation Score from 0–100** to summarize detected signals.

- Added overall signal levels:
  - CLEAR
  - LOW
  - MEDIUM
  - HIGH

- Added **confidence percentages** for individual findings.

- Added **evidence extraction** so each finding can show the text or page element that triggered the detector.

- Added **India CCPA 2023 category mapping** for detected signals.

- Added an on-page **Shadow DOM Detective Panel** showing:
  - Manipulation Score
  - Overall signal level
  - Detected findings
  - Severity
  - Confidence
  - Evidence
  - CCPA category mapping

- Added **jump-to-evidence and highlighting**, allowing users to locate the detected element directly on the webpage.

- Added **Download Report** functionality that generates a local plain-text `.txt` scan report.

- Improved the popup dashboard with:
  - Overall signal level
  - Manipulation Score
  - HIGH / MEDIUM / LOW finding counts
  - Finding messages
  - Evidence
  - Confidence
  - CCPA mapping
  - Rescan button
  - Download report button

- Added **dynamic page rescanning** using `MutationObserver` for many dynamically inserted page elements.

- Added rescanning for `popstate` and `hashchange` navigation events.

- Improved the extension badge to reflect detected findings and higher-severity results.

- Strengthened the **local-first architecture**:
  - No external AI API
  - No backend server
  - No API key
  - No remote database
  - Detection runs locally in the browser

- Improved the demonstration page with multiple intentional dark-pattern examples for testing.

- Added clearer **heuristic and legal limitations**, making it clear that detections are signals for investigation and are not legal conclusions.

### Version 1.2.0 Summary

Version 1.2.0 moves Dark Pattern Detective beyond basic pattern detection by combining:

**Detection → Evidence → Confidence → Severity → CCPA Mapping → Manipulation Score → Visual Highlighting → Report Generation**

All detection remains browser-side and local-first.

---

## Version History — What We Implemented

### Version 1.0 — Initial Dark Pattern Detective

The first version established the core Chrome extension and the basic dark-pattern detection workflow.

Implemented in Version 1.0:

- Chrome Extension using Manifest V3
- Local browser-side detection using JavaScript
- Initial heuristic dark-pattern detection
- Basic popup interface
- Background service worker
- Extension badge showing detected findings
- Demo webpage for testing dark-pattern examples
- Local-first architecture without an external backend
- Basic detection of patterns such as:
  - False Urgency
  - Pre-checked Opt-in
  - Confirmshaming
  - Hidden Decline Button
  - Forced Continuity / subscription-related signals
- Basic page scanning and result display

Version 1.0 provided the foundation for the project: detecting potential dark-pattern signals directly inside the browser.

### Version 1.1 — Detection, Evidence & Explainability Upgrade

Version 1.1 expanded the original detector and introduced a more explainable analysis experience.

Implemented in Version 1.1:

- Expanded detector coverage
- Named detection signals for clearer results
- Evidence snippets for detected patterns
- Confidence percentages
- LOW / MEDIUM / HIGH severity levels
- India CCPA 2023 category mapping
- Overall risk summary
- Manipulation scoring
- Improved popup dashboard
- On-page evidence highlighting
- Jump-to-evidence functionality
- Manual page rescanning
- MutationObserver-based rescanning for dynamic page changes
- SPA-related `popstate` and `hashchange` rescanning
- Risk-aware extension badge updates
- Improved user interface
- Heuristic/legal disclaimer explaining that detections are not legal conclusions

Version 1.1 moved the project from simply detecting patterns toward explaining why a signal was detected.

### Version 1.2 — Full Detective Experience

Version 1.2 builds on the previous versions and adds a more complete analysis and reporting workflow.

Implemented in Version 1.2:

- 10 user-facing detection signal types
- Manipulation Score from 0–100
- CLEAR / LOW / MEDIUM / HIGH overall signal levels
- Confidence percentage for individual findings
- Evidence extraction for findings
- India CCPA 2023 project-category mapping
- On-page Shadow DOM detective panel
- Finding-by-finding evidence display
- Jump to and highlight detected page elements
- Manual **Rescan this page**
- Dynamic DOM rescanning
- `popstate` and `hashchange` navigation rescanning
- Downloadable plain-text `.txt` scan reports
- Report generation directly in the browser
- Improved popup dashboard
- HIGH / MEDIUM / LOW finding counts
- Background badge updates based on detected findings
- Local-first processing with no external AI API, backend, or remote database
- Improved demo page containing multiple intentional dark-pattern examples
- Updated project documentation and clearer limitations

The 10 user-facing signal types in Version 1.2 are:

1. False Urgency
2. Pre-checked Opt-in
3. Confirmshaming
4. Hidden Decline Button
5. Forced Continuity Risk
6. SaaS Billing
7. Interface Interference
8. Trick Wording
9. Nagging
10. Drip Pricing

### Evolution of the Project

```text
Version 1.0
   ↓
Core Chrome extension + basic heuristic detection
   ↓
Version 1.1
   ↓
More detectors + evidence + confidence + severity
+ CCPA mapping + scoring + highlighting + rescanning
   ↓
Version 1.2
   ↓
10 user-facing signals + full detective panel
+ 0–100 manipulation score + risk levels
+ downloadable reports + dynamic rescanning
+ improved popup + stronger explainability
```

Each version extends the previous implementation rather than replacing the project's original local-first architecture.
