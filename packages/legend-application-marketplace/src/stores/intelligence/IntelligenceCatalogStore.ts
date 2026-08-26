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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type McpServer,
  McpServerPage,
  McpServerToolsResponse,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import {
  buildMcpServerVendorIndex,
  isLegendMcpServer,
  OTHER_VENDOR,
  matchesCatalogSearch,
  LEGEND_MARKETPLACE_AI_AGENT,
} from './IntelligenceCatalogUtils.js';

export enum IntelligenceCatalogType {
  ALL = 'All',
  AGENTS = 'Agents',
  MCPS = 'MCPs',
  SKILLS = 'Skills',
}

const MCP_REGISTRY_FETCH_PAGE_SIZE = 100;
const MCP_REGISTRY_MAX_PAGES = 20;
const MCP_REGISTRY_FIRST_PAGE = 1;
const MCP_ITEMS_PER_PAGE = 12;
const CATALOG_PREVIEW_COUNT = 6;

export class IntelligenceCatalogStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly fetchingServersState = ActionState.create();

  mcpServers: McpServer[] = [];
  toolsByServerName = new Map<string, McpServerToolsResponse>();
  serverNamesFetchingTools = new Set<string>();
  catalogType = IntelligenceCatalogType.ALL;
  vendorFilters: string[] = [];
  searchQuery = '';
  vendorSearchTerm = '';
  page = 1;
  itemsPerPage = MCP_ITEMS_PER_PAGE;
  lastViewedMcpServerName: string | undefined = undefined;

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    makeObservable(this, {
      mcpServers: observable,
      toolsByServerName: observable,
      serverNamesFetchingTools: observable,
      catalogType: observable,
      vendorFilters: observable,
      searchQuery: observable,
      vendorSearchTerm: observable,
      page: observable,
      itemsPerPage: observable,
      lastViewedMcpServerName: observable,
      legendMcpServers: computed,
      vendorByServerName: computed,
      availableVendors: computed,
      searchableVendors: computed,
      filteredMcpServers: computed,
      previewMcpServers: computed,
      paginatedMcpServers: computed,
      hasActiveFilters: computed,
      isAgentMatchingSearch: computed,
      isLoading: computed,
      setCatalogType: action,
      toggleVendorFilter: action,
      setSearchQuery: action,
      setVendorSearchTerm: action,
      clearFilters: action,
      setPage: action,
      setItemsPerPage: action,
      setLastViewedMcpServerName: action,
      fetchMcpServers: flow,
      fetchMcpServerTools: flow,
    });
  }

  get legendMcpServers(): McpServer[] {
    return this.mcpServers.filter(isLegendMcpServer);
  }

  get vendorByServerName(): Map<string, string> {
    return buildMcpServerVendorIndex(this.legendMcpServers);
  }

  getVendorForServer(server: McpServer): string {
    return this.vendorByServerName.get(server.name) ?? OTHER_VENDOR;
  }

  get availableVendors(): string[] {
    return Array.from(new Set(this.vendorByServerName.values())).sort(
      (first, second) =>
        first === OTHER_VENDOR
          ? 1
          : second === OTHER_VENDOR
            ? -1
            : first.localeCompare(second),
    );
  }

  get searchableVendors(): string[] {
    const term = this.vendorSearchTerm.trim().toLowerCase();
    return term.length === 0
      ? this.availableVendors
      : this.availableVendors.filter((vendor) =>
          vendor.toLowerCase().includes(term),
        );
  }

  get filteredMcpServers(): McpServer[] {
    return this.legendMcpServers.filter(
      (server) =>
        matchesCatalogSearch(server, this.searchQuery) &&
        (this.vendorFilters.length === 0 ||
          this.vendorFilters.includes(this.getVendorForServer(server))),
    );
  }

  get isAgentMatchingSearch(): boolean {
    return matchesCatalogSearch(LEGEND_MARKETPLACE_AI_AGENT, this.searchQuery);
  }

  get previewMcpServers(): McpServer[] {
    return this.filteredMcpServers.slice(0, CATALOG_PREVIEW_COUNT);
  }

  get paginatedMcpServers(): McpServer[] {
    const start = (this.page - 1) * this.itemsPerPage;
    return this.filteredMcpServers.slice(start, start + this.itemsPerPage);
  }

  get hasActiveFilters(): boolean {
    return this.vendorFilters.length > 0 || this.searchQuery.trim().length > 0;
  }

  get isLoading(): boolean {
    return this.fetchingServersState.isInProgress;
  }

  setCatalogType(catalogType: IntelligenceCatalogType): void {
    this.catalogType = catalogType;
    this.page = 1;
  }

  setSearchQuery(searchQuery: string): void {
    this.searchQuery = searchQuery;
    this.page = 1;
  }

  setVendorSearchTerm(vendorSearchTerm: string): void {
    this.vendorSearchTerm = vendorSearchTerm;
  }

  toggleVendorFilter(vendor: string): void {
    this.vendorFilters = this.vendorFilters.includes(vendor)
      ? this.vendorFilters.filter((entry) => entry !== vendor)
      : [...this.vendorFilters, vendor];
    this.page = 1;
  }

  clearFilters(): void {
    this.vendorFilters = [];
    this.searchQuery = '';
    this.vendorSearchTerm = '';
    this.page = 1;
  }

  setPage(page: number): void {
    this.page = page;
  }

  setItemsPerPage(itemsPerPage: number): void {
    this.itemsPerPage = itemsPerPage;
    this.page = 1;
  }

  setLastViewedMcpServerName(serverName: string): void {
    this.lastViewedMcpServerName = serverName;
  }

  countMcpServersForVendor(vendor: string): number {
    return this.legendMcpServers.filter(
      (server) => this.getVendorForServer(server) === vendor,
    ).length;
  }

  isFetchingToolsFor(serverName: string): boolean {
    return this.serverNamesFetchingTools.has(serverName);
  }

  findLegendMcpServer(name: string): McpServer | undefined {
    return this.legendMcpServers.find((server) => server.name === name);
  }

  /**
   * The registry has no filter parameter, so the first page is read to learn the page
   * count, the remainder are fetched together, and Legend servers are selected here.
   */
  *fetchMcpServers(token: string): GeneratorFn<void> {
    if (
      this.fetchingServersState.isInProgress ||
      this.fetchingServersState.hasSucceeded
    ) {
      return;
    }
    this.fetchingServersState.inProgress();
    try {
      const client = this.marketplaceBaseStore.marketplaceServerClient;
      const firstPage = McpServerPage.serialization.fromJson(
        (yield client.getMcpServers(
          MCP_REGISTRY_FIRST_PAGE,
          MCP_REGISTRY_FETCH_PAGE_SIZE,
          token,
        )) as PlainObject<McpServerPage>,
      );
      const totalPages = firstPage.totalPages ?? MCP_REGISTRY_FIRST_PAGE;
      const readablePages = Math.min(totalPages, MCP_REGISTRY_MAX_PAGES);
      const remainingPages = (yield Promise.all(
        Array.from(
          { length: Math.max(readablePages - MCP_REGISTRY_FIRST_PAGE, 0) },
          (_, index) =>
            client.getMcpServers(
              MCP_REGISTRY_FIRST_PAGE + index + 1,
              MCP_REGISTRY_FETCH_PAGE_SIZE,
              token,
            ),
        ),
      )) as PlainObject<McpServerPage>[];
      if (totalPages > MCP_REGISTRY_MAX_PAGES) {
        this.marketplaceBaseStore.applicationStore.logService.warn(
          LogEvent.create(
            LEGEND_MARKETPLACE_APP_EVENT.FETCH_MCP_SERVERS_PAGE_LIMIT_REACHED,
          ),
          `MCP registry returned ${totalPages} pages; only the first ${MCP_REGISTRY_MAX_PAGES} were read`,
        );
      }
      this.mcpServers = [
        ...firstPage.servers,
        ...remainingPages.flatMap(
          (rawPage) => McpServerPage.serialization.fromJson(rawPage).servers,
        ),
      ];
      this.fetchingServersState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching MCP servers: ${error.message}`,
      );
      this.fetchingServersState.fail();
    }
  }

  /**
   * Tracked per server rather than with a single action state, so that opening a
   * second server while the first is still loading does not drop its request.
   */
  *fetchMcpServerTools(serverName: string, token: string): GeneratorFn<void> {
    if (
      this.toolsByServerName.has(serverName) ||
      this.serverNamesFetchingTools.has(serverName)
    ) {
      return;
    }
    this.serverNamesFetchingTools.add(serverName);
    try {
      const rawTools =
        (yield this.marketplaceBaseStore.marketplaceServerClient.getMcpServerTools(
          serverName,
          token,
        )) as PlainObject<McpServerToolsResponse>;
      this.toolsByServerName.set(
        serverName,
        McpServerToolsResponse.serialization.fromJson(rawTools),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching tools for ${serverName}: ${error.message}`,
      );
    } finally {
      this.serverNamesFetchingTools.delete(serverName);
    }
  }
}
