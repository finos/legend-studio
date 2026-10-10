---
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Legend Cube's node editor floats below its node in place of the side panel. Closing it any way but Cancel applies its edits, and so does Execute, Undo, a node drag, a connection or a context-menu action. Steps from the palette, the context menu and the new Add Items menu go after the selected node. The empty canvas opens the source dialog with no tab chosen. A node's messages show in a tooltip. A link to `/query/cube?sourceType=dataProductAccessPoint&sourceId=…` opens a new cube on that access point (M3b).
