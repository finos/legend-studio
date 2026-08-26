---
'@finos/legend-server-marketplace': patch
---

Add MCP server registry models and read them from `MarketplaceServerClient`:

- `McpServer`, `McpServerPage`, `McpServerTool` and `McpServerToolsResponse` deserialize the MCP registry payloads. Nullable registry fields (`token_type`, `category`, `sample_questions`, `allowed_platforms`, `security_detail`, `mcp_support_info`) are mapped to `undefined` rather than `null`.
- `MarketplaceServerClient.getMcpServers` and `getMcpServerTools` read the registry with a bearer token.
