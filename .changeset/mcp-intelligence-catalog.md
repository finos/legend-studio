---
'@finos/legend-application-marketplace': minor
---

Add MCP servers to the Intelligence & Agents tab:

- The tab now has an `All` / `Agents` / `MCPs` selector, with the existing agent card in the Agents section and Legend MCP servers in a new MCPs section.
- Legend MCP servers are the ones published on the Legend execution server's MCP route, plus the Legend AI orchestrator; other applications' servers in the registry are not listed.
- The page reuses the data product search results layout: a search bar, the section selector, a left filter panel and a card grid. Searching matches an entry's name, display name or description, and is kept in the `query` URL parameter so a filtered catalog can be linked to.
- The filter panel lists providers as checkboxes with per-provider counts, has its own provider search, and collapses past the first eight. It is only shown for the sections that can be filtered.
- Agents and MCP servers render through one shared catalog card so both read identically.
- Selecting an MCP server opens a detail page at `/agents/mcp/:mcpServerName` showing its configuration, sample questions, tools, security classification, ownership and metadata. Tool documentation is rendered as markdown with the LLM grounding rules collapsed.
