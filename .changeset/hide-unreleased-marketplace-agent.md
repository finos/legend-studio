---
'@finos/legend-application-marketplace': patch
---

Hide the Legend Marketplace AI agent from the Intelligence catalog while it is not ready for general use. `Agents` joins `Skills` in `UNAVAILABLE_CATALOG_TYPES`, and everything that belongs to that catalog type now follows the same switch:

- The `Agents` option renders with the existing "Coming soon" treatment and can no longer be selected.
- The Agents section, and with it the Legend Marketplace AI agent card, is no longer rendered.
- The search placeholder no longer offers to search agents.
- `IntelligenceCatalogStore.legendMcpServers` leaves out the `legend-ai-mcp` orchestrator, which only serves the agent, so it disappears from the MCP catalog, the provider filters derived from it, and its detail route (which now reports the server as not found).

The agent chat and its card component are deliberately gated rather than deleted: removing `IntelligenceCatalogType.AGENTS` from `UNAVAILABLE_CATALOG_TYPES` restores the whole surface.
