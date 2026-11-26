---
'@finos/legend-application-studio': patch
---

Create a workspace from a workspace in another project: the Create Workspace dialog's Workspace Source also offers "A workspace in another project…", with a project search of its own and that project's workspaces. The new workspace starts on the project's HEAD and gets all of the source's elements as one commit, replacing those with the same path and deleting none. The dialog lists the source project's dependencies that the project lacks, which it can add in a second commit, and those the project has at another version, which it leaves as they are. When adding the dependencies fails, the elements are kept, and Retry only adds the dependencies.
