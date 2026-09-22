---
'@finos/legend-application-studio': patch
'@finos/legend-art': patch
---

Add a "Was this helpful?" thumbs-up / thumbs-down feedback widget to the Legend Studio showcase viewer.

The widget renders in two places: the deep-link viewer's status bar (`/showcase/:path`) and the assistant panel's in-panel showcase viewer. Each vote emits a `showcase.viewer.feedback.submit` telemetry event carrying `showcasePath`, `title?`, `vote` (`up` / `down`), and the `surface` the vote came from (`deep-link-viewer` or `assistant-panel`). After voting, the widget briefly shows a "Thanks for the feedback!" acknowledgement and then unmounts. The user's vote is cached in `UserDataService` (localStorage, capped at 200 entries) so the widget is suppressed on subsequent visits to the same showcase — telemetry remains the source of truth for aggregate analysis and there is no backend write today.

Also exposes `ThumbsUpIcon` / `ThumbsDownIcon` from `@finos/legend-art`.
