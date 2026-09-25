---
'@finos/legend-application-marketplace': patch
---

Add a quick-search box and per-column text filters (Consumer Type, Target User, Requester, Target Data Product, Target Access Point Group, Business Justification) to the Lakehouse entitlements "My Approvals" dashboard, so Privilege Managers and Data Owners can narrow a large pending-tasks queue down to specific requests instead of paging through everything.

The "select all" header checkbox now only selects the rows currently passing a grid's active filters, not the full underlying task list, so filtering down to specific requests can never silently bulk-approve or bulk-deny hidden ones.
