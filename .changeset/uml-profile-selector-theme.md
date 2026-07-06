---
'@finos/legend-application-studio': patch
---

Fix the profile/stereotype and profile/tag dropdowns in the UML editors (class, association, enumeration, property) rendering with a white menu in dark theme. These `CustomSelectorInput`s relied on a `darkTheme` prop that no caller passed, so they were always stuck in light mode; they now derive their dark/light mode from the active application theme.
