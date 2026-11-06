---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Containers on Legend Cube's canvas, as Alteryx's Tool Container: a block of linked steps framed together under a title, which can be folded to one box in their place. A step's menu puts it in a container, alone or with the steps before it, or in a container beside it, and takes a step at a container's edge out of it. Steps added, pasted or moved between two steps of a container join it. Containers are saved in the spec's `meta.containers`, and only change how the canvas shows the cube, never what it runs.
