/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test, describe, expect, beforeEach } from '@jest/globals';
import { flowResult } from 'mobx';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import {
  McpServer,
  type McpServerToolsResponse,
  type McpServerPage,
} from '@finos/legend-server-marketplace';
import {
  IntelligenceCatalogStore,
  IntelligenceCatalogType,
} from '../intelligence/IntelligenceCatalogStore.js';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';

const LEGEND_MCP_URL_PREFIX =
  'https://example.test/api/mcp/services/server/Service';

const createTestMcpServer = (
  name: string,
  displayName: string,
  url: string,
): McpServer => {
  const server = new McpServer();
  server.name = name;
  server.displayName = displayName;
  server.url = url;
  server.description = 'Sample MCP server used for testing.';
  server.type = 'STREAMABLE';
  server.active = true;
  server.requireApproval = false;
  server.version = 1;
  return server;
};

const TEST_DATA__servers: McpServer[] = [
  createTestMcpServer('a-mcp', 'Vendor A - One', `${LEGEND_MCP_URL_PREFIX}A`),
  createTestMcpServer('b-mcp', 'Vendor B - Two', `${LEGEND_MCP_URL_PREFIX}B`),
  createTestMcpServer('c-mcp', 'Vendor A - Three', `${LEGEND_MCP_URL_PREFIX}C`),
  createTestMcpServer('d-mcp', 'Vendor C - Four', 'https://example.test/mcp'),
];

const createTestStore = (): IntelligenceCatalogStore => {
  const store = new IntelligenceCatalogStore(
    {} as unknown as LegendMarketplaceBaseStore,
  );
  store.mcpServers = TEST_DATA__servers;
  return store;
};

describe(unitTest('IntelligenceCatalogStore filtering'), () => {
  let store: IntelligenceCatalogStore;

  beforeEach(() => {
    store = createTestStore();
  });

  test('lists only Legend MCP servers', () => {
    expect(store.legendMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'b-mcp',
      'c-mcp',
    ]);
  });

  test('derives the available vendors from Legend servers only, sorted', () => {
    expect(store.availableVendors).toEqual(['Vendor A', 'Vendor B']);
  });

  test('filters by vendor', () => {
    store.toggleVendorFilter('Vendor A');

    expect(store.filteredMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'c-mcp',
    ]);
  });

  test('toggling the same vendor twice removes the filter', () => {
    store.toggleVendorFilter('Vendor A');
    store.toggleVendorFilter('Vendor A');

    expect(store.vendorFilters).toEqual([]);
    expect(store.filteredMcpServers).toHaveLength(3);
  });

  test('clearFilters resets the vendor selection', () => {
    store.toggleVendorFilter('Vendor A');
    store.clearFilters();

    expect(store.hasActiveFilters).toBe(false);
    expect(store.filteredMcpServers).toHaveLength(3);
  });
});

describe(unitTest('IntelligenceCatalogStore pagination'), () => {
  let store: IntelligenceCatalogStore;

  beforeEach(() => {
    store = createTestStore();
    store.setItemsPerPage(2);
  });

  test('paginates the filtered servers', () => {
    expect(store.paginatedMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'b-mcp',
    ]);

    store.setPage(2);

    expect(store.paginatedMcpServers.map((server) => server.name)).toEqual([
      'c-mcp',
    ]);
  });

  test('paginates over the filtered set rather than the full one', () => {
    store.toggleVendorFilter('Vendor A');

    expect(store.paginatedMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'c-mcp',
    ]);
  });

  test('resets to the first page when a vendor filter is toggled', () => {
    store.setPage(2);
    store.toggleVendorFilter('Vendor A');

    expect(store.page).toBe(1);
  });

  test('resets to the first page when the catalog type changes', () => {
    store.setPage(2);
    store.setCatalogType(IntelligenceCatalogType.MCPS);

    expect(store.page).toBe(1);
    expect(store.catalogType).toBe(IntelligenceCatalogType.MCPS);
  });

  test('previews only the first few servers regardless of page size', () => {
    expect(store.previewMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'b-mcp',
      'c-mcp',
    ]);
  });
});

describe(unitTest('IntelligenceCatalogStore lookup'), () => {
  test('finds a Legend MCP server by name', () => {
    expect(createTestStore().findLegendMcpServer('b-mcp')?.displayName).toBe(
      'Vendor B - Two',
    );
  });

  test('does not resolve a server excluded from the catalog', () => {
    expect(createTestStore().findLegendMcpServer('d-mcp')).toBeUndefined();
  });
});

describe(unitTest('IntelligenceCatalogStore last viewed server'), () => {
  test('has no last viewed server before one is opened', () => {
    expect(createTestStore().lastViewedMcpServerName).toBeUndefined();
  });

  test('remembers the most recently opened server', () => {
    const store = createTestStore();

    store.setLastViewedMcpServerName('a-mcp');
    store.setLastViewedMcpServerName('b-mcp');

    expect(store.lastViewedMcpServerName).toBe('b-mcp');
  });

  test('keeps the last viewed server when filters change', () => {
    const store = createTestStore();

    store.setLastViewedMcpServerName('a-mcp');
    store.toggleVendorFilter('Vendor B');
    store.setPage(2);

    expect(store.lastViewedMcpServerName).toBe('a-mcp');
  });
});

const TEST_TOKEN = 'test-token';

const createTestMcpServerPage = (
  serverNames: string[],
  totalPages: number,
): PlainObject<McpServerPage> => ({
  total_pages: totalPages,
  servers: serverNames.map((name) => ({
    name,
    display_name: `Vendor A - ${name}`,
    description: 'Sample MCP server used for testing.',
    url: `${LEGEND_MCP_URL_PREFIX}${name}`,
    type: 'STREAMABLE',
    active: true,
    require_approval: false,
    version: 1,
  })),
});

describe(unitTest('IntelligenceCatalogStore registry fetch'), () => {
  test('reads the first page, then fetches the remaining pages together', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new IntelligenceCatalogStore(baseStore);
    const getMcpServers = createSpy(
      baseStore.marketplaceServerClient,
      'getMcpServers',
    ).mockImplementation((page: number) =>
      Promise.resolve(createTestMcpServerPage([`page-${page}`], 3)),
    );

    await flowResult(store.fetchMcpServers(TEST_TOKEN));

    expect(getMcpServers).toHaveBeenCalledTimes(3);
    expect(getMcpServers.mock.calls.map((call) => call[0])).toEqual([1, 2, 3]);
    expect(store.mcpServers.map((server) => server.name)).toEqual([
      'page-1',
      'page-2',
      'page-3',
    ]);
  });

  test('does not fetch the registry again once it has been read', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new IntelligenceCatalogStore(baseStore);
    const getMcpServers = createSpy(
      baseStore.marketplaceServerClient,
      'getMcpServers',
    ).mockResolvedValue(createTestMcpServerPage(['a-mcp'], 1));

    await flowResult(store.fetchMcpServers(TEST_TOKEN));
    await flowResult(store.fetchMcpServers(TEST_TOKEN));

    expect(getMcpServers).toHaveBeenCalledTimes(1);
    expect(store.mcpServers).toHaveLength(1);
  });

  test('fetches the registry again after a failure', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new IntelligenceCatalogStore(baseStore);
    const getMcpServers = createSpy(
      baseStore.marketplaceServerClient,
      'getMcpServers',
    ).mockRejectedValueOnce(new Error('Signature has expired'));

    await flowResult(store.fetchMcpServers(TEST_TOKEN));

    expect(store.fetchingServersState.hasFailed).toBe(true);
    expect(store.mcpServers).toHaveLength(0);

    getMcpServers.mockResolvedValue(createTestMcpServerPage(['a-mcp'], 1));
    await flowResult(store.fetchMcpServers(TEST_TOKEN));

    expect(getMcpServers).toHaveBeenCalledTimes(2);
    expect(store.fetchingServersState.hasSucceeded).toBe(true);
    expect(store.mcpServers.map((server) => server.name)).toEqual(['a-mcp']);
  });
});

describe(unitTest('IntelligenceCatalogStore search'), () => {
  let store: IntelligenceCatalogStore;

  beforeEach(() => {
    store = createTestStore();
  });

  test('matches MCP servers on display name', () => {
    store.setSearchQuery('three');

    expect(store.filteredMcpServers.map((server) => server.name)).toEqual([
      'c-mcp',
    ]);
  });

  test('matches MCP servers on registry name', () => {
    store.setSearchQuery('b-mcp');

    expect(store.filteredMcpServers.map((server) => server.name)).toEqual([
      'b-mcp',
    ]);
  });

  test('matches MCP servers on description', () => {
    store.setSearchQuery('used for testing');

    expect(store.filteredMcpServers).toHaveLength(3);
  });

  test('is case insensitive and ignores surrounding whitespace', () => {
    store.setSearchQuery('  VENDOR a  ');

    expect(store.filteredMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
      'c-mcp',
    ]);
  });

  test('combines the search with the vendor filter', () => {
    store.toggleVendorFilter('Vendor A');
    store.setSearchQuery('one');

    expect(store.filteredMcpServers.map((server) => server.name)).toEqual([
      'a-mcp',
    ]);
  });

  test('matches the built-in agent by name and by description', () => {
    store.setSearchQuery('legend');
    expect(store.isAgentMatchingSearch).toBe(true);

    store.setSearchQuery('natural language');
    expect(store.isAgentMatchingSearch).toBe(true);
  });

  test('hides the agent when the search matches nothing about it', () => {
    store.setSearchQuery('vendor a');

    expect(store.isAgentMatchingSearch).toBe(false);
    expect(store.filteredMcpServers).toHaveLength(2);
  });

  test('shows everything again once the search is cleared', () => {
    store.setSearchQuery('nonexistent');
    expect(store.filteredMcpServers).toHaveLength(0);
    expect(store.isAgentMatchingSearch).toBe(false);

    store.setSearchQuery('');

    expect(store.filteredMcpServers).toHaveLength(3);
    expect(store.isAgentMatchingSearch).toBe(true);
  });

  test('resets to the first page when the search changes', () => {
    store.setItemsPerPage(2);
    store.setPage(2);
    store.setSearchQuery('vendor');

    expect(store.page).toBe(1);
  });

  test('clearFilters resets the search as well as the vendors', () => {
    store.setSearchQuery('one');
    store.toggleVendorFilter('Vendor A');
    store.clearFilters();

    expect(store.hasActiveFilters).toBe(false);
    expect(store.searchQuery).toBe('');
    expect(store.filteredMcpServers).toHaveLength(3);
  });
});

describe(unitTest('IntelligenceCatalogStore tool fetching'), () => {
  test('fetches tools for a second server while the first is still in flight', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new IntelligenceCatalogStore(baseStore);
    const resolvers: ((value: PlainObject<McpServerToolsResponse>) => void)[] =
      [];
    createSpy(
      baseStore.marketplaceServerClient,
      'getMcpServerTools',
    ).mockImplementation(
      async () =>
        new Promise<PlainObject<McpServerToolsResponse>>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const firstFetch = flowResult(store.fetchMcpServerTools('a-mcp', 'token'));
    const secondFetch = flowResult(store.fetchMcpServerTools('b-mcp', 'token'));

    expect(store.isFetchingToolsFor('a-mcp')).toBe(true);
    expect(store.isFetchingToolsFor('b-mcp')).toBe(true);

    resolvers.forEach((resolve, index) =>
      resolve({
        server_name: index === 0 ? 'a-mcp' : 'b-mcp',
        tools: [{ name: `tool-${index}` }],
        total: 1,
      }),
    );
    await Promise.all([firstFetch, secondFetch]);

    expect(store.toolsByServerName.get('a-mcp')?.tools[0]?.name).toBe('tool-0');
    expect(store.toolsByServerName.get('b-mcp')?.tools[0]?.name).toBe('tool-1');
    expect(store.isFetchingToolsFor('a-mcp')).toBe(false);
  });

  test('does not refetch tools it has already cached', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new IntelligenceCatalogStore(baseStore);
    const getMcpServerTools = createSpy(
      baseStore.marketplaceServerClient,
      'getMcpServerTools',
    ).mockResolvedValue({
      server_name: 'a-mcp',
      tools: [{ name: 'tool-0' }],
      total: 1,
    });

    await flowResult(store.fetchMcpServerTools('a-mcp', 'token'));
    await flowResult(store.fetchMcpServerTools('a-mcp', 'token'));

    expect(getMcpServerTools).toHaveBeenCalledTimes(1);
  });
});
