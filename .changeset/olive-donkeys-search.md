---
'@finos/legend-graph': patch
'@finos/legend-application-marketplace': patch
---

Allow the engine client to name the server-side authentication mechanism, through an optional `clientName` on its config that is sent as the `client_name` parameter on the two requests that read a user's own details: the current user lookup and the terminal lookup. Compilation, execution and every other engine request are unchanged, and the name is omitted when nothing is configured. The marketplace reads it from `engine.clientName` and resolves the signed-in user through its shared engine client rather than the standalone `getCurrentUserIDFromEngineServer` helper, so the name reaches that lookup; the lookup consequently authenticates the same way as the rest of the marketplace's engine traffic instead of always falling back to the session cookie. Studio and Query keep the standalone helper. Without a named mechanism the server applies its own default, which is not available to every user.
