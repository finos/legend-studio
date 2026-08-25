---
'@finos/legend-application-marketplace': patch
---

Fix "Cancel Subscription" on the Subscriptions page sending a blank
`kerberos` field in the cancellation request payload (causing the backend
to reject it with a 400 "Invalid Payload" error) when the user had not
explicitly changed the target user. `SubscriptionStore` now defaults
`selectedUser` to the current user, consistent with
`LegendMarketPlaceVendorDataStore`, and clearing the user search input
resets to the current user instead of leaving `selectedUser` blank.
