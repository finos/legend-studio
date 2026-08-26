/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from 'react-oidc-context';
import { useSearchParams } from '@finos/legend-application/browser';
import { flowResult } from 'mobx';
import { ArrowLeftIcon, CaretRightIcon } from '@finos/legend-art';
import { CircularProgress, Container, Grid, Typography } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { LegendMarketplaceAIChatStoreProvider } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';
import { MarketplaceAIChatView } from './MarketplaceAIChatView.js';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { useIntelligenceCatalogStore } from '../../application/providers/IntelligenceCatalogStoreProvider.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { LegendMarketplaceOptionSelector } from '../../components/OptionSelector/LegendMarketplaceOptionSelector.js';
import { LegendMarketplaceMcpServerCard } from '../../components/CatalogCard/LegendMarketplaceMcpServerCard.js';
import { LegendMarketplaceAgentCard } from '../../components/CatalogCard/LegendMarketplaceAgentCard.js';
import { IntelligenceFiltersPanel } from '../../components/IntelligenceFiltersPanel/IntelligenceFiltersPanel.js';
import { PaginationControls } from '../../components/Pagination/PaginationControls.js';
import {
  IntelligenceCatalogType,
  type IntelligenceCatalogStore,
} from '../../stores/intelligence/IntelligenceCatalogStore.js';
import type { McpServer } from '@finos/legend-server-marketplace';
import { resolveMcpServerImageUrl } from '../../stores/intelligence/IntelligenceCatalogUtils.js';
import {
  generateMcpServerRoute,
  LEGEND_MARKETPLACE_INTELLIGENCE_QUERY_PARAM_TOKEN,
} from '../../__lib__/LegendMarketplaceNavigation.js';

const AGENT_COUNT = 1;

const NO_MATCHES_COUNT = 0;

const CATALOG_TYPE_OPTIONS = [
  IntelligenceCatalogType.ALL,
  IntelligenceCatalogType.AGENTS,
  IntelligenceCatalogType.MCPS,
  IntelligenceCatalogType.SKILLS,
] as const;

const UNAVAILABLE_CATALOG_TYPES = [IntelligenceCatalogType.SKILLS] as const;

const UNAVAILABLE_CATALOG_TYPE_TITLE =
  'Coming soon — hold tight, this one is still in training';

const CatalogSection = (props: {
  title: string;
  count: number;
  onViewMore: (() => void) | undefined;
  children: React.ReactNode;
}): React.ReactNode => {
  const { title, count, onViewMore, children } = props;

  return (
    <section className="marketplace-intelligence-section">
      <div className="marketplace-intelligence-section__header">
        <Typography className="marketplace-lakehouse-search-results__subtitles">
          {title}
          <span className="marketplace-intelligence-section__count">
            ({count})
          </span>
        </Typography>
        {onViewMore && (
          <button
            type="button"
            className="marketplace-intelligence-section__view-more"
            onClick={onViewMore}
          >
            View more <CaretRightIcon />
          </button>
        )}
      </div>
      {children}
    </section>
  );
};

const CatalogCardGrid = (props: {
  children: React.ReactNode;
}): React.ReactNode => (
  <Grid
    container={true}
    spacing={{ xs: 2, sm: 3, xxl: 4 }}
    columns={{ sm: 1, md: 2, lg: 3, xxl: 4 }}
    className="marketplace-lakehouse-search-results__data-product-cards"
  >
    {props.children}
  </Grid>
);

const AgentsCatalogSection = observer(
  (props: {
    intelligenceCatalogStore: IntelligenceCatalogStore;
    isPreview: boolean;
    onSelectAgent: () => void;
    onViewMore: (catalogType: IntelligenceCatalogType) => void;
  }) => {
    const { intelligenceCatalogStore, isPreview, onSelectAgent, onViewMore } =
      props;
    const isAgentMatchingSearch =
      intelligenceCatalogStore.isAgentMatchingSearch;

    return (
      <CatalogSection
        title="Agents"
        count={isAgentMatchingSearch ? AGENT_COUNT : NO_MATCHES_COUNT}
        onViewMore={
          isPreview
            ? (): void => onViewMore(IntelligenceCatalogType.AGENTS)
            : undefined
        }
      >
        {isAgentMatchingSearch ? (
          <CatalogCardGrid>
            <Grid size={1}>
              <LegendMarketplaceAgentCard onClick={onSelectAgent} />
            </Grid>
          </CatalogCardGrid>
        ) : (
          <div className="marketplace-intelligence-section__empty">
            No agents match the current filters
          </div>
        )}
      </CatalogSection>
    );
  },
);

const McpServersCatalogBody = observer(
  (props: {
    intelligenceCatalogStore: IntelligenceCatalogStore;
    mcpServers: McpServer[];
    vendorImageMap: ReadonlyMap<string, string>;
    onRetryFetchMcpServers: () => void;
    onSelectMcpServer: (serverName: string) => void;
  }) => {
    const {
      intelligenceCatalogStore,
      mcpServers,
      vendorImageMap,
      onRetryFetchMcpServers,
      onSelectMcpServer,
    } = props;

    if (intelligenceCatalogStore.fetchingServersState.hasFailed) {
      return (
        <div className="marketplace-intelligence-section__empty">
          <span>Could not load MCP servers from the registry</span>
          <button
            type="button"
            className="marketplace-intelligence-section__retry"
            onClick={onRetryFetchMcpServers}
          >
            Try again
          </button>
        </div>
      );
    }

    if (mcpServers.length === 0) {
      return (
        <div className="marketplace-intelligence-section__empty">
          {intelligenceCatalogStore.hasActiveFilters
            ? 'No MCP servers match the current filters'
            : 'No MCP servers available'}
        </div>
      );
    }

    return (
      <CatalogCardGrid>
        {mcpServers.map((mcpServer) => {
          const vendor = intelligenceCatalogStore.getVendorForServer(mcpServer);
          return (
            <Grid key={mcpServer.name} size={1}>
              <LegendMarketplaceMcpServerCard
                mcpServer={mcpServer}
                vendor={vendor}
                imageUrl={resolveMcpServerImageUrl(
                  vendorImageMap,
                  vendor,
                  mcpServer.name,
                )}
                isLastViewed={
                  mcpServer.name ===
                  intelligenceCatalogStore.lastViewedMcpServerName
                }
                onClick={(): void => onSelectMcpServer(mcpServer.name)}
              />
            </Grid>
          );
        })}
      </CatalogCardGrid>
    );
  },
);

const McpServersCatalogSection = observer(
  (props: {
    intelligenceCatalogStore: IntelligenceCatalogStore;
    isPreview: boolean;
    mcpServers: McpServer[];
    vendorImageMap: ReadonlyMap<string, string>;
    onRetryFetchMcpServers: () => void;
    onSelectMcpServer: (serverName: string) => void;
    onViewMore: (catalogType: IntelligenceCatalogType) => void;
  }) => {
    const {
      intelligenceCatalogStore,
      isPreview,
      mcpServers,
      vendorImageMap,
      onRetryFetchMcpServers,
      onSelectMcpServer,
      onViewMore,
    } = props;

    return (
      <CatalogSection
        title="MCP Servers"
        count={intelligenceCatalogStore.filteredMcpServers.length}
        onViewMore={
          isPreview
            ? (): void => onViewMore(IntelligenceCatalogType.MCPS)
            : undefined
        }
      >
        <McpServersCatalogBody
          intelligenceCatalogStore={intelligenceCatalogStore}
          mcpServers={mcpServers}
          vendorImageMap={vendorImageMap}
          onRetryFetchMcpServers={onRetryFetchMcpServers}
          onSelectMcpServer={onSelectMcpServer}
        />
      </CatalogSection>
    );
  },
);

const IntelligenceCatalogResults = observer(
  (props: {
    intelligenceCatalogStore: IntelligenceCatalogStore;
    onSelectAgent: () => void;
    onRetryFetchMcpServers: () => void;
  }) => {
    const { intelligenceCatalogStore, onSelectAgent, onRetryFetchMcpServers } =
      props;
    const marketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = marketplaceBaseStore.applicationStore;
    const vendorImageMap = useMemo(
      () => marketplaceBaseStore.buildVendorImageMap(),
      [marketplaceBaseStore],
    );
    const catalogType = intelligenceCatalogStore.catalogType;
    const isPreview = catalogType === IntelligenceCatalogType.ALL;
    const showAgents =
      isPreview || catalogType === IntelligenceCatalogType.AGENTS;
    const showMcpServers =
      isPreview || catalogType === IntelligenceCatalogType.MCPS;
    const mcpServers = isPreview
      ? intelligenceCatalogStore.previewMcpServers
      : intelligenceCatalogStore.paginatedMcpServers;

    const handleSelectMcpServer = useCallback(
      (serverName: string): void => {
        LegendMarketplaceTelemetryHelper.logEvent_ViewMcpServer(
          applicationStore.telemetryService,
          serverName,
        );
        intelligenceCatalogStore.setLastViewedMcpServerName(serverName);
        applicationStore.navigationService.navigator.goToLocation(
          generateMcpServerRoute(serverName),
        );
      },
      [applicationStore, intelligenceCatalogStore],
    );

    const handleViewMore = useCallback(
      (nextCatalogType: IntelligenceCatalogType): void => {
        LegendMarketplaceTelemetryHelper.logEvent_ClickIntelligenceCatalogViewMore(
          applicationStore.telemetryService,
          nextCatalogType,
        );
        intelligenceCatalogStore.setCatalogType(nextCatalogType);
      },
      [applicationStore, intelligenceCatalogStore],
    );

    if (intelligenceCatalogStore.isLoading) {
      return (
        <div className="marketplace-lakehouse-search-results__loading-container">
          <CircularProgress />
        </div>
      );
    }

    return (
      <>
        {showAgents && (
          <AgentsCatalogSection
            intelligenceCatalogStore={intelligenceCatalogStore}
            isPreview={isPreview}
            onSelectAgent={onSelectAgent}
            onViewMore={handleViewMore}
          />
        )}
        {showMcpServers && (
          <McpServersCatalogSection
            intelligenceCatalogStore={intelligenceCatalogStore}
            isPreview={isPreview}
            mcpServers={mcpServers}
            vendorImageMap={vendorImageMap}
            onRetryFetchMcpServers={onRetryFetchMcpServers}
            onSelectMcpServer={handleSelectMcpServer}
            onViewMore={handleViewMore}
          />
        )}
      </>
    );
  },
);

const IntelligenceCatalogView = observer(
  (props: { onSelectAgent: (query?: string) => void }) => {
    const { onSelectAgent } = props;
    const intelligenceCatalogStore = useIntelligenceCatalogStore();
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    const auth = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryFromUrl = searchParams.get(
      LEGEND_MARKETPLACE_INTELLIGENCE_QUERY_PARAM_TOKEN.QUERY,
    );
    const token = auth.user?.access_token;
    const tokenRef = useRef(token);
    tokenRef.current = token;
    const catalogType = intelligenceCatalogStore.catalogType;
    const isMcpsOnly = catalogType === IntelligenceCatalogType.MCPS;
    const showFilters = catalogType !== IntelligenceCatalogType.AGENTS;

    const fetchMcpServers = useCallback((): void => {
      const currentToken = tokenRef.current;
      if (currentToken) {
        flowResult(
          intelligenceCatalogStore.fetchMcpServers(currentToken),
        ).catch(applicationStore.alertUnhandledError);
      }
    }, [intelligenceCatalogStore, applicationStore]);

    useEffect(() => {
      fetchMcpServers();
    }, [fetchMcpServers, token]);

    const handleRetryFetchMcpServers = useCallback((): void => {
      LegendMarketplaceTelemetryHelper.logEvent_ClickIntelligenceCatalogRetry(
        applicationStore.telemetryService,
      );
      fetchMcpServers();
    }, [applicationStore, fetchMcpServers]);

    useEffect(() => {
      if (queryFromUrl !== null) {
        intelligenceCatalogStore.setSearchQuery(queryFromUrl);
      }
    }, [intelligenceCatalogStore, queryFromUrl]);

    const handleSearch = useCallback(
      (query: string | undefined): void => {
        if (query) {
          LegendMarketplaceTelemetryHelper.logEvent_SearchIntelligenceCatalog(
            applicationStore.telemetryService,
            query,
            intelligenceCatalogStore.catalogType,
          );
        }
        intelligenceCatalogStore.setSearchQuery(query ?? '');
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (query) {
              next.set(
                LEGEND_MARKETPLACE_INTELLIGENCE_QUERY_PARAM_TOKEN.QUERY,
                query,
              );
            } else {
              next.delete(
                LEGEND_MARKETPLACE_INTELLIGENCE_QUERY_PARAM_TOKEN.QUERY,
              );
            }
            return next;
          },
          { replace: true },
        );
      },
      [applicationStore, intelligenceCatalogStore, setSearchParams],
    );

    const handleCatalogTypeChange = useCallback(
      (value: IntelligenceCatalogType): void => {
        intelligenceCatalogStore.setCatalogType(value);
        LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogType(
          applicationStore.telemetryService,
          value,
        );
      },
      [intelligenceCatalogStore, applicationStore],
    );

    return (
      <>
        <Container className="marketplace-agents__search-container">
          <LegendMarketplaceSearchBar
            stateSearchQuery={intelligenceCatalogStore.searchQuery}
            onSearch={handleSearch}
            placeholder="Search agents and MCP servers..."
            className="marketplace-agents__search-bar"
            enableAutosuggest={false}
          />
        </Container>
        <div className="legend-marketplace-search-results__sort-bar">
          <div className="legend-marketplace-search-results__sort-bar__container">
            <div className="marketplace-intelligence-catalog__type-selector">
              <LegendMarketplaceOptionSelector
                options={CATALOG_TYPE_OPTIONS}
                selectedOption={catalogType}
                onChange={handleCatalogTypeChange}
                ariaLabel="Intelligence catalog type"
                disabledOptions={UNAVAILABLE_CATALOG_TYPES}
                disabledOptionTitle={UNAVAILABLE_CATALOG_TYPE_TITLE}
                size="medium"
              />
            </div>
          </div>
        </div>
        <Container
          maxWidth="xxxl"
          className="marketplace-lakehouse-search-results__results-container"
        >
          <div className="marketplace-lakehouse-search-results__results-layout">
            {showFilters && (
              <div className="marketplace-lakehouse-search-results__sidebar">
                <IntelligenceFiltersPanel store={intelligenceCatalogStore} />
              </div>
            )}
            <div className="marketplace-lakehouse-search-results__main-content">
              <IntelligenceCatalogResults
                intelligenceCatalogStore={intelligenceCatalogStore}
                onSelectAgent={onSelectAgent}
                onRetryFetchMcpServers={handleRetryFetchMcpServers}
              />
              {isMcpsOnly && (
                <PaginationControls
                  totalItems={
                    intelligenceCatalogStore.filteredMcpServers.length
                  }
                  itemsPerPage={intelligenceCatalogStore.itemsPerPage}
                  page={intelligenceCatalogStore.page}
                  onPageChange={(page): void => {
                    LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogPage(
                      applicationStore.telemetryService,
                      page,
                    );
                    intelligenceCatalogStore.setPage(page);
                  }}
                  onItemsPerPageChange={(itemsPerPage): void => {
                    LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogPageSize(
                      applicationStore.telemetryService,
                      itemsPerPage,
                    );
                    intelligenceCatalogStore.setItemsPerPage(itemsPerPage);
                  }}
                />
              )}
            </div>
          </div>
        </Container>
      </>
    );
  },
);

export const LegendMarketplaceAgents = observer(() => {
  const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
  const [showChat, setShowChat] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(
    undefined,
  );

  const handleSelectAgent = useCallback(
    (query?: string): void => {
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentStart(
        applicationStore.telemetryService,
        query !== undefined,
      );
      setInitialQuery(query);
      setShowChat(true);
    },
    [applicationStore],
  );

  const initialQueryProp = initialQuery === undefined ? {} : { initialQuery };

  return (
    <LegendMarketplacePage className="legend-marketplace-ai-page">
      {showChat ? (
        <LegendMarketplaceAIChatStoreProvider>
          <div className="marketplace-agents__chat-wrapper">
            <button
              type="button"
              className="marketplace-agents__back-btn"
              onClick={(): void => {
                LegendMarketplaceTelemetryHelper.logEvent_ClickAIAgentBackToCatalog(
                  applicationStore.telemetryService,
                );
                setShowChat(false);
                setInitialQuery(undefined);
              }}
            >
              <ArrowLeftIcon />
              <span>Back to Agents</span>
            </button>
            <MarketplaceAIChatView {...initialQueryProp} />
          </div>
        </LegendMarketplaceAIChatStoreProvider>
      ) : (
        <IntelligenceCatalogView onSelectAgent={handleSelectAgent} />
      )}
    </LegendMarketplacePage>
  );
});
