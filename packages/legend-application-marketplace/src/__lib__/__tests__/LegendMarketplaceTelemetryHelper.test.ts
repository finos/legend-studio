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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { TelemetryService } from '@finos/legend-application';
import {
  V1_ApprovalType,
  V1_ContractUserEventRecord,
  V1_LiteAccessRequest,
  V1_ResourceType,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  SEARCH_SESSION_KEY,
  TELEMETRY_EVENT_STATUS,
  type MarketplaceUserSession,
} from '@finos/legend-extension-dsl-data-product';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../LegendMarketplaceAppEvent.js';
import { MarketplaceSearchMode } from '../LegendMarketplaceSearchMode.js';
import {
  CONTRACT_ACTION,
  ICON_TOOLBAR_TYPE,
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
  TERMINAL_SEARCH_LOCATION,
} from '../LegendMarketplaceTelemetryHelper.js';

type LoggedCall = { event: string; data: Record<string, unknown> };

const getLoggedCall = (calls: LoggedCall[], index = 0): LoggedCall =>
  guaranteeNonNullable(
    calls[index],
    `Expected a logged telemetry call at index ${index}`,
  );

const buildTelemetryStub = (): {
  service: TelemetryService;
  calls: LoggedCall[];
} => {
  const calls: LoggedCall[] = [];
  const service = {
    logEvent: jest.fn((event: string, data: unknown) => {
      calls.push({ event, data: data as Record<string, unknown> });
    }),
  } as unknown as TelemetryService;
  return { service, calls };
};

const createTask = (
  taskId: string,
  dataContractId: string,
  consumer: string,
): V1_ContractUserEventRecord => {
  const task = new V1_ContractUserEventRecord();
  task.taskId = taskId;
  task.dataContractId = dataContractId;
  task.consumer = consumer;
  task.type = V1_ApprovalType.DATA_OWNER_APPROVAL;
  return task;
};

const createLiteAccessRequest = (
  guid: string,
  resourceId: string,
  resourceType: V1_ResourceType,
  accessPointGroup: string,
  createdBy: string,
): V1_LiteAccessRequest => {
  const request = new V1_LiteAccessRequest();
  request.guid = guid;
  request.resourceId = resourceId;
  request.resourceType = resourceType;
  request.accessPointGroup = accessPointGroup;
  request.createdBy = createdBy;
  return request;
};

beforeEach(() => {
  localStorage.clear();
});

describe('clearSearchSessionId', () => {
  test('clears an existing search session id and persists the update', () => {
    localStorage.setItem(
      SEARCH_SESSION_KEY,
      JSON.stringify({ eventId: 2, searchSessionId: 'existing-session' }),
    );

    const result = LegendMarketplaceTelemetryHelper.clearSearchSessionId();

    expect(result.searchSessionId).toBeUndefined();
    expect(result.eventId).toBe(2);
    const stored = JSON.parse(
      guaranteeNonNullable(localStorage.getItem(SEARCH_SESSION_KEY)),
    ) as MarketplaceUserSession;
    expect(stored.searchSessionId).toBeUndefined();
  });

  test('does not persist when no events have been logged yet (eventId is 0)', () => {
    const result = LegendMarketplaceTelemetryHelper.clearSearchSessionId();

    expect(result.eventId).toBe(0);
    expect(result.searchSessionId).toBeUndefined();
  });
});

describe('logEvent_ActionDataContracts', () => {
  test('logs success status and uses the access point group name directly when resourceType is ACCESS_POINT_GROUP', () => {
    const { service, calls } = buildTelemetryStub();
    const task = createTask('task-1', 'dc-1', 'consumer-1');
    const pendingTaskContracts = [
      createLiteAccessRequest(
        'dc-1',
        'resource-1',
        V1_ResourceType.ACCESS_POINT_GROUP,
        'APG-1',
        'requester-1',
      ),
    ];

    LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
      service,
      [task],
      pendingTaskContracts,
      CONTRACT_ACTION.APPROVED,
      'action-taker',
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.ACTION_DATA_CONTRACTS,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.action).toBe(CONTRACT_ACTION.APPROVED);
    expect(payload.actionTakenBy).toBe('action-taker');
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.SUCCESS);
    expect(payload.errors).toBeUndefined();
    expect(payload.actionedContractsDetails).toEqual([
      expect.objectContaining({
        taskId: 'task-1',
        accessRequestId: 'dc-1',
        consumer: 'consumer-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        targetDataProduct: 'resource-1',
        targetAccessPointGroup: 'APG-1',
        requester: 'requester-1',
      }),
    ]);
  });

  test('logs failure status with errors and a combined label when resourceType is not ACCESS_POINT_GROUP', () => {
    const { service, calls } = buildTelemetryStub();
    const task = createTask('task-2', 'dc-2', 'consumer-2');
    const pendingTaskContracts = [
      createLiteAccessRequest(
        'dc-2',
        'resource-2',
        V1_ResourceType.DATA_PRODUCT,
        'APG-2',
        'requester-2',
      ),
    ];

    LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
      service,
      [task],
      pendingTaskContracts,
      CONTRACT_ACTION.DENIED,
      'action-taker',
      ['some error'],
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.FAILURE);
    expect(payload.errors).toEqual(['some error']);
    expect(payload.actionedContractsDetails).toEqual([
      expect.objectContaining({
        targetAccessPointGroup: 'APG-2 (DATA_PRODUCT)',
      }),
    ]);
  });

  test('falls back to Unknown labels when no matching data contract is found', () => {
    const { service, calls } = buildTelemetryStub();
    const task = createTask('task-3', 'dc-missing', 'consumer-3');

    LegendMarketplaceTelemetryHelper.logEvent_ActionDataContracts(
      service,
      [task],
      undefined,
      CONTRACT_ACTION.APPROVED,
      'action-taker',
      undefined,
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.actionedContractsDetails).toEqual([
      expect.objectContaining({
        targetDataProduct: 'Unknown',
        targetAccessPointGroup: 'Unknown (Unknown Type)',
        requester: undefined,
      }),
    ]);
  });
});

describe('logEvent_LoadDataProduct', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadDataProduct(
      service,
      { dataProductId: 'dp-1', name: 'DP One' },
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_DATA_PRODUCT,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.dataProductId).toBe('dp-1');
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.SUCCESS);
    expect(payload.error).toBeUndefined();
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadDataProduct(
      service,
      { dataProductId: 'dp-1', name: 'DP One' },
      'failed to load',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.FAILURE);
    expect(payload.error).toBe('failed to load');
  });
});

describe('logEvent_LoadSDLCDataProduct', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadSDLCDataProduct(
      service,
      { dataProductId: 'dp-2', name: 'DP Two' },
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_SDLC_DATA_PRODUCT,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.SUCCESS);
    expect(payload.error).toBeUndefined();
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadSDLCDataProduct(
      service,
      { dataProductId: 'dp-2', name: 'DP Two' },
      'sdlc failure',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.FAILURE);
    expect(payload.error).toBe('sdlc failure');
  });
});

describe('logEvent_LoadTerminal', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadTerminal(
      service,
      'terminal-1',
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_TERMINAL,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.terminalId).toBe('terminal-1');
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.SUCCESS);
    expect(payload.error).toBeUndefined();
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadTerminal(
      service,
      'terminal-1',
      'terminal failure',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.FAILURE);
    expect(payload.error).toBe('terminal failure');
  });
});

describe('logEvent_LoadLegacyDataProduct', () => {
  test('logs success status when no error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadLegacyDataProduct(
      service,
      'group-1',
      'artifact-1',
      'version-1',
      'path-1',
      undefined,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.LOAD_LEGACY_DATA_PRODUCT,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload).toMatchObject({
      groupId: 'group-1',
      artifactId: 'artifact-1',
      versionId: 'version-1',
      path: 'path-1',
      status: TELEMETRY_EVENT_STATUS.SUCCESS,
    });
    expect(payload.error).toBeUndefined();
  });

  test('logs failure status with error message when an error is provided', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_LoadLegacyDataProduct(
      service,
      'group-1',
      'artifact-1',
      'version-1',
      'path-1',
      'legacy failure',
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.status).toBe(TELEMETRY_EVENT_STATUS.FAILURE);
    expect(payload.error).toBe('legacy failure');
  });
});

describe('logEvent_ToggleSearchMode', () => {
  test('logs "enabled" when isEnabled is true', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_ToggleSearchMode(
      service,
      MarketplaceSearchMode.PRODUCER,
      true,
    );

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.PRODUCER_SEARCH_TOGGLE,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.toggleAction).toBe('enabled');
  });

  test('logs "disabled" when isEnabled is false', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_ToggleSearchMode(
      service,
      MarketplaceSearchMode.PRODUCER,
      false,
    );

    const payload = getLoggedCall(calls).data;
    expect(payload.toggleAction).toBe('disabled');
  });
});

describe('logEvent_ToggleThemeMode', () => {
  test('logs "dark" when isDarkMode is true', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_ToggleThemeMode(service, true);

    expect(getLoggedCall(calls).event).toBe(
      LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_THEME_MODE,
    );
    const payload = getLoggedCall(calls).data;
    expect(payload.currentTheme).toBe('dark');
  });

  test('logs "light" when isDarkMode is false', () => {
    const { service, calls } = buildTelemetryStub();
    LegendMarketplaceTelemetryHelper.logEvent_ToggleThemeMode(service, false);

    const payload = getLoggedCall(calls).data;
    expect(payload.currentTheme).toBe('light');
  });
});

interface SimpleTelemetryCase {
  readonly description: string;
  readonly expectedEvent: LEGEND_MARKETPLACE_APP_EVENT;
  readonly expectedPayload: Record<string, unknown>;
  readonly invoke: (service: TelemetryService) => void;
}

const simpleTelemetryCases: SimpleTelemetryCase[] = [
  {
    description: 'logEvent_ClickHeadertab',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_HEADER_TAB,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickHeadertab(service, 'Home'),
    expectedPayload: { tabTitle: 'Home' },
  },
  {
    description: 'logEvent_ToggleViewMode',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_VIEW_MODE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ToggleViewMode(service, 'grid'),
    expectedPayload: { viewMode: 'grid' },
  },
  {
    description: 'logEvent_ToggleServicesViewMode',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_SERVICES_VIEW_MODE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ToggleServicesViewMode(
        service,
        'list',
      ),
    expectedPayload: { viewMode: 'list' },
  },
  {
    description: 'logEvent_ClickToolbarMenu',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_TOOLBAR_MENU,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickToolbarMenu(
        service,
        ICON_TOOLBAR_TYPE.USER,
        'Profile',
      ),
    expectedPayload: {
      iconSource: ICON_TOOLBAR_TYPE.USER,
      menuTitle: 'Profile',
    },
  },
  {
    description: 'logEvent_SearchAutosuggestSelection',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.SEARCH_AUTOSUGGEST_SELECTION,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SearchAutosuggestSelection(
        service,
        'bloomberg',
        'producer',
      ),
    expectedPayload: { query: 'bloomberg', suggestionType: 'producer' },
  },
  {
    description: 'logEvent_SubmitFeedback',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.SUBMIT_FEEDBACK,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SubmitFeedback(
        service,
        'Home Page',
        5,
      ),
    expectedPayload: { originPage: 'Home Page', rating: 5 },
  },
  {
    description: 'logEvent_ClickQueryDataProduct',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_QUERY_DATA_PRODUCT,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickQueryDataProduct(
        service,
        'group-1',
        'artifact-1',
        'version-1',
        'path-1',
        'context-1',
      ),
    expectedPayload: {
      groupId: 'group-1',
      artifactId: 'artifact-1',
      versionId: 'version-1',
      path: 'path-1',
      executionContextKey: 'context-1',
    },
  },
  {
    description: 'logEvent_ClickOpenServiceQuery',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_OPEN_SERVICE_QUERY,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickOpenServiceQuery(
        service,
        'group-1',
        'artifact-1',
        'version-1',
        'service-path-1',
      ),
    expectedPayload: {
      groupId: 'group-1',
      artifactId: 'artifact-1',
      versionId: 'version-1',
      servicePath: 'service-path-1',
    },
  },
  {
    description: 'logEvent_ClickQuickStartExtensionTab',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_QUICKSTART_EXTENSION_TAB,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickQuickStartExtensionTab(
        service,
        'group-1',
        'artifact-1',
        'version-1',
        'path-1',
        'tab-1',
        'Executable One',
      ),
    expectedPayload: {
      groupId: 'group-1',
      artifactId: 'artifact-1',
      versionId: 'version-1',
      path: 'path-1',
      tabKey: 'tab-1',
      executableTitle: 'Executable One',
    },
  },
  {
    description: 'logEvent_ApplySearchFilter',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.APPLY_SEARCH_FILTER,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
        service,
        'category',
        'Terminal',
        'select',
        'bloomberg',
      ),
    expectedPayload: {
      filterType: 'category',
      filterValue: 'Terminal',
      action: 'select',
      searchQuery: 'bloomberg',
    },
  },
  {
    description: 'logEvent_ClearSearchFilters',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLEAR_SEARCH_FILTERS,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClearSearchFilters(
        service,
        'bloomberg',
      ),
    expectedPayload: { searchQuery: 'bloomberg' },
  },
  {
    description: 'logEvent_SearchServices',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.SEARCH_SERVICES,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SearchServices(
        service,
        'my service',
      ),
    expectedPayload: { query: 'my service' },
  },
  {
    description: 'logEvent_SortServices',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.SORT_SERVICES,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SortServices(service, 'name'),
    expectedPayload: { sortValue: 'name' },
  },
  {
    description: 'logEvent_FilterServices',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.FILTER_SERVICES,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
        service,
        'category',
        'Data',
        'add',
      ),
    expectedPayload: {
      filterType: 'category',
      filterValue: 'Data',
      action: 'add',
    },
  },
  {
    description: 'logEvent_ClickServiceCard',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_SERVICE_CARD,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickServiceCard(
        service,
        '/my/pattern',
        'My Service',
      ),
    expectedPayload: { pattern: '/my/pattern', title: 'My Service' },
  },
  {
    description: 'logEvent_AIAgentStart',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_START,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentStart(service, true),
    expectedPayload: { fromSearch: true },
  },
  {
    description: 'logEvent_ChangeIntelligenceCatalogType',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_TYPE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogType(
        service,
        'mcp-server',
      ),
    expectedPayload: { catalogType: 'mcp-server' },
  },
  {
    description: 'logEvent_SearchIntelligenceCatalog',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.SEARCH_INTELLIGENCE_CATALOG,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SearchIntelligenceCatalog(
        service,
        'query',
        'mcp-server',
      ),
    expectedPayload: { query: 'query', catalogType: 'mcp-server' },
  },
  {
    description: 'logEvent_ClickIntelligenceCatalogViewMore',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_INTELLIGENCE_CATALOG_VIEW_MORE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickIntelligenceCatalogViewMore(
        service,
        'mcp-server',
      ),
    expectedPayload: { catalogType: 'mcp-server' },
  },
  {
    description: 'logEvent_ClickIntelligenceCatalogRetry',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CLICK_INTELLIGENCE_CATALOG_RETRY,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickIntelligenceCatalogRetry(
        service,
      ),
    expectedPayload: {},
  },
  {
    description: 'logEvent_ChangeIntelligenceCatalogPage',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_PAGE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogPage(
        service,
        3,
      ),
    expectedPayload: { page: 3 },
  },
  {
    description: 'logEvent_ChangeIntelligenceCatalogPageSize',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CHANGE_INTELLIGENCE_CATALOG_PAGE_SIZE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ChangeIntelligenceCatalogPageSize(
        service,
        25,
      ),
    expectedPayload: { itemsPerPage: 25 },
  },
  {
    description: 'logEvent_ToggleIntelligenceCatalogVendorFilter',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_INTELLIGENCE_CATALOG_VENDOR_FILTER,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ToggleIntelligenceCatalogVendorFilter(
        service,
        'Bloomberg',
        true,
      ),
    expectedPayload: { vendor: 'Bloomberg', selected: true },
  },
  {
    description: 'logEvent_ClearIntelligenceCatalogFilters',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.CLEAR_INTELLIGENCE_CATALOG_FILTERS,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClearIntelligenceCatalogFilters(
        service,
      ),
    expectedPayload: {},
  },
  {
    description: 'logEvent_ShowAllIntelligenceCatalogVendors',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.SHOW_ALL_INTELLIGENCE_CATALOG_VENDORS,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ShowAllIntelligenceCatalogVendors(
        service,
        true,
      ),
    expectedPayload: { expanded: true },
  },
  {
    description: 'logEvent_ClickAIAgentBackToCatalog',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_BACK_TO_CATALOG,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickAIAgentBackToCatalog(
        service,
      ),
    expectedPayload: {},
  },
  {
    description: 'logEvent_ClickMcpServerBack',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_BACK,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerBack(
        service,
        'my-mcp-server',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server' },
  },
  {
    description: 'logEvent_ClickMcpServerCopy',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_COPY,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerCopy(
        service,
        'my-mcp-server',
        'url',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server', field: 'url' },
  },
  {
    description: 'logEvent_ClickMcpServerSupportLink',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_SUPPORT_LINK,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerSupportLink(
        service,
        'my-mcp-server',
        'docs',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server', linkType: 'docs' },
  },
  {
    description: 'logEvent_ClickMcpServerRetry',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_MCP_SERVER_RETRY,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerRetry(
        service,
        'my-mcp-server',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server' },
  },
  {
    description: 'logEvent_ExpandMcpServerTool',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.EXPAND_MCP_SERVER_TOOL,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ExpandMcpServerTool(
        service,
        'my-mcp-server',
        'my-tool',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server', toolName: 'my-tool' },
  },
  {
    description: 'logEvent_ExpandMcpServerGroundingRules',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.EXPAND_MCP_SERVER_GROUNDING_RULES,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ExpandMcpServerGroundingRules(
        service,
        'my-mcp-server',
        'my-tool',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server', toolName: 'my-tool' },
  },
  {
    description: 'logEvent_ViewMcpServer',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.VIEW_MCP_SERVER,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ViewMcpServer(
        service,
        'my-mcp-server',
      ),
    expectedPayload: { mcpServerName: 'my-mcp-server' },
  },
  {
    description: 'logEvent_AIAgentQuestionAsked',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_QUESTION_ASKED,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentQuestionAsked(
        service,
        42,
        true,
        2,
      ),
    expectedPayload: { questionLength: 42, isFollowUp: true, scopeCount: 2 },
  },
  {
    description: 'logEvent_AIAgentResponseReceived',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_RESPONSE_RECEIVED,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentResponseReceived(
        service,
        'success',
        10,
        1.5,
      ),
    expectedPayload: {
      outcome: 'success',
      rowCount: 10,
      durationInSeconds: 1.5,
    },
  },
  {
    description: 'logEvent_AIAgentScopeAdded',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_SCOPE_ADDED,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeAdded(service, 3),
    expectedPayload: { scopeCount: 3 },
  },
  {
    description: 'logEvent_AIAgentScopeRemoved',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_SCOPE_REMOVED,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentScopeRemoved(service, 1),
    expectedPayload: { scopeCount: 1 },
  },
  {
    description: 'logEvent_AIAgentSuggestedQueryClicked',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_SUGGESTED_QUERY,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentSuggestedQueryClicked(
        service,
      ),
    expectedPayload: {},
  },
  {
    description: 'logEvent_AIAgentClearChat',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.AI_AGENT_CLEAR_CHAT,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentClearChat(service),
    expectedPayload: {},
  },
  {
    description: 'logEvent_AIAgentCopySql',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_COPY_SQL,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentCopySql(service),
    expectedPayload: {},
  },
  {
    description: 'logEvent_TerminalsAddonsFilterTab',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.TERMINALS_ADDONS_FILTER_TAB,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_TerminalsAddonsFilterTab(
        service,
        'all',
      ),
    expectedPayload: { tab: 'all', timestamp: expect.any(Number) },
  },
  {
    description: 'logEvent_SelectTargetUser',
    expectedEvent:
      LEGEND_MARKETPLACE_APP_EVENT.TERMINALS_ADDONS_SELECT_TARGET_USER,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_SelectTargetUser(service, true),
    expectedPayload: { isTargetUser: true, timestamp: expect.any(Number) },
  },
  {
    description: 'logEvent_ClickTerminalAddonCard',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_TERMINAL_ADDON_CARD,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickTerminalAddonCard(
        service,
        101,
        'Bloomberg Terminal',
        'Bloomberg',
        'terminal',
        TERMINAL_SEARCH_LOCATION.MAIN_CATALOG,
      ),
    expectedPayload: {
      productId: 101,
      productName: 'Bloomberg Terminal',
      providerName: 'Bloomberg',
      itemType: 'terminal',
      searchLocation: TERMINAL_SEARCH_LOCATION.MAIN_CATALOG,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_AddTerminalAddonToCart',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.ADD_TERMINAL_ADDON_TO_CART,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AddTerminalAddonToCart(
        service,
        202,
        'News Add-on',
        'Bloomberg',
        'add-on',
        TERMINAL_SEARCH_LOCATION.ADDONS_POPUP,
        false,
      ),
    expectedPayload: {
      productId: 202,
      productName: 'News Add-on',
      providerName: 'Bloomberg',
      itemType: 'add-on',
      addedFrom: TERMINAL_SEARCH_LOCATION.ADDONS_POPUP,
      isTargetUser: false,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_OpenAddonsPopup',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.OPEN_ADDONS_POPUP,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_OpenAddonsPopup(
        service,
        'Bloomberg Terminal',
        'Bloomberg',
        5,
      ),
    expectedPayload: {
      terminalProductName: 'Bloomberg Terminal',
      providerName: 'Bloomberg',
      totalAddonCount: 5,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_OpenAddonsPopup with unknown total count',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.OPEN_ADDONS_POPUP,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_OpenAddonsPopup(
        service,
        'Bloomberg Terminal',
        'Bloomberg',
        null,
      ),
    expectedPayload: {
      totalAddonCount: null,
    },
  },
  {
    description: 'logEvent_AddonsPopupSort',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.ADDONS_POPUP_SORT,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AddonsPopupSort(
        service,
        'price-asc',
      ),
    expectedPayload: { sortOrder: 'price-asc', timestamp: expect.any(Number) },
  },
  {
    description: 'logEvent_AddonsPopupPaginate',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.ADDONS_POPUP_PAGINATE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AddonsPopupPaginate(service, 2),
    expectedPayload: { page: 2, timestamp: expect.any(Number) },
  },
  {
    description: 'logEvent_ToggleTerminalSubscriptions',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.TOGGLE_TERMINAL_SUBSCRIPTIONS,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ToggleTerminalSubscriptions(
        service,
        true,
        false,
      ),
    expectedPayload: {
      isExpanded: true,
      isTargetUser: false,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_ViewOrderProfileDetails',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.VIEW_ORDER_PROFILE_DETAILS,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ViewOrderProfileDetails(
        service,
        'Bloomberg Terminal Profile',
      ),
    expectedPayload: {
      profileName: 'Bloomberg Terminal Profile',
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_AddOrderProfileToCart',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.ADD_ORDER_PROFILE_TO_CART,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AddOrderProfileToCart(
        service,
        'Bloomberg Terminal Profile',
        true,
        false,
      ),
    expectedPayload: {
      profileName: 'Bloomberg Terminal Profile',
      isMultiselect: true,
      isTargetUser: false,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_ViewYourOrdersPage',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.VIEW_YOUR_ORDERS_PAGE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ViewYourOrdersPage(service),
    expectedPayload: {
      page: LEGEND_MARKETPLACE_PAGE.YOUR_ORDERS_PAGE,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_ClickOrderEtaskLink',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_ORDER_ETASK_LINK,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ClickOrderEtaskLink(
        service,
        'order-1',
      ),
    expectedPayload: { orderId: 'order-1', timestamp: expect.any(Number) },
  },
  {
    description: 'logEvent_ViewSubscriptionsPage',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.VIEW_SUBSCRIPTIONS_PAGE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_ViewSubscriptionsPage(
        service,
        true,
      ),
    expectedPayload: {
      page: LEGEND_MARKETPLACE_PAGE.SUBSCRIPTIONS_PAGE,
      isTargetUser: true,
      timestamp: expect.any(Number),
    },
  },
  {
    description: 'logEvent_AIAgentGeneratePython',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_GENERATE_PYTHON,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentGeneratePython(service),
    expectedPayload: {},
  },
  {
    description: 'logEvent_AIAgentCopyPython',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_COPY_PYTHON,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentCopyPython(service),
    expectedPayload: {},
  },
  {
    description: 'logEvent_AIAgentOpenInDataCube',
    expectedEvent: LEGEND_MARKETPLACE_APP_EVENT.CLICK_AI_AGENT_OPEN_IN_DATACUBE,
    invoke: (service) =>
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentOpenInDataCube(service),
    expectedPayload: {},
  },
];

describe('simple pass-through telemetry events', () => {
  test.each(simpleTelemetryCases)(
    'logs correct event name and payload for $description',
    ({ expectedEvent, invoke, expectedPayload }) => {
      const { service, calls } = buildTelemetryStub();

      invoke(service);

      expect(calls).toHaveLength(1);
      expect(getLoggedCall(calls).event).toBe(expectedEvent);
      expect(getLoggedCall(calls).data).toEqual(
        expect.objectContaining(expectedPayload),
      );
    },
  );
});
