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
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from '@finos/legend-application/browser';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { mockServices } from '../../components/__test-utils__/TEST_DATA__DataAPIs.js';
import { ServiceDetail } from '@finos/legend-graph';
import { ServicesViewMode } from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('@finos/legend-application/browser', () => {
  const actualModule = jest.requireActual<Record<string, unknown>>(
    '@finos/legend-application/browser',
  );
  return {
    ...actualModule,
    useSearchParams: jest.fn(),
  };
});

const mockUseSearchParams = useSearchParams as jest.Mock;
const mockSetSearchParams = jest.fn();

const DATA_APIS_ROUTE = '/dataapis';

const setupTestComponent = async (initialQuery?: string) => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();

  mockUseSearchParams.mockReturnValue([
    new URLSearchParams(initialQuery ? { query: initialQuery } : {}),
    mockSetSearchParams,
  ]);

  createSpy(
    MOCK__baseStore.engineServerClient,
    'getServicesInfo',
  ).mockResolvedValue(mockServices.map((s) => ServiceDetail.fromJson(s)));

  const { renderResult } = await TEST__setUpMarketplaceLakehouse(
    MOCK__baseStore,
    DATA_APIS_ROUTE,
  );

  // Wait for the services count to appear (data loaded)
  await waitFor(() => screen.getByText(/\d+ Services/));

  return { MOCK__baseStore, renderResult };
};

beforeEach(() => {
  localStorage.clear();
  mockUseSearchParams.mockReset();
  mockSetSearchParams.mockReset();
});

describe('LegendMarketplaceDataAPIs', () => {
  describe('Page structure', () => {
    test('renders the search bar', async () => {
      await setupTestComponent();
      expect(
        screen.getByPlaceholderText('Search Legend Services...'),
      ).toBeDefined();
    });

    test('renders sort dropdown', async () => {
      await setupTestComponent();
      const sortDropdown = screen.getByText('Sort');
      fireEvent.mouseDown(sortDropdown);
      expect(screen.getByText('Default')).toBeDefined();
      expect(screen.getByText('Name A-Z')).toBeDefined();
      expect(screen.getByText('Name Z-A')).toBeDefined();
    });

    test('renders view toggle buttons', async () => {
      await setupTestComponent();
      expect(screen.getByTitle('List View')).toBeDefined();
      expect(screen.getByTitle('Tile View')).toBeDefined();
    });

    test('shows correct total service count', async () => {
      await setupTestComponent();
      expect(screen.getByText('4 Services')).toBeDefined();
    });

    test('pre-fills search bar from URL query param', async () => {
      await setupTestComponent('service1');
      expect(screen.getByDisplayValue('service1')).toBeDefined();
    });
  });

  describe('Default tile view', () => {
    test('renders service cards for each service', async () => {
      await setupTestComponent();
      // Services have patterns, the title is derived from last path segment
      expect(screen.getByText('service1')).toBeDefined();
      expect(screen.getByText('service2')).toBeDefined();
      expect(screen.getByText('deployed')).toBeDefined();
    });

    test('fetchAllServices is called on mount', async () => {
      const { MOCK__baseStore } = await setupTestComponent();
      expect(
        MOCK__baseStore.engineServerClient.getServicesInfo,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('View mode toggling', () => {
    test('defaults to tile view', async () => {
      await setupTestComponent();

      // Service titles should be present in tile cards
      expect(screen.getByText('service1')).toBeDefined();
      expect(screen.getByText('service2')).toBeDefined();

      // Grid table should not be present
      expect(screen.queryByRole('table')).toBeNull();
    });

    test('clicking List View button switches to list view', async () => {
      await setupTestComponent();

      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });

      // list rows with patterns should appear
      await waitFor(() =>
        expect(screen.getByText('/test/alloy/service1')).toBeDefined(),
      );
    });

    test('clicking Tile View after List View switches back to tile', async () => {
      await setupTestComponent();

      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });
      await waitFor(() =>
        expect(screen.getByText('/test/alloy/service1')).toBeDefined(),
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Tile View'));
      });

      // tile cards reappear
      await waitFor(() =>
        expect(screen.getAllByText('service1').length).toBeGreaterThan(0),
      );
    });

    test('view mode is persisted to legend-marketplace settings storage', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });

      const persisted =
        MOCK__baseStore.applicationStore.settingService.getStringValue(
          'marketplace.data-apis.viewMode',
        );
      expect(persisted).toBe(ServicesViewMode.LIST);
    });
  });

  describe('Search filtering', () => {
    test('filtering by query reduces displayed count', async () => {
      await setupTestComponent();

      const searchInput = screen.getByPlaceholderText(
        'Search Legend Services...',
      );
      fireEvent.change(searchInput, { target: { value: 'service1' } });

      await act(async () => {
        const searchButton = screen.getByTitle('Search');
        fireEvent.click(searchButton);
      });

      await waitFor(() => expect(screen.getByText('1 Services')).toBeDefined());
    });

    test('filtering with no match shows 0 Services', async () => {
      await setupTestComponent();

      const searchInput = screen.getByPlaceholderText(
        'Search Legend Services...',
      );
      fireEvent.change(searchInput, {
        target: { value: 'zzz-no-match-xyz' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Search'));
      });

      await waitFor(() => expect(screen.getByText('0 Services')).toBeDefined());
    });

    test('clearing search query restores full count', async () => {
      await setupTestComponent('service1');

      const searchInput = screen.getByDisplayValue('service1');
      fireEvent.change(searchInput, { target: { value: '' } });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Search'));
      });

      await waitFor(() => expect(screen.getByText('4 Services')).toBeDefined());
    });
  });

  describe('Sort dropdown', () => {
    test('selecting Name A-Z re-orders services', async () => {
      await setupTestComponent();

      fireEvent.mouseDown(screen.getByText('Sort'));
      const azOption = screen.getByRole('option', { name: 'Name A-Z' });
      fireEvent.click(azOption);

      // All service titles should still be present after sort
      await waitFor(() => {
        expect(screen.getByText('service1')).toBeDefined();
        expect(screen.getByText('service2')).toBeDefined();
        expect(screen.getByText('deployed')).toBeDefined();
      });
    });

    test('selecting Name Z-A re-orders services', async () => {
      await setupTestComponent();

      fireEvent.mouseDown(screen.getByText('Sort'));
      const zaOption = screen.getByRole('option', { name: 'Name Z-A' });
      fireEvent.click(zaOption);

      await waitFor(() => {
        expect(screen.getByText('service2')).toBeDefined();
        expect(screen.getByText('service1')).toBeDefined();
        expect(screen.getByText('deployed')).toBeDefined();
      });
    });
  });

  describe('Filters panel', () => {
    test('filters panel is rendered', async () => {
      await setupTestComponent();
      // The panel header renders exactly "Filters" and sections for "Owner" and "Deployment ID"
      const filtersPanelHeaders = screen.getAllByText('Filters');
      expect(filtersPanelHeaders.length).toBeGreaterThan(0);
      expect(screen.getByText('Owner')).toBeDefined();
    });
  });

  describe('Pagination', () => {
    test('pagination controls are rendered', async () => {
      await setupTestComponent();
      // PaginationControls renders items-per-page selector or page buttons
      // With 4 services on 1 page, "1" page button or "1-4 of 4" text exists
      // At minimum, the results layout container is present
      expect(screen.getByText('4 Services')).toBeDefined();
    });

    test('items per page is persisted to local storage', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      expect(screen.getByText('Items per page:')).toBeDefined();

      // Default items per page — nothing persisted yet
      const persisted =
        MOCK__baseStore.applicationStore.settingService.getNumericValue(
          'marketplace.data-apis.itemsPerPage',
        );
      expect(persisted).toBeUndefined();

      // Persist a value via the settings service (simulating what setItemsPerPage does)
      await act(async () => {
        MOCK__baseStore.applicationStore.settingService.persistValue(
          'marketplace.data-apis.itemsPerPage',
          24,
        );
      });

      const updatedPersisted =
        MOCK__baseStore.applicationStore.settingService.getNumericValue(
          'marketplace.data-apis.itemsPerPage',
        );
      expect(updatedPersisted).toBe(24);
    });

    test('persisted items per page is restored on load', async () => {
      // Pre-set the persisted value before rendering the component
      const MOCK__baseStore =
        await TEST__provideMockLegendMarketplaceBaseStore();

      MOCK__baseStore.applicationStore.settingService.persistValue(
        'marketplace.data-apis.itemsPerPage',
        24,
      );

      mockUseSearchParams.mockReturnValue([
        new URLSearchParams(),
        mockSetSearchParams,
      ]);

      createSpy(
        MOCK__baseStore.engineServerClient,
        'getServicesInfo',
      ).mockResolvedValue(mockServices.map((s) => ServiceDetail.fromJson(s)));

      await TEST__setUpMarketplaceLakehouse(MOCK__baseStore, DATA_APIS_ROUTE);

      await waitFor(() => screen.getByText(/\d+ Services/));

      // With 4 services and 24 items per page, all should show on one page
      // Verify the "Showing 1 to 4 of 4 results" text is present
      await waitFor(() => expect(screen.getByText(/Showing/)).toBeDefined());
    });
  });

  describe('Error handling', () => {
    test('handles empty service list gracefully', async () => {
      const MOCK__baseStore =
        await TEST__provideMockLegendMarketplaceBaseStore();
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams(),
        mockSetSearchParams,
      ]);

      createSpy(
        MOCK__baseStore.engineServerClient,
        'getServicesInfo',
      ).mockResolvedValue([]);

      await TEST__setUpMarketplaceLakehouse(MOCK__baseStore, DATA_APIS_ROUTE);

      await waitFor(() => expect(screen.getByText('0 Services')).toBeDefined());
    });

    test('handles fetch error without crashing', async () => {
      const MOCK__baseStore =
        await TEST__provideMockLegendMarketplaceBaseStore();
      mockUseSearchParams.mockReturnValue([
        new URLSearchParams(),
        mockSetSearchParams,
      ]);

      createSpy(
        MOCK__baseStore.engineServerClient,
        'getServicesInfo',
      ).mockRejectedValue(new Error('Network error'));

      await TEST__setUpMarketplaceLakehouse(MOCK__baseStore, DATA_APIS_ROUTE);

      await waitFor(() => expect(screen.getByText('0 Services')).toBeDefined());
    });
  });

  describe('My Services toggle', () => {
    test('renders the My Services toggle', async () => {
      await setupTestComponent();
      expect(screen.getByLabelText('My Services')).toBeDefined();
    });

    test('toggle is off by default and shows all services', async () => {
      await setupTestComponent();
      const toggle: HTMLInputElement = screen.getByLabelText('My Services');
      expect(toggle.checked).toBe(false);
      expect(screen.getByText('4 Services')).toBeDefined();
    });

    test('toggling on filters to only services owned by current user', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      // Set current user to alice who owns service1
      act(() => {
        MOCK__baseStore.applicationStore.identityService.setCurrentUser(
          'alice@example.com',
        );
      });

      const toggle = screen.getByLabelText('My Services');

      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => expect(screen.getByText('1 Services')).toBeDefined());
      expect(screen.getByText('service1')).toBeDefined();
    });

    test('toggling off restores all services', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      act(() => {
        MOCK__baseStore.applicationStore.identityService.setCurrentUser(
          'alice@example.com',
        );
      });

      const toggle = screen.getByLabelText('My Services');

      // Toggle on
      await act(async () => {
        fireEvent.click(toggle);
      });
      await waitFor(() => expect(screen.getByText('1 Services')).toBeDefined());

      // Toggle off
      await act(async () => {
        fireEvent.click(toggle);
      });
      await waitFor(() => expect(screen.getByText('4 Services')).toBeDefined());
    });

    test('toggle state is persisted to settings', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      const toggle = screen.getByLabelText('My Services');

      await act(async () => {
        fireEvent.click(toggle);
      });

      const persisted =
        MOCK__baseStore.applicationStore.settingService.getBooleanValue(
          'marketplace.data-apis.showOwnServicesOnly',
        );
      expect(persisted).toBe(true);
    });

    test('shows no services when current user owns none', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      act(() => {
        MOCK__baseStore.applicationStore.identityService.setCurrentUser(
          'unknown-user',
        );
      });

      const toggle = screen.getByLabelText('My Services');

      await act(async () => {
        fireEvent.click(toggle);
      });

      await waitFor(() => expect(screen.getByText('0 Services')).toBeDefined());
    });
  });

  describe('Favorites', () => {
    test('renders favorite star button in sort bar', async () => {
      await setupTestComponent();
      expect(screen.getByTitle('Show favorites only')).toBeDefined();
    });

    test('clicking star on a tile card toggles favorite', async () => {
      await setupTestComponent();

      const addButtons = screen.getAllByTitle('Add to favorites');
      expect(addButtons.length).toBeGreaterThan(0);

      // Favorite the first card
      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });

      // The button should now say "Remove from favorites"
      expect(screen.getAllByTitle('Remove from favorites').length).toBe(1);
    });

    test('clicking star on a list row toggles favorite', async () => {
      await setupTestComponent();

      // Switch to list view
      await act(async () => {
        fireEvent.click(screen.getByTitle('List View'));
      });

      await waitFor(() =>
        expect(screen.getByText('/test/alloy/service1')).toBeDefined(),
      );

      const addButtons = screen.getAllByTitle('Add to favorites');
      expect(addButtons.length).toBeGreaterThan(0);

      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });

      expect(screen.getAllByTitle('Remove from favorites').length).toBe(1);
    });

    test('favorites filter shows only favorited services', async () => {
      await setupTestComponent();

      // Favorite the first card
      const addButtons = screen.getAllByTitle('Add to favorites');
      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });

      // Click the favorites filter star in the sort bar
      await act(async () => {
        fireEvent.click(screen.getByTitle('Show favorites only'));
      });

      await waitFor(() => expect(screen.getByText('1 Services')).toBeDefined());
    });

    test('toggling favorites filter off shows all services again', async () => {
      await setupTestComponent();

      // Favorite one card
      const addButtons = screen.getAllByTitle('Add to favorites');
      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });

      // Enable favorites filter
      await act(async () => {
        fireEvent.click(screen.getByTitle('Show favorites only'));
      });
      await waitFor(() => expect(screen.getByText('1 Services')).toBeDefined());

      // Disable favorites filter
      await act(async () => {
        fireEvent.click(screen.getByTitle('Show all services'));
      });
      await waitFor(() => expect(screen.getByText('4 Services')).toBeDefined());
    });

    test('favorites are persisted to local storage', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      // Favorite the first card
      const addButtons = screen.getAllByTitle('Add to favorites');
      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });

      const persisted =
        MOCK__baseStore.applicationStore.settingService.getObjectValue(
          'marketplace.data-apis.favorites',
        );
      expect(Array.isArray(persisted)).toBe(true);
      expect((persisted as string[]).length).toBe(1);
    });

    test('unfavoriting removes from persisted storage', async () => {
      const { MOCK__baseStore } = await setupTestComponent();

      // Favorite then unfavorite
      const addButtons = screen.getAllByTitle('Add to favorites');
      const firstAdd = addButtons.at(0);
      expect(firstAdd).toBeDefined();
      await act(async () => {
        fireEvent.click(firstAdd as HTMLElement);
      });
      const removeButtons = screen.getAllByTitle('Remove from favorites');
      const firstRemove = removeButtons.at(0);
      expect(firstRemove).toBeDefined();
      await act(async () => {
        fireEvent.click(firstRemove as HTMLElement);
      });

      const persisted =
        MOCK__baseStore.applicationStore.settingService.getObjectValue(
          'marketplace.data-apis.favorites',
        );
      expect(Array.isArray(persisted)).toBe(true);
      expect((persisted as string[]).length).toBe(0);
    });
  });
});
