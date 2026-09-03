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

import type { TelemetryService } from '@finos/legend-application';
import {
  type V1_LiteAccessRequest,
  V1_ResourceType,
  type V1_PendingTaskRecord,
  type V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import { LEGEND_MARKETPLACE_APP_EVENT } from './LegendMarketplaceAppEvent.js';
import { MarketplaceSearchMode } from './LegendMarketplaceSearchMode.js';
import { uuid } from '@finos/legend-shared';
import {
  SEARCH_SESSION_KEY,
  TELEMETRY_EVENT_STATUS,
  type DATAPRODUCT_TYPE,
  type MarketplaceUserSession,
} from '@finos/legend-extension-dsl-data-product';

export enum LEGEND_MARKETPLACE_PAGE {
  HOME_PAGE = 'Home Page',
  SEARCH_RESULTS_PAGE = 'Search Results Page',
  LAKEHOUSE_ACCESS_PAGE = 'Lakehouse Access Page',
  TERMINALS_ADDONS_PAGE = 'Terminals and Add-ons Page',
  YOUR_ORDERS_PAGE = 'Your Orders Page',
  SUBSCRIPTIONS_PAGE = 'Subscriptions Page',
}

export enum TERMINAL_SEARCH_LOCATION {
  MAIN_CATALOG = 'Main Catalog',
  ADDONS_POPUP = 'Add-ons Popup',
}

export enum CONTRACT_ACTION {
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum ICON_TOOLBAR_TYPE {
  USER = 'User Icon',
  HELP = 'Help Icon',
}

type MarketplaceDataProductOrigin_TelemetryData = {
  type: DATAPRODUCT_TYPE;
  groupId?: string | undefined;
  artifactId?: string | undefined;
  versionId?: string | undefined;
  path?: string | undefined;
};

type MarketplaceDataProduct_TelemetryData = {
  origin?: MarketplaceDataProductOrigin_TelemetryData | undefined;
  dataProductId?: string | undefined;
  deploymentId?: number | undefined;
  name?: string | undefined;
  environmentClassification?:
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined;
};

export class LegendMarketplaceTelemetryHelper {
  private static getOrCreateUserSession(): MarketplaceUserSession {
    const stored = localStorage.getItem(SEARCH_SESSION_KEY);

    if (stored) {
      const session = JSON.parse(stored) as MarketplaceUserSession;
      return session;
    } else {
      const initialSession: MarketplaceUserSession = {
        eventId: 0,
        searchSessionId: undefined,
      };
      localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(initialSession));
      return initialSession;
    }
  }

  private static updateSearchSessionId(
    searchSessionId: string,
  ): MarketplaceUserSession {
    const currentSession = this.getOrCreateUserSession();
    const newSearchSession: MarketplaceUserSession = {
      ...currentSession,
      searchSessionId: searchSessionId,
    };

    localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(newSearchSession));
    return newSearchSession;
  }

  static clearSearchSessionId(): MarketplaceUserSession {
    const currentSession = this.getOrCreateUserSession();
    const newSearchSession: MarketplaceUserSession = {
      ...currentSession,
      searchSessionId: undefined,
    };

    if (currentSession.eventId !== 0) {
      localStorage.setItem(
        SEARCH_SESSION_KEY,
        JSON.stringify(newSearchSession),
      );
    }
    return newSearchSession;
  }

  private static updateEventId() {
    const currentSession = this.getOrCreateUserSession();
    const updatedSession: MarketplaceUserSession = {
      ...currentSession,
      eventId: currentSession.eventId + 1,
    };

    localStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  }

  static logEvent_ClickingDataProductCard(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    clickedFrom: LEGEND_MARKETPLACE_PAGE,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_DATA_PRODUCT_CARD,
      {
        ...dataProductData,
        clickedFrom: clickedFrom,
        ...session,
      },
    );
  }

  static logEvent_SearchQuery(
    telemetryService: TelemetryService,
    query: string | undefined,
    useProducerSearch: boolean,
    searchedFrom: LEGEND_MARKETPLACE_PAGE,
    useFieldSearch: boolean = false,
  ): void {
    this.updateSearchSessionId(uuid());
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SEARCH_QUERY, {
      query,
      useProducerSearch,
      useFieldSearch,
      searchedFrom,
      ...session,
    });
  }

  static logEvent_ActionDataContracts(
    telemetryService: TelemetryService,
    selectedContracts: V1_PendingTaskRecord[],
    pendingTaskContracts: V1_LiteAccessRequest[] | undefined,
    action: CONTRACT_ACTION,
    actionTakenBy: string,
    errors: string[] | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    const actionedContractsDetails = selectedContracts.map((contract) => {
      const dataContract = pendingTaskContracts?.find(
        (c) => c.guid === contract.accessRequestId,
      );
      const accessPointGroup =
        dataContract?.resourceType === V1_ResourceType.ACCESS_POINT_GROUP
          ? dataContract.accessPointGroup
          : `${dataContract?.accessPointGroup ?? 'Unknown'} (${dataContract?.resourceType ?? 'Unknown Type'})`;
      return {
        taskId: contract.taskId,
        accessRequestId: contract.accessRequestId,
        consumer: contract.consumer,
        type: contract.type,
        targetDataProduct: dataContract?.resourceId ?? 'Unknown',
        targetAccessPointGroup: accessPointGroup ?? 'Unknown',
        requester: dataContract?.createdBy,
        ...session,
      };
    });
    const data =
      errors === undefined
        ? {
            actionedContractsDetails: actionedContractsDetails,
            action: action,
            actionTakenBy: actionTakenBy,
            status: TELEMETRY_EVENT_STATUS.SUCCESS,
          }
        : {
            actionedContractsDetails: actionedContractsDetails,
            action: action,
            actionTakenBy: actionTakenBy,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            errors: errors,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ACTION_DATA_CONTRACTS,
      data,
    );
  }

  static logEvent_LoadDataProduct(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { ...dataProductData, status: TELEMETRY_EVENT_STATUS.SUCCESS }
        : {
            ...dataProductData,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_LoadSDLCDataProduct(
    telemetryService: TelemetryService,
    dataProductData: MarketplaceDataProduct_TelemetryData,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { ...dataProductData, status: TELEMETRY_EVENT_STATUS.SUCCESS }
        : {
            ...dataProductData,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_SDLC_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_LoadTerminal(
    telemetryService: TelemetryService,
    terminalId: string,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? { terminalId: terminalId, status: TELEMETRY_EVENT_STATUS.SUCCESS }
        : {
            terminalId: terminalId,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_TERMINAL,
      telemetryData,
    );
  }

  static logEvent_LoadLegacyDataProduct(
    telemetryService: TelemetryService,
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    error: string | undefined,
  ): void {
    const telemetryData =
      error === undefined
        ? {
            groupId: groupId,
            artifactId: artifactId,
            versionId: versionId,
            path: path,
            status: TELEMETRY_EVENT_STATUS.SUCCESS,
          }
        : {
            groupId: groupId,
            artifactId: artifactId,
            versionId: versionId,
            path: path,
            status: TELEMETRY_EVENT_STATUS.FAILURE,
            error: error,
          };
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_LEGACY_DATA_PRODUCT,
      telemetryData,
    );
  }

  static logEvent_ClickHeadertab(
    telemetryService: TelemetryService,
    tabTitle: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_HEADER_TAB, {
      tabTitle: tabTitle,
      ...session,
    });
  }

  private static readonly TOGGLE_SEARCH_MODE_EVENT: Partial<
    Record<MarketplaceSearchMode, LEGEND_MARKETPLACE_APP_EVENT>
  > = {
    [MarketplaceSearchMode.PRODUCER]:
      LEGEND_MARKETPLACE_APP_EVENT.PRODUCER_SEARCH_TOGGLE,
    [MarketplaceSearchMode.DATA_FIELDS]:
      LEGEND_MARKETPLACE_APP_EVENT.FIELD_SEARCH_TOGGLE,
    [MarketplaceSearchMode.LAKEHOUSE_ACCESS]:
      LEGEND_MARKETPLACE_APP_EVENT.LAKEHOUSE_ACCESS_SEARCH_TOGGLE,
  };

  /**
   * Logs a search-mode switch on the search bar's settings menu. Each mode keeps
   * its own event name (existing telemetry dashboards key on them), selected here
   * via {@link TOGGLE_SEARCH_MODE_EVENT} instead of one near-identical method per mode.
   */
  static logEvent_ToggleSearchMode(
    telemetryService: TelemetryService,
    mode: MarketplaceSearchMode,
    isEnabled: boolean,
  ): void {
    const event = this.TOGGLE_SEARCH_MODE_EVENT[mode];
    if (!event) {
      return;
    }
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(event, {
      toggleAction: isEnabled ? 'enabled' : 'disabled',
      ...session,
    });
  }

  static logEvent_ToggleThemeMode(
    telemetryService: TelemetryService,
    isDarkMode: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_THEME_MODE, {
      currentTheme: isDarkMode ? 'dark' : 'light',
      ...session,
    });
  }

  static logEvent_ToggleViewMode(
    telemetryService: TelemetryService,
    viewMode: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_VIEW_MODE, {
      viewMode,
      ...session,
    });
  }

  static logEvent_ToggleServicesViewMode(
    telemetryService: TelemetryService,
    viewMode: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_SERVICES_VIEW_MODE,
      {
        viewMode,
        ...session,
      },
    );
  }

  static logEvent_ClickToolbarMenu(
    telemetryService: TelemetryService,
    iconSource: ICON_TOOLBAR_TYPE,
    menuTitle: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_TOOLBAR_MENU, {
      iconSource: iconSource,
      menuTitle: menuTitle,
      ...session,
    });
  }

  static logEvent_SearchAutosuggestSelection(
    telemetryService: TelemetryService,
    query: string,
    suggestionType: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.SEARCH_AUTOSUGGEST_SELECTION,
      {
        query: query,
        suggestionType: suggestionType,
        ...session,
      },
    );
  }

  static logEvent_DismissHomePageBanner(
    telemetryService: TelemetryService,
    bannerId: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.DISMISS_HOME_PAGE_BANNER,
      {
        bannerId: bannerId,
        ...session,
      },
    );
  }

  static logEvent_SubmitFeedback(
    telemetryService: TelemetryService,
    originPage: string,
    rating: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SUBMIT_FEEDBACK, {
      originPage: originPage,
      rating: rating,
      ...session,
    });
  }

  static logEvent_ClickQueryDataProduct(
    telemetryService: TelemetryService,
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    executionContextKey: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_QUERY_DATA_PRODUCT,
      {
        groupId: groupId,
        artifactId: artifactId,
        versionId: versionId,
        path: path,
        executionContextKey: executionContextKey,
        ...session,
      },
    );
  }

  static logEvent_ClickOpenServiceQuery(
    telemetryService: TelemetryService,
    groupId: string,
    artifactId: string,
    versionId: string,
    servicePath: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_OPEN_SERVICE_QUERY,
      {
        groupId: groupId,
        artifactId: artifactId,
        versionId: versionId,
        servicePath: servicePath,
        ...session,
      },
    );
  }

  static logEvent_ClickQuickStartExtensionTab(
    telemetryService: TelemetryService,
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
    tabKey: string,
    executableTitle: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_QUICKSTART_EXTENSION_TAB,
      {
        groupId: groupId,
        artifactId: artifactId,
        versionId: versionId,
        path: path,
        tabKey: tabKey,
        executableTitle: executableTitle,
        ...session,
      },
    );
  }

  static logEvent_ApplySearchFilter(
    telemetryService: TelemetryService,
    filterType: string,
    filterValue: string,
    action: 'select' | 'deselect',
    searchQuery: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.APPLY_SEARCH_FILTER,
      {
        filterType,
        filterValue,
        action,
        searchQuery,
        ...session,
      },
    );
  }

  static logEvent_ClearSearchFilters(
    telemetryService: TelemetryService,
    searchQuery: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLEAR_SEARCH_FILTERS,
      {
        searchQuery,
        ...session,
      },
    );
  }

  static logEvent_ShowAllDataProducts(
    telemetryService: TelemetryService,
    searchQuery: string | undefined,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.SHOW_ALL_DATA_PRODUCTS,
      {
        searchQuery,
        ...session,
      },
    );
  }

  static logEvent_SearchServices(
    telemetryService: TelemetryService,
    query: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SEARCH_SERVICES, {
      query,
      ...session,
    });
  }

  static logEvent_SortServices(
    telemetryService: TelemetryService,
    sortValue: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SORT_SERVICES, {
      sortValue,
      ...session,
    });
  }

  static logEvent_FilterServices(
    telemetryService: TelemetryService,
    filterType: string,
    filterValue: string,
    action: 'add' | 'remove' | 'clear',
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.FILTER_SERVICES, {
      filterType,
      filterValue,
      action,
      ...session,
    });
  }

  static logEvent_ClickServiceCard(
    telemetryService: TelemetryService,
    pattern: string,
    title: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.CLICK_SERVICE_CARD, {
      pattern,
      title,
      ...session,
    });
  }

  static logEvent_AIAgentStart(
    telemetryService: TelemetryService,
    fromSearch: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_START,
      { fromSearch, ...session },
    );
  }

  static logEvent_ChangeIntelligenceCatalogType(
    telemetryService: TelemetryService,
    catalogType: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_TYPE,
      { catalogType, ...session },
    );
  }

  static logEvent_SearchIntelligenceCatalog(
    telemetryService: TelemetryService,
    query: string,
    catalogType: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.SEARCH_INTELLIGENCE_CATALOG,
      {
        query,
        catalogType,
        ...session,
      },
    );
  }

  static logEvent_ClickIntelligenceCatalogViewMore(
    telemetryService: TelemetryService,
    catalogType: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_INTELLIGENCE_CATALOG_VIEW_MORE,
      {
        catalogType,
        ...session,
      },
    );
  }

  static logEvent_ClickIntelligenceCatalogRetry(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_INTELLIGENCE_CATALOG_RETRY,
      {
        ...session,
      },
    );
  }

  static logEvent_ChangeIntelligenceCatalogPage(
    telemetryService: TelemetryService,
    page: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_PAGE,
      {
        page,
        ...session,
      },
    );
  }

  static logEvent_ChangeIntelligenceCatalogPageSize(
    telemetryService: TelemetryService,
    itemsPerPage: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_PAGE_SIZE,
      {
        itemsPerPage,
        ...session,
      },
    );
  }

  static logEvent_ToggleIntelligenceCatalogVendorFilter(
    telemetryService: TelemetryService,
    vendor: string,
    selected: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_INTELLIGENCE_CATALOG_VENDOR_FILTER,
      {
        vendor,
        selected,
        ...session,
      },
    );
  }

  static logEvent_ClearIntelligenceCatalogFilters(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLEAR_INTELLIGENCE_CATALOG_FILTERS,
      {
        ...session,
      },
    );
  }

  static logEvent_ShowAllIntelligenceCatalogVendors(
    telemetryService: TelemetryService,
    expanded: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.SHOW_ALL_INTELLIGENCE_CATALOG_VENDORS,
      {
        expanded,
        ...session,
      },
    );
  }

  static logEvent_ClickAIAgentBackToCatalog(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_BACK_TO_CATALOG,
      {
        ...session,
      },
    );
  }

  static logEvent_ClickMcpServerBack(
    telemetryService: TelemetryService,
    mcpServerName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_BACK,
      {
        mcpServerName,
        ...session,
      },
    );
  }

  static logEvent_ClickMcpServerCopy(
    telemetryService: TelemetryService,
    mcpServerName: string,
    field: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_COPY,
      {
        mcpServerName,
        field,
        ...session,
      },
    );
  }

  static logEvent_ClickMcpServerSupportLink(
    telemetryService: TelemetryService,
    mcpServerName: string,
    linkType: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_SUPPORT_LINK,
      {
        mcpServerName,
        linkType,
        ...session,
      },
    );
  }

  static logEvent_ClickMcpServerRetry(
    telemetryService: TelemetryService,
    mcpServerName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_RETRY,
      {
        mcpServerName,
        ...session,
      },
    );
  }

  static logEvent_ExpandMcpServerTool(
    telemetryService: TelemetryService,
    mcpServerName: string,
    toolName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.EXPAND_MCP_SERVER_TOOL,
      {
        mcpServerName,
        toolName,
        ...session,
      },
    );
  }

  static logEvent_ExpandMcpServerGroundingRules(
    telemetryService: TelemetryService,
    mcpServerName: string,
    toolName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.EXPAND_MCP_SERVER_GROUNDING_RULES,
      {
        mcpServerName,
        toolName,
        ...session,
      },
    );
  }

  static logEvent_ViewMcpServer(
    telemetryService: TelemetryService,
    mcpServerName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.VIEW_MCP_SERVER, {
      mcpServerName,
      ...session,
    });
  }

  static logEvent_AIAgentQuestionAsked(
    telemetryService: TelemetryService,
    questionLength: number,
    isFollowUp: boolean,
    scopeCount: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_QUESTION_ASKED,
      { questionLength, isFollowUp, scopeCount, ...session },
    );
  }

  static logEvent_AIAgentResponseReceived(
    telemetryService: TelemetryService,
    outcome: string,
    rowCount: number,
    durationInSeconds: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_RESPONSE_RECEIVED,
      { outcome, rowCount, durationInSeconds, ...session },
    );
  }

  static logEvent_AIAgentScopeAdded(
    telemetryService: TelemetryService,
    scopeCount: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_SCOPE_ADDED,
      { scopeCount, ...session },
    );
  }

  static logEvent_AIAgentScopeRemoved(
    telemetryService: TelemetryService,
    scopeCount: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_SCOPE_REMOVED,
      { scopeCount, ...session },
    );
  }

  static logEvent_AIAgentSuggestedQueryClicked(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_SUGGESTED_QUERY,
      { ...session },
    );
  }

  static logEvent_AIAgentClearChat(telemetryService: TelemetryService): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_CLEAR_CHAT,
      {
        ...session,
      },
    );
  }

  static logEvent_AIAgentCopySql(telemetryService: TelemetryService): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_COPY_SQL,
      { ...session },
    );
  }

  static logEvent_ViewTerminalsAddonsPage(
    telemetryService: TelemetryService,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.VIEW_TERMINALS_ADDONS_PAGE,
      {
        page: LEGEND_MARKETPLACE_PAGE.TERMINALS_ADDONS_PAGE,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_TerminalsAddonsSearch(
    telemetryService: TelemetryService,
    query: string,
    searchLocation: TERMINAL_SEARCH_LOCATION,
    filterTab: string,
    isTargetUser: boolean,
  ): void {
    this.updateSearchSessionId(uuid());
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TERMINALS_ADDONS_SEARCH,
      {
        query,
        searchLocation,
        filterTab,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_TerminalsAddonsFilterTab(
    telemetryService: TelemetryService,
    tab: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TERMINALS_ADDONS_FILTER_TAB,
      {
        tab,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_SelectTargetUser(
    telemetryService: TelemetryService,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TERMINALS_ADDONS_SELECT_TARGET_USER,
      {
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ClickTerminalAddonCard(
    telemetryService: TelemetryService,
    productId: string | number,
    productName: string,
    providerName: string,
    itemType: string,
    searchLocation: TERMINAL_SEARCH_LOCATION,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_TERMINAL_ADDON_CARD,
      {
        productId,
        productName,
        providerName,
        itemType,
        searchLocation,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_AddTerminalAddonToCart(
    telemetryService: TelemetryService,
    productId: string | number,
    productName: string,
    providerName: string,
    itemType: string,
    addedFrom: TERMINAL_SEARCH_LOCATION,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ADD_TERMINAL_ADDON_TO_CART,
      {
        productId,
        productName,
        providerName,
        itemType,
        addedFrom,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_OpenAddonsPopup(
    telemetryService: TelemetryService,
    terminalProductName: string,
    providerName: string,
    totalAddonCount: number | null,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.OPEN_ADDONS_POPUP, {
      terminalProductName,
      providerName,
      totalAddonCount,
      timestamp: Date.now(),
      ...session,
    });
  }

  static logEvent_AddonsPopupSearch(
    telemetryService: TelemetryService,
    query: string,
    terminalProductName: string,
  ): void {
    this.updateSearchSessionId(uuid());
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ADDONS_POPUP_SEARCH,
      {
        query,
        terminalProductName,
        searchLocation: TERMINAL_SEARCH_LOCATION.ADDONS_POPUP,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_AddonsPopupSort(
    telemetryService: TelemetryService,
    sortOrder: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.ADDONS_POPUP_SORT, {
      sortOrder,
      timestamp: Date.now(),
      ...session,
    });
  }

  static logEvent_AddonsPopupPaginate(
    telemetryService: TelemetryService,
    page: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ADDONS_POPUP_PAGINATE,
      {
        page,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ToggleTerminalSubscriptions(
    telemetryService: TelemetryService,
    isExpanded: boolean,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_TERMINAL_SUBSCRIPTIONS,
      {
        isExpanded,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ViewOrderProfileDetails(
    telemetryService: TelemetryService,
    profileName: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.VIEW_ORDER_PROFILE_DETAILS,
      {
        profileName,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_AddOrderProfileToCart(
    telemetryService: TelemetryService,
    profileName: string,
    isMultiselect: boolean,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ADD_ORDER_PROFILE_TO_CART,
      {
        profileName,
        isMultiselect,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_SubmitOrder(
    telemetryService: TelemetryService,
    itemCount: number,
    totalCost: number,
    isTargetUser: boolean,
    businessReason: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.SUBMIT_ORDER, {
      itemCount,
      totalCost,
      isTargetUser,
      businessReason,
      timestamp: Date.now(),
      ...session,
    });
  }

  static logEvent_ViewYourOrdersPage(telemetryService: TelemetryService): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.VIEW_YOUR_ORDERS_PAGE,
      {
        page: LEGEND_MARKETPLACE_PAGE.YOUR_ORDERS_PAGE,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ClickOrderEtaskLink(
    telemetryService: TelemetryService,
    orderId: string,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_ORDER_ETASK_LINK,
      {
        orderId,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_AdvancedSearchOrders(
    telemetryService: TelemetryService,
    hasOrderedBy: boolean,
    hasOrderedFor: boolean,
    status: string,
    isLastDaysDefaulted: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.ADVANCED_SEARCH_ORDERS,
      {
        hasOrderedBy,
        hasOrderedFor,
        status,
        isLastDaysDefaulted,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ClearAdvancedOrderSearch(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLEAR_ADVANCED_ORDER_SEARCH,
      {
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_PaginateAdvancedOrderSearch(
    telemetryService: TelemetryService,
    offset: number,
    pageSize: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.PAGINATE_ADVANCED_ORDER_SEARCH,
      {
        offset,
        pageSize,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ChangeAdvancedOrderSearchPageSize(
    telemetryService: TelemetryService,
    pageSize: number,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_ADVANCED_ORDER_SEARCH_PAGE_SIZE,
      {
        pageSize,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_ToggleAllOrders(
    telemetryService: TelemetryService,
    isExpanded: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_ALL_ORDERS, {
      isExpanded,
      timestamp: Date.now(),
      ...session,
    });
  }

  static logEvent_ViewSubscriptionsPage(
    telemetryService: TelemetryService,
    isTargetUser: boolean,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.VIEW_SUBSCRIPTIONS_PAGE,
      {
        page: LEGEND_MARKETPLACE_PAGE.SUBSCRIPTIONS_PAGE,
        isTargetUser,
        timestamp: Date.now(),
        ...session,
      },
    );
  }

  static logEvent_AIAgentGeneratePython(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_GENERATE_PYTHON,
      { ...session },
    );
  }

  static logEvent_AIAgentCopyPython(telemetryService: TelemetryService): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_COPY_PYTHON,
      { ...session },
    );
  }

  static logEvent_AIAgentOpenInDataCube(
    telemetryService: TelemetryService,
  ): void {
    this.updateEventId();
    const session = this.getOrCreateUserSession();
    telemetryService.logEvent(
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_OPEN_IN_DATACUBE,
      { ...session },
    );
  }
}
