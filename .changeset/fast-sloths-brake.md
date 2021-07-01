---
'@finos/legend-studio': patch
---

Avoid printing out Javascript class name as these will get obfuscated and modified due to minification in production build. As such, unsupported operation error messages are resructured to print out the unsupported objects instead of their classes' names.
