# Financial Growth Metrics Calculator – Privacy Policy

_Last updated: October 30, 2025_

Financial Growth Metrics Calculator (the "Extension") is a Chrome browser extension that helps users surface compound annual growth rate (CAGR) and median values while hovering financial tables. This policy describes how the Extension handles data.

## Summary

- **No personal data is collected, stored, or transmitted by the developer.**
- All calculations occur locally in your browser.
- The Extension never sends page contents or user information to any external server.

## Information the Extension Processes

The Extension reads table rows on the pages you visit in order to calculate CAGR and median values. These calculations are performed entirely in memory inside your browser session. The Extension does not capture, log, or forward the underlying page data to the developer or to any third party.

## Local Storage

To keep the popup in sync with your most recent hover, the Extension stores a small snippet of data (metric name, starting value, ending value, CAGR, and median) in Chrome's `storage.local`. This information:

- Stays on your device and is never transmitted elsewhere.
- Is overwritten each time you hover a different row.
- Can be cleared at any time by removing the extension or clearing Chrome's local storage for the extension.

## Permissions Rationale

- **activeTab & scripting** – needed to execute the content script that reads table rows and displays highlights when you hover.
- **storage** – used solely for the temporary, local-only caching described above.

The Extension does not request access to, nor does it interact with, any other Chrome or Google services.

## Data Sharing

The developer does not sell, trade, or otherwise share any information processed by the Extension. Because no data leaves your browser, nothing is shared with third parties.

## Open Source

This project is open source. You can review the source code on GitHub to verify how data is handled. Contributions should not introduce telemetry or external data flows without updating this policy.

## Contact

If you have questions or concerns about this policy, contact Jawad Shuaib at [jawad.php@gmail.com](mailto:jawad.php@gmail.com) or open an issue in the project's GitHub repository.

## Changes to This Policy

This policy may be updated from time to time. The "Last updated" date will always reflect the most recent revision. Continued use of the Extension after an update constitutes acceptance of the revised policy.
