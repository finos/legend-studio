---
'@finos/legend-application-studio': patch
---

Create a workspace from an existing workspace of the same project: the Create Workspace dialog's Workspace Source also lists the project's workspaces. A new workspace made from one starts on that workspace's line (HEAD or its patch) and gets what it changed since it was created, as one commit; the dialog shows those changes first, and warns when the workspace is behind its line. When the copy fails, the dialog keeps the new workspace and offers to retry the copy or delete it.
