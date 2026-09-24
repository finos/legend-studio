---
'@finos/legend-application-marketplace': minor
'@finos/legend-extension-dsl-data-product': minor
---

Expand telemetry coverage across the Lakehouse Entitlements flow.

- New `marketplace.click.entitlements.tab` event when switching between the My Approvals / My Pending Requests / My Closed Requests tabs.
- New `marketplace.toggle.show-requests-for-others` event when toggling the "Show my requests for others" switch on the pending and closed requests dashboards (includes which dashboard).
- New `marketplace.action.single-task` event for the single-task approve/deny buttons on the contract task, permit, and workflow data-access-request pages (previously only the bulk approve/deny action on the My Approvals dashboard was tracked).
- New shared `marketplace.escalate.data-access-request`, `marketplace.invalidate.data-access-request` (close/delete request), `marketplace.refresh.data-access-request`, and `marketplace.copy.data-access-request-field` events on `DataAccessRequestViewer`, covering the Escalate, Close/Invalidate, Refresh, and Copy (task link, eTask link, request ID, missing-ingest item) buttons. These are shared by the Marketplace entitlements dashboards and the Lakehouse Admin contracts dashboard.
