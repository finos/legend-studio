---
'@finos/legend-application-studio': patch
---

Add a one-click dark/light color theme toggle (moon/sun icon) to the Studio activity bar so users no longer have to open the Settings menu to switch themes. The toggle is also surfaced on the workspace setup page and respects existing theme gating, so it only appears when both the default dark and default light themes are exposed in the current environment.

The redundant Color Theme list has been removed from the Settings (cog) menu — theme switching is now exclusively driven by the new toggle.

Also reworks the activity bar to use a flex-column layout, replacing the brittle `calc(100% - 13.4rem)` reservation that hid the Settings cog whenever a new bottom button was added.
