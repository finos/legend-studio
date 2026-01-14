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
import {
  LEGEND_MARKETPLACE_PAGE,
  LegendMarketplaceTelemetryHelper,
  PRODUCT_INTEGRATION_TYPE,
  SEARCH_SESSION_KEY,
  type MarketplaceUserSession,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import {
  ApplicationStore,
  type TelemetryService,
} from '@finos/legend-application';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplacePluginManager } from '../LegendMarketplacePluginManager.js';

// Mock localStorage implementation
const createMockStorage = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => storage[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() =>
      Object.keys(storage).forEach((key) => delete storage[key]),
    ),
  };
};

const mockStorage = createMockStorage();
Object.defineProperty(window, 'localStorage', { value: mockStorage });

const createMockTelemetryService = (): TelemetryService => {
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendMarketplaceApplicationConfig(),
    LegendMarketplacePluginManager.create(),
  );

  return {
    logEvent: jest.fn(),
    applicationStore,
    registerPlugins: jest.fn(),
    setup: jest.fn(),
  } as unknown as TelemetryService;
};

describe('LegendMarketplaceTelemetryHelper Session Management', () => {
  let mockTelemetryService: ReturnType<typeof createMockTelemetryService>;

  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
    mockStorage.removeItem.mockClear();
    mockTelemetryService = createMockTelemetryService();
  });

  describe('Session Initialization', () => {
    test('loads existing session from localStorage', () => {
      const existingSession = {
        eventId: 10,
        searchEventId: 5,
        searchSessionId: 'parent-1',
      };
      mockStorage.setItem(SEARCH_SESSION_KEY, JSON.stringify(existingSession));

      const testData = { dataProductId: 'test-dp' };
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        mockTelemetryService,
        testData,
        LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
      );

      const setItemCalls = mockStorage.setItem.mock.calls;
      expect(setItemCalls.length).toBeGreaterThan(0);

      const latestSessionCall = setItemCalls[setItemCalls.length - 1];
      const existingSessionData = JSON.parse(
        latestSessionCall?.[1] ?? '{}',
      ) as MarketplaceUserSession;

      expect(existingSessionData).toMatchObject({
        eventId: 11,
        searchSessionId: 'parent-1',
      });
    });
  });

  describe('Event ID Management', () => {
    test('increments event ID for data product card clicks', () => {
      const testData = { dataProductId: 'test-product' };

      // First click
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        mockTelemetryService,
        testData,
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );

      // Second click
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        mockTelemetryService,
        testData,
        LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
      );

      const setItemCalls = mockStorage.setItem.mock.calls;
      expect(setItemCalls.length).toBeGreaterThan(0);

      const sessionCalls = setItemCalls.filter(
        (call) => call[0] === SEARCH_SESSION_KEY,
      );
      expect(sessionCalls.length).toBeGreaterThan(0);

      const firstClick = JSON.parse(
        sessionCalls[1]?.[1] ?? '{}',
      ) as MarketplaceUserSession; //NOTE: starting at 2 because first call created a new session
      expect(firstClick).toMatchObject({
        eventId: 1,
      });

      const secondClick = JSON.parse(
        sessionCalls[2]?.[1] ?? '{}',
      ) as MarketplaceUserSession;
      expect(secondClick).toMatchObject({
        eventId: 2,
      });
    });
  });

  test('increments event ID for integrated product opens', () => {
    const testData = {
      dataProductId: 'test-integration',
      productIntegrationType: PRODUCT_INTEGRATION_TYPE.DATA_CUBE,
    };

    LegendMarketplaceTelemetryHelper.logEvent_OpenIntegratedProduct(
      mockTelemetryService,
      testData,
      undefined,
    );

    const setItemCalls = mockStorage.setItem.mock.calls;
    expect(setItemCalls.length).toBeGreaterThan(0);

    const sessionCalls = setItemCalls.filter(
      (call) => call[0] === SEARCH_SESSION_KEY,
    );
    expect(sessionCalls.length).toBeGreaterThan(0);

    const savedSessionData = JSON.parse(
      sessionCalls[sessionCalls.length - 1]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(savedSessionData).toMatchObject({
      eventId: 1,
    });
  });

  describe('Search Query Session Reset', () => {
    test('Updates searchSessionId for search queries', () => {
      LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
        mockTelemetryService,
        { dataProductId: 'existing' },
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );

      LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
        mockTelemetryService,
        'test query',
        LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
      );

      const setItemCalls = mockStorage.setItem.mock.calls;
      const sessionCalls = setItemCalls.filter(
        (call) => call[0] === SEARCH_SESSION_KEY,
      );

      // Find the most recent session call (after search)
      const finalSession = JSON.parse(
        sessionCalls[sessionCalls.length - 1]?.[1] ?? '{}',
      ) as MarketplaceUserSession;
      expect(finalSession).toMatchObject({
        eventId: 2, // Second event after click and search
        searchSessionId: mockTelemetryService.applicationStore.uuid,
      });
    });
  });
});

describe('Session Data Structure', () => {
  let mockTelemetryService: ReturnType<typeof createMockTelemetryService>;

  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
    mockStorage.removeItem.mockClear();
    mockTelemetryService = createMockTelemetryService();
  });

  test('session data matches expected structure', () => {
    LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
      mockTelemetryService,
      { dataProductId: 'structure-test' },
      LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
    );

    const setItemCalls = mockStorage.setItem.mock.calls;
    const sessionCalls = setItemCalls.filter(
      (call) => call[0] === SEARCH_SESSION_KEY,
    );
    expect(sessionCalls.length).toBeGreaterThan(0);

    const savedSessionData = JSON.parse(
      sessionCalls[sessionCalls.length - 1]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(savedSessionData).toMatchObject({
      eventId: 1,
      // no searchSessionId yet since no search occurred
    });

    expect(savedSessionData).not.toHaveProperty('searchSessionId');
  });

  test('integrated product events include session data', () => {
    const testData = {
      dataProductId: 'integration-test',
      productIntegrationType: PRODUCT_INTEGRATION_TYPE.POWER_BI,
    };

    LegendMarketplaceTelemetryHelper.logEvent_OpenIntegratedProduct(
      mockTelemetryService,
      testData,
      undefined,
    );

    const setItemCalls = mockStorage.setItem.mock.calls;
    const sessionCalls = setItemCalls.filter(
      (call) => call[0] === SEARCH_SESSION_KEY,
    );
    expect(sessionCalls.length).toBeGreaterThan(0);

    const savedSessionData = JSON.parse(
      sessionCalls[sessionCalls.length - 1]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(savedSessionData).toMatchObject({
      eventId: 1,
      // No searchSessionId since no search occurred
    });

    expect(savedSessionData).not.toHaveProperty('searchSessionId');
  });

  test('Complete user journey: search query, data product click, integrated product click', () => {
    const searchSessionId = mockTelemetryService.applicationStore.uuid;
    LegendMarketplaceTelemetryHelper.logEvent_SearchQuery(
      mockTelemetryService,
      'power bi dashboard',
      LEGEND_MARKETPLACE_PAGE.HOME_PAGE,
    );

    LegendMarketplaceTelemetryHelper.logEvent_ClickingDataProductCard(
      mockTelemetryService,
      { dataProductId: 'sales-dashboard' },
      LEGEND_MARKETPLACE_PAGE.SEARCH_RESULTS_PAGE,
    );

    LegendMarketplaceTelemetryHelper.logEvent_OpenIntegratedProduct(
      mockTelemetryService,
      {
        dataProductId: 'sales-dashboard',
        productIntegrationType: PRODUCT_INTEGRATION_TYPE.POWER_BI,
      },
      undefined,
    );

    const setItemCalls = mockStorage.setItem.mock.calls;
    const sessionCalls = setItemCalls.filter(
      (call) => call[0] === SEARCH_SESSION_KEY,
    );
    expect(sessionCalls.length).toBeGreaterThanOrEqual(3);

    //NOTE: starting at index 2 because first call creates a clear session,
    // then searching calls setItem twice (updating searchSessionId and eventId)
    // Check initial search session (after search query)
    const searchSession = JSON.parse(
      sessionCalls[2]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(searchSession).toMatchObject({
      eventId: 1,
      searchSessionId: searchSessionId,
    });

    // Check session after data product click
    const dataProductSession = JSON.parse(
      sessionCalls[3]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(dataProductSession).toMatchObject({
      eventId: 2,
      searchSessionId: searchSessionId, // Same session
    });

    // Check final session after integrated product open
    const integratedProductSession = JSON.parse(
      sessionCalls[4]?.[1] ?? '{}',
    ) as MarketplaceUserSession;
    expect(integratedProductSession).toMatchObject({
      eventId: 3,
      searchSessionId: searchSessionId, // Same session
    });

    // Verify all session IDs are consistent (same search session throughout)
    expect(dataProductSession.searchSessionId).toBe(
      searchSession.searchSessionId,
    );
    expect(integratedProductSession.searchSessionId).toBe(
      searchSession.searchSessionId,
    );
  });
});
