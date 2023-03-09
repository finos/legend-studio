---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Renamed services in `ApplicationStore`: `log -> logService`, `commandCenter -> commandService`, `navigator -> navigationService`. Moved `notification` logic inside of `NotificationService`, moved `alert` logic inside of `AlertService`.
