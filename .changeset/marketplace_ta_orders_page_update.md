---
'@finos/legend-application-marketplace': patch
'@finos/legend-server-marketplace': patch
---

Marketplace Terminals and Add-Ons - Order progress tracker update to reflect new approval stages

- Order progress tracker now reflects the full Privilege Manager / Market Data First Approver / Fulfillment Approver / Business Analyst approval chain (branching on `order_type` and `bbg_terminal_flag`) with rejected/cancelled/auto-terminated terminal states
- Track Order now links to the tracking URL of the order's _current_ workflow stage instead of always the Privilege Manager URL
- Cancel Order is now available at any approval stage and is only disabled once the order reaches the RPM/fulfillment stage
- Closure Information now shows the details of whichever stage actually closed the order (the rejecting stage, or the final approval/fulfillment stage) instead of always showing the Privilege Manager stage's details
