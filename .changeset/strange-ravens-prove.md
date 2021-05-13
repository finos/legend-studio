---
'@finos/legend-studio': patch
---

Improve the UX when users launch the editor with either not-found project or workspace. In particular, if the workspace is not found, we give them the option to create the workspace to start making changes or just view the project without the need to create any workspace. This will help with the case where users share URLs to a particular project/workspace; before, they are redirected back to the setup page with no clear message, which is _very confusing_.
