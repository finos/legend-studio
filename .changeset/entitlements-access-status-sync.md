---
'@finos/legend-application-marketplace': patch
'@finos/legend-extension-dsl-data-product': patch
---

Show whether approved access has actually been applied on the My Closed Requests tab. Each approved contract or completed data request now shows an access status next to its state: `Active` when the sync status is fully synced, `Setting up` while the approved access is still being applied, `Needs attention` when there is no subscription or syncing reported failures, and `Not checked` when the sync status is not available. The sync status is only fetched for approved contracts and completed data requests that are on screen, at most 5 at a time so the contract server is not overloaded, and a request that has not started is dropped when its row scrolls away or the page is left. Opening a contract or data request reuses the sync status that was fetched for its row, and refreshing it in the viewer fetches it again. The State column also uses the readable state labels instead of raw state names, and sorts and filters on the state alone.

Show the contract errors (missing ingests and unsynced entities) for RMS data requests as well as contracts, on the My Pending Requests, My Closed Requests and My Approvals tabs. A long list of items in the contract errors, such as the unsynced users of a large RMS org node, scrolls within its area instead of stretching it.
