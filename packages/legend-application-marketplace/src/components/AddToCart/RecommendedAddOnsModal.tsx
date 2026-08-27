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

import { observer } from 'mobx-react-lite';
import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Divider,
  CircularProgress,
  type SelectChangeEvent,
} from '@mui/material';
import {
  CloseIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  WarningIcon,
  SearchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@finos/legend-art';
import {
  TerminalItemType,
  RecommendationSource,
  SortOrder,
  TerminalResult,
  type VendorAddonsSearchResponse,
} from '@finos/legend-server-marketplace';
import { RecommendedItemsCard } from './RecommendedItemsCard.js';
import { ColumnFilterButton } from '../Filters/ColumnFilterButton.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import type { CartStore } from '../../stores/cart/CartStore.js';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { flowResult } from 'mobx';

interface RecommendedAddOnsModalProps {
  terminal: TerminalResult | null;
  recommendedItems: TerminalResult[];
  message: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onViewCart?: () => void;
  onTerminalSelected?: (
    selectedTerminal: TerminalResult,
    recommendations: TerminalResult[],
    responseMessage: string,
    totalCount?: number | null,
  ) => void;
  totalCount?: number | null | undefined;
  overridePermissionId?: number | undefined;
  overrideModel?: string | null | undefined;
}

const MAX_DISPLAY_ITEMS_COUNT = 10;
const ITEMS_PER_PAGE_LIST = [10, 15, 25, 50];
const SERVER_SEARCH_PAGE_SIZE = 300;

const ACTION_STATUS_OWNED = 'Subscribed';
const ACTION_STATUS_IN_CART = 'In Cart';
const ACTION_STATUS_ADD_TO_CART = 'Add to Cart';
const ACTION_STATUS_OPTIONS = [
  ACTION_STATUS_OWNED,
  ACTION_STATUS_IN_CART,
  ACTION_STATUS_ADD_TO_CART,
];

const getItemActionStatus = (
  item: TerminalResult,
  cartStore: CartStore,
  locallyAddedItemIds: ReadonlySet<number>,
): string => {
  if (item.isOwned) {
    return ACTION_STATUS_OWNED;
  }
  if (cartStore.isItemInCart(item.id) || locallyAddedItemIds.has(item.id)) {
    return ACTION_STATUS_IN_CART;
  }
  return ACTION_STATUS_ADD_TO_CART;
};

// `locallyAddedItemIds` covers items added via a skip-workflow add-to-cart
// path (see RecommendedItemsCard's `isAdded` state) that don't (yet) show up
// in `cartStore.isItemInCart`, so the Action filter/status stays in sync with
// what the row actually displays.
const filterItemsByColumnFilters = (
  items: TerminalResult[],
  categoryFilter: ReadonlySet<string>,
  actionFilter: ReadonlySet<string>,
  cartStore: CartStore,
  locallyAddedItemIds: ReadonlySet<number>,
): TerminalResult[] =>
  items.filter((item) => {
    if (categoryFilter.size > 0 && !categoryFilter.has(item.category)) {
      return false;
    }
    if (
      actionFilter.size > 0 &&
      !actionFilter.has(
        getItemActionStatus(item, cartStore, locallyAddedItemIds),
      )
    ) {
      return false;
    }
    return true;
  });

interface ListHeaderProps {
  headerName: string;
  categoryOptions: string[];
  categoryFilter: ReadonlySet<string>;
  onCategoryFilterChange: (next: Set<string>) => void;
  actionOptions: string[];
  actionFilter: ReadonlySet<string>;
  onActionFilterChange: (next: Set<string>) => void;
}

const ListHeader = (props: ListHeaderProps): JSX.Element => {
  const {
    headerName,
    categoryOptions,
    categoryFilter,
    onCategoryFilterChange,
    actionOptions,
    actionFilter,
    onActionFilterChange,
  } = props;
  return (
    <Box className="recommended-addons-modal__list-header">
      <Typography
        variant="subtitle2"
        className="recommended-addons-modal__header-name"
      >
        {headerName}
      </Typography>
      <Box className="recommended-addons-modal__header-category">
        <Typography variant="subtitle2">Category</Typography>
        <ColumnFilterButton
          columnLabel="Category"
          options={categoryOptions}
          selected={categoryFilter}
          onChange={onCategoryFilterChange}
        />
      </Box>
      <Typography
        variant="subtitle2"
        className="recommended-addons-modal__header-price"
      >
        Price (monthly)
      </Typography>
      <Box className="recommended-addons-modal__header-action">
        <Typography variant="subtitle2">Action</Typography>
        <ColumnFilterButton
          columnLabel="Action"
          options={actionOptions}
          selected={actionFilter}
          onChange={onActionFilterChange}
        />
      </Box>
    </Box>
  );
};

const getFilteredAndSortedItems = (
  recommendedItems: TerminalResult[],
  isTerminalAdded: boolean,
  terminalSearchResults: TerminalResult[] | undefined,
  searchTerm: string,
  sortOrder: SortOrder | undefined,
): TerminalResult[] => {
  let items: TerminalResult[];
  if (isTerminalAdded && terminalSearchResults) {
    items = [...terminalSearchResults];
  } else {
    items = [...recommendedItems];
    if (!isTerminalAdded && searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.productName.toLowerCase().includes(search) ||
          item.providerName.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search),
      );
    }
  }
  if (sortOrder && !(isTerminalAdded && terminalSearchResults)) {
    items.sort((a, b) =>
      sortOrder === SortOrder.ASC ? a.price - b.price : b.price - a.price,
    );
  }
  return items;
};

const getModalTitle = (
  isPermissionOverride: boolean,
  isTerminalType: boolean,
): string => {
  if (isPermissionOverride) {
    return '';
  }
  return isTerminalType ? 'Item Added Successfully' : 'Unable to Add Item';
};

const getSectionTitle = (
  isPermissionOverride: boolean,
  isTerminalType: boolean,
  terminal: TerminalResult | null,
): string => {
  if (isPermissionOverride || isTerminalType) {
    return `Available Add-Ons for ${terminal?.productName ?? ''}${
      terminal?.providerName ? ` by ${terminal.providerName}` : ''
    }`;
  }
  if (terminal) {
    return `Available Terminals for ${terminal.productName}${
      terminal.providerName ? ` by ${terminal.providerName}` : ''
    }`;
  }
  return '';
};

const getEmptyStateMessage = (isTerminalAdded: boolean): string =>
  isTerminalAdded
    ? 'No add-ons available for this terminal.'
    : 'No available terminals for this add-on.';

const useVendorAddonSearch = (
  terminal: TerminalResult | null,
  isTerminalAdded: boolean,
): {
  terminalSearchResults: TerminalResult[] | undefined;
  searchTotalCount: number | undefined;
  isSearching: boolean;
  triggerSearch: (query: string, sort?: SortOrder) => void;
  resetSearch: () => void;
} => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const cartUser = legendMarketplaceBaseStore.cartStore.cartUser;
  const applicationStore = legendMarketplaceBaseStore.applicationStore;
  const marketplaceServerClient =
    legendMarketplaceBaseStore.marketplaceServerClient;
  const [terminalSearchResults, setTerminalSearchResults] = useState<
    TerminalResult[] | undefined
  >(undefined);
  const [searchTotalCount, setSearchTotalCount] = useState<number | undefined>(
    undefined,
  );
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVendorAddons = useCallback(
    async (query: string, sort?: SortOrder, signal?: AbortSignal) => {
      if (!terminal || !isTerminalAdded) {
        return;
      }
      setIsSearching(true);
      try {
        const response = (await marketplaceServerClient.searchVendorAddons(
          cartUser,
          terminal.providerName,
          {
            // SERVER_SEARCH_PAGE_SIZE is set high enough to cover all expected results and paginate client-side.
            page: 1,
            page_size: SERVER_SEARCH_PAGE_SIZE,
            search: query,
            ...(sort ? { sort_by_price: sort } : {}),
          },
          signal,
        )) as unknown as VendorAddonsSearchResponse;
        if (!signal?.aborted) {
          setTerminalSearchResults(
            response.marketplace_addons.map((item) =>
              TerminalResult.serialization.fromJson(item),
            ),
          );
          setSearchTotalCount(response.total_count);
        }
      } catch (error) {
        assertErrorThrown(error);
        if (error.name === 'AbortError') {
          return;
        }
        applicationStore.logService.error(
          LogEvent.create(
            LEGEND_MARKETPLACE_APP_EVENT.SEARCH_VENDOR_ADDONS_FAILURE,
          ),
          error,
        );
        setTerminalSearchResults(undefined);
      } finally {
        if (!signal?.aborted) {
          setIsSearching(false);
        }
      }
    },
    [
      terminal,
      isTerminalAdded,
      cartUser,
      marketplaceServerClient,
      applicationStore.logService,
    ],
  );

  const triggerSearch = useCallback(
    (query: string, sort?: SortOrder) => {
      abortControllerRef.current?.abort();

      if (!isTerminalAdded || !query.trim()) {
        setTerminalSearchResults(undefined);
        setSearchTotalCount(undefined);
        setIsSearching(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchVendorAddons(query.trim(), sort, controller.signal).catch(
        applicationStore.alertUnhandledError,
      );
    },
    [isTerminalAdded, fetchVendorAddons, applicationStore.alertUnhandledError],
  );

  const resetSearch = useCallback(() => {
    setTerminalSearchResults(undefined);
    setSearchTotalCount(undefined);
    setIsSearching(false);
    abortControllerRef.current?.abort();
  }, []);

  return {
    terminalSearchResults,
    searchTotalCount,
    isSearching,
    triggerSearch,
    resetSearch,
  };
};

const isMandatoryItem = (item: TerminalResult): boolean =>
  Boolean(item.isMandatory) && Boolean(item.productName);

interface MultiSourceContentProps {
  cartSourceItems: TerminalResult[];
  inventorySourceItems: TerminalResult[];
  marketplaceSourceItems: TerminalResult[];
  headerName: string;
  isAssociating: boolean;
  associatingItemId: number | undefined;
  onAssociate: (item: TerminalResult) => Promise<boolean> | boolean;
  onItemAdded: (itemId: number) => void;
  categoryOptions: string[];
  categoryFilter: ReadonlySet<string>;
  onCategoryFilterChange: (next: Set<string>) => void;
  actionOptions: string[];
  actionFilter: ReadonlySet<string>;
  onActionFilterChange: (next: Set<string>) => void;
}

const MultiSourceContent = (props: MultiSourceContentProps): JSX.Element => {
  const {
    cartSourceItems,
    inventorySourceItems,
    marketplaceSourceItems,
    headerName,
    isAssociating,
    associatingItemId,
    onAssociate,
    onItemAdded,
    categoryOptions,
    categoryFilter,
    onCategoryFilterChange,
    actionOptions,
    actionFilter,
    onActionFilterChange,
  } = props;

  const listHeaderFilterProps = {
    categoryOptions,
    categoryFilter,
    onCategoryFilterChange,
    actionOptions,
    actionFilter,
    onActionFilterChange,
  };

  if (
    cartSourceItems.length === 0 &&
    inventorySourceItems.length === 0 &&
    marketplaceSourceItems.length === 0
  ) {
    return (
      <Box className="recommended-addons-modal__list">
        <ListHeader headerName={headerName} {...listHeaderFilterProps} />
        <Box className="recommended-addons-modal__empty-state">
          <Typography variant="body1">
            No items match your search criteria.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="recommended-addons-modal__association-content">
      {cartSourceItems.length > 0 && (
        <Box className="recommended-addons-modal__source-section">
          <Box className="recommended-addons-modal__source-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__source-title"
            >
              From Your Cart
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__source-description"
            >
              Select a terminal from your cart to associate
            </Typography>
          </Box>
          <Box className="recommended-addons-modal__list">
            <ListHeader headerName={headerName} {...listHeaderFilterProps} />
            {cartSourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
                onItemAdded={onItemAdded}
                isSelecting={isAssociating}
                {...(associatingItemId !== undefined && {
                  selectedItemId: associatingItemId,
                })}
              />
            ))}
          </Box>
        </Box>
      )}

      {cartSourceItems.length > 0 &&
        (inventorySourceItems.length > 0 ||
          marketplaceSourceItems.length > 0) && (
          <Divider className="recommended-addons-modal__source-divider" />
        )}

      {inventorySourceItems.length > 0 && (
        <Box className="recommended-addons-modal__source-section">
          <Box className="recommended-addons-modal__source-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__source-title"
            >
              From Your Inventory
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__source-description"
            >
              Select a terminal from your existing inventory to associate
            </Typography>
          </Box>
          <Box className="recommended-addons-modal__list">
            <ListHeader headerName={headerName} {...listHeaderFilterProps} />
            {inventorySourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
                onItemAdded={onItemAdded}
                isSelecting={isAssociating}
                {...(associatingItemId !== undefined && {
                  selectedItemId: associatingItemId,
                })}
              />
            ))}
          </Box>
        </Box>
      )}

      {(cartSourceItems.length > 0 || inventorySourceItems.length > 0) &&
        marketplaceSourceItems.length > 0 && (
          <Divider className="recommended-addons-modal__source-divider" />
        )}

      {marketplaceSourceItems.length > 0 && (
        <Box className="recommended-addons-modal__source-section">
          <Box className="recommended-addons-modal__source-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__source-title"
            >
              From Marketplace
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__source-description"
            >
              Explore other available terminal options from the marketplace
            </Typography>
          </Box>
          <Box className="recommended-addons-modal__list">
            <ListHeader headerName={headerName} {...listHeaderFilterProps} />
            {marketplaceSourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
                onItemAdded={onItemAdded}
                isSelecting={isAssociating}
                {...(associatingItemId !== undefined && {
                  selectedItemId: associatingItemId,
                })}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

const MandatoryAddOnsAlert = (props: {
  mandatoryAddOns: string[];
}): JSX.Element | null => {
  const { mandatoryAddOns } = props;
  if (mandatoryAddOns.length === 0) {
    return null;
  }
  return (
    <Box className="recommended-addons-modal__alert">
      <CheckCircleIcon />
      <Box>
        <Typography>
          <strong>
            Mandatory Add-On{mandatoryAddOns.length > 1 ? 's' : ''} Included:
          </strong>
        </Typography>
        {mandatoryAddOns.length === 1 ? (
          <Typography variant="body2">
            {mandatoryAddOns[0]} Added To Cart
          </Typography>
        ) : (
          <Box component="ul" className="recommended-addons-modal__alert-list">
            {mandatoryAddOns.map((name) => (
              <Typography
                component="li"
                variant="body2"
                key={name}
                className="recommended-addons-modal__alert-list-item"
              >
                {name}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface FilterControlsProps {
  searchTerm: string;
  sortOrder: SortOrder | undefined;
  itemsPerPage: number;
  filteredItemsLength: number;
  isPermissionOverride: boolean;
  isTerminalType: boolean;
  onSearchChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSearchKeyDown: (e: KeyboardEvent) => void;
  onSearchAction: () => void;
  onSortChange: (event: SelectChangeEvent<string>) => void;
  onItemsPerPageChange: (event: SelectChangeEvent<number>) => void;
}

const FilterControls = (props: FilterControlsProps): JSX.Element => {
  const {
    searchTerm,
    sortOrder,
    itemsPerPage,
    filteredItemsLength,
    isPermissionOverride,
    isTerminalType,
    onSearchChange,
    onSearchKeyDown,
    onSearchAction,
    onSortChange,
    onItemsPerPageChange,
  } = props;
  return (
    <Box className="recommended-addons-modal__filter-controls">
      <TextField
        size="medium"
        placeholder={
          isPermissionOverride || isTerminalType
            ? 'Search by Add-On name...'
            : 'Search by Terminal name...'
        }
        value={searchTerm}
        onChange={onSearchChange}
        onKeyDown={onSearchKeyDown}
        className="recommended-addons-modal__search-field"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={onSearchAction} size="small" edge="end">
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControl
        size="medium"
        className="recommended-addons-modal__sort-select"
      >
        <InputLabel
          id="recommended-addons-sort-label"
          className="recommended-addons-modal__select-label"
        >
          Sort by Price
        </InputLabel>
        <Select
          labelId="recommended-addons-sort-label"
          value={sortOrder ?? ''}
          label="Sort by Price"
          onChange={onSortChange}
          className="recommended-addons-modal__select"
          MenuProps={{ className: 'recommended-addons-modal__select-menu' }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value={SortOrder.ASC}>
            <Box display="flex" alignItems="center">
              <ArrowUpIcon fontSize="small" />
              <Typography className="recommended-addons-modal__select-menu-item-label">
                Low to High
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value={SortOrder.DESC}>
            <Box display="flex" alignItems="center">
              <ArrowDownIcon fontSize="small" />
              <Typography className="recommended-addons-modal__select-menu-item-label">
                High to Low
              </Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>
      {filteredItemsLength > MAX_DISPLAY_ITEMS_COUNT && (
        <FormControl
          size="medium"
          className="recommended-addons-modal__items-per-page-select"
        >
          <InputLabel
            id="items-per-page-label"
            className="recommended-addons-modal__select-label"
          >
            Items per page
          </InputLabel>
          <Select
            labelId="items-per-page-label"
            value={itemsPerPage}
            label="Items per page"
            onChange={onItemsPerPageChange}
            className="recommended-addons-modal__select"
            MenuProps={{ className: 'recommended-addons-modal__select-menu' }}
          >
            {ITEMS_PER_PAGE_LIST.map((items) => (
              <MenuItem key={items} value={items}>
                {items}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
};

export const RecommendedAddOnsModal = observer(
  (props: RecommendedAddOnsModalProps) => {
    const {
      terminal,
      recommendedItems,
      message,
      showModal,
      setShowModal,
      onViewCart,
      onTerminalSelected,
      totalCount: initialTotalCount,
      overridePermissionId,
      overrideModel,
    } = props;

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const { cartStore, applicationStore } = legendMarketplaceBaseStore;

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [categoryFilter, setCategoryFilter] = useState<Set<string>>(
      () => new Set(),
    );
    const [actionFilter, setActionFilter] = useState<Set<string>>(
      () => new Set(),
    );
    // Items added via a skip-workflow add-to-cart path that don't (yet) show
    // up in cartStore.isItemInCart; keeps the Action filter in sync with what
    // RecommendedItemsCard actually renders (see getItemActionStatus).
    const [locallyAddedItemIds, setLocallyAddedItemIds] = useState<Set<number>>(
      () => new Set(),
    );

    const isTerminalAdded =
      terminal?.terminalItemType === TerminalItemType.TERMINAL;
    const isAddOnAssociation = !isTerminalAdded;
    const isPermissionOverride = overridePermissionId !== undefined;
    const headerName =
      isTerminalAdded || isPermissionOverride ? 'Add-On Name' : 'Terminal Name';
    // The "Subscribed" status only applies when overriding an existing
    // permission (managing add-ons for an already-owned terminal); in other
    // flows recommended items are never owned, so hide it as a filter option.
    const actionOptions = useMemo(
      () =>
        isPermissionOverride
          ? ACTION_STATUS_OPTIONS
          : ACTION_STATUS_OPTIONS.filter(
              (status) => status !== ACTION_STATUS_OWNED,
            ),
      [isPermissionOverride],
    );

    const {
      terminalSearchResults,
      searchTotalCount,
      isSearching,
      triggerSearch,
      resetSearch,
    } = useVendorAddonSearch(terminal, isTerminalAdded);

    const hasMultipleSources = useMemo(() => {
      const hasCartItems = recommendedItems.some(
        (item) => item.source === RecommendationSource.CART,
      );
      const hasInventoryItems = recommendedItems.some(
        (item) => item.source === RecommendationSource.INVENTORY,
      );
      const hasMarketplaceItems = recommendedItems.some(
        (item) => item.source === RecommendationSource.MARKETPLACE,
      );
      return (
        [hasCartItems, hasInventoryItems, hasMarketplaceItems].filter(Boolean)
          .length >= 2
      );
    }, [recommendedItems]);

    const { cartSourceItems, inventorySourceItems, marketplaceSourceItems } =
      useMemo(
        () => ({
          cartSourceItems: recommendedItems.filter(
            (item) => item.source === RecommendationSource.CART,
          ),
          inventorySourceItems: recommendedItems.filter(
            (item) => item.source === RecommendationSource.INVENTORY,
          ),
          marketplaceSourceItems: recommendedItems.filter(
            (item) => item.source === RecommendationSource.MARKETPLACE,
          ),
        }),
        [recommendedItems],
      );

    const handleSearchAction = useCallback(() => {
      setCurrentPage(1);
      triggerSearch(searchTerm, sortOrder);
    }, [searchTerm, sortOrder, triggerSearch]);

    const filteredAndSortedItems = useMemo(
      () =>
        getFilteredAndSortedItems(
          recommendedItems,
          isTerminalAdded,
          terminalSearchResults,
          searchTerm,
          sortOrder,
        ),
      [
        recommendedItems,
        isTerminalAdded,
        terminalSearchResults,
        searchTerm,
        sortOrder,
      ],
    );

    const categoryOptions = useMemo(
      () =>
        Array.from(new Set(recommendedItems.map((item) => item.category))).sort(
          (a, b) => a.localeCompare(b),
        ),
      [recommendedItems],
    );

    const columnFilteredItems = useMemo(
      () =>
        filterItemsByColumnFilters(
          filteredAndSortedItems,
          categoryFilter,
          actionFilter,
          cartStore,
          locallyAddedItemIds,
        ),
      [
        filteredAndSortedItems,
        categoryFilter,
        actionFilter,
        cartStore,
        locallyAddedItemIds,
      ],
    );
    const columnFilteredCartSourceItems = useMemo(
      () =>
        filterItemsByColumnFilters(
          cartSourceItems,
          categoryFilter,
          actionFilter,
          cartStore,
          locallyAddedItemIds,
        ),
      [
        cartSourceItems,
        categoryFilter,
        actionFilter,
        cartStore,
        locallyAddedItemIds,
      ],
    );
    const columnFilteredInventorySourceItems = useMemo(
      () =>
        filterItemsByColumnFilters(
          inventorySourceItems,
          categoryFilter,
          actionFilter,
          cartStore,
          locallyAddedItemIds,
        ),
      [
        inventorySourceItems,
        categoryFilter,
        actionFilter,
        cartStore,
        locallyAddedItemIds,
      ],
    );
    const columnFilteredMarketplaceSourceItems = useMemo(
      () =>
        filterItemsByColumnFilters(
          marketplaceSourceItems,
          categoryFilter,
          actionFilter,
          cartStore,
          locallyAddedItemIds,
        ),
      [
        marketplaceSourceItems,
        categoryFilter,
        actionFilter,
        cartStore,
        locallyAddedItemIds,
      ],
    );

    const totalPages = Math.ceil(columnFilteredItems.length / itemsPerPage);
    const mandatoryAddOns = useMemo(
      () =>
        filteredAndSortedItems
          .filter(isMandatoryItem)
          .map((i) => i.productName),
      [filteredAndSortedItems],
    );
    const paginatedItems = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return columnFilteredItems.slice(startIndex, endIndex);
    }, [columnFilteredItems, currentPage, itemsPerPage]);

    const closeModal = useCallback(() => {
      setShowModal(false);
      setSearchTerm('');
      setSortOrder(undefined);
      setCurrentPage(1);
      setCategoryFilter(new Set());
      setActionFilter(new Set());
      setLocallyAddedItemIds(new Set());
      resetSearch();
    }, [setShowModal, resetSearch]);

    const handleAssociateTerminal = useCallback(
      async (selectedTerminal: TerminalResult): Promise<boolean> => {
        try {
          const result = await flowResult(
            cartStore.associateAddOnToTerminal(selectedTerminal, {
              ...(overridePermissionId === undefined
                ? {}
                : { overridePermissionId }),
              ...(overrideModel === undefined ? {} : { overrideModel }),
            }),
          );

          if (!result.success) {
            return false;
          }
          if (
            result.recommendations &&
            result.recommendations.length > 0 &&
            onTerminalSelected
          ) {
            closeModal();
            onTerminalSelected(
              selectedTerminal,
              result.recommendations,
              result.message,
              result.totalCount,
            );
            return true;
          }
          if (result.shouldCloseModal) {
            closeModal();
          }
          return true;
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.alertUnhandledError(error);
          return false;
        }
      },
      [
        applicationStore,
        cartStore,
        onTerminalSelected,
        closeModal,
        overridePermissionId,
        overrideModel,
      ],
    );

    const handleSearchTermChange = useCallback(
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
        if (!e.target.value.trim()) {
          resetSearch();
        }
      },
      [resetSearch],
    );

    const handleSearchKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSearchAction();
        }
      },
      [handleSearchAction],
    );

    const handleViewCart = () => {
      onViewCart?.();
      closeModal();
    };

    const handleSortChange = (event: SelectChangeEvent<string>) => {
      const newSortOrder = event.target.value
        ? (event.target.value as SortOrder)
        : undefined;
      setSortOrder(newSortOrder);
      setCurrentPage(1);
      if (isTerminalAdded && searchTerm.trim() && terminalSearchResults) {
        triggerSearch(searchTerm, newSortOrder);
      }
    };

    const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
      setCurrentPage(page);
    };

    const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
      setItemsPerPage(Number(event.target.value));
      setCurrentPage(1);
    };

    const handleCategoryFilterChange = useCallback((next: Set<string>) => {
      setCategoryFilter(next);
      setCurrentPage(1);
    }, []);

    const handleActionFilterChange = useCallback((next: Set<string>) => {
      setActionFilter(next);
      setCurrentPage(1);
    }, []);

    const handleItemAdded = useCallback((itemId: number) => {
      setLocallyAddedItemIds((prev) =>
        prev.has(itemId) ? prev : new Set(prev).add(itemId),
      );
    }, []);

    if (!showModal) {
      return null;
    }

    const isTerminalType =
      terminal?.terminalItemType === TerminalItemType.TERMINAL;

    const modalTitle = getModalTitle(isPermissionOverride, isTerminalType);
    const sectionTitle = getSectionTitle(
      isPermissionOverride,
      isTerminalType,
      terminal,
    );

    // Pre-compute JSX branches to avoid nested ternary expressions (S3358).
    const hasActiveColumnFilters =
      categoryFilter.size > 0 || actionFilter.size > 0;
    const baseTotalCount =
      (terminalSearchResults ? searchTotalCount : initialTotalCount) ??
      filteredAndSortedItems.length;
    const displayTotalCount = hasActiveColumnFilters
      ? columnFilteredItems.length
      : baseTotalCount;

    const itemsOrEmpty: JSX.Element = (
      <>
        {columnFilteredItems.length > 0 && (
          <Box className="recommended-addons-modal__list-info">
            <Typography
              variant="body2"
              className="recommended-addons-modal__list-info-text"
            >
              Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, columnFilteredItems.length)}{' '}
              of {displayTotalCount} items
            </Typography>
          </Box>
        )}
        <Box className="recommended-addons-modal__list">
          <ListHeader
            headerName={headerName}
            categoryOptions={categoryOptions}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={handleCategoryFilterChange}
            actionOptions={actionOptions}
            actionFilter={actionFilter}
            onActionFilterChange={handleActionFilterChange}
          />
          {columnFilteredItems.length === 0 ? (
            <Box className="recommended-addons-modal__empty-state">
              <Typography variant="body1">
                No items match your search criteria.
              </Typography>
            </Box>
          ) : (
            paginatedItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onItemAdded={handleItemAdded}
                {...(isAddOnAssociation && {
                  onSelect: handleAssociateTerminal,
                  isSelecting: cartStore.associationState.isInProgress,
                  ...(cartStore.associatingItemId !== undefined && {
                    selectedItemId: cartStore.associatingItemId,
                  }),
                })}
                {...(isPermissionOverride && {
                  permissionIdOverride: overridePermissionId,
                  ...(overrideModel !== undefined && {
                    modelOverride: overrideModel,
                  }),
                })}
              />
            ))
          )}
        </Box>
        {totalPages > 1 && (
          <Box className="recommended-addons-modal__pagination">
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size="large"
              showFirstButton={true}
              showLastButton={true}
            />
          </Box>
        )}
      </>
    );

    const searchContent: JSX.Element = isSearching ? (
      <Box className="recommended-addons-modal__empty-state recommended-addons-modal__empty-state--searching">
        <CircularProgress
          size={24}
          className="recommended-addons-modal__search-spinner"
        />
        <Typography variant="body1">Searching...</Typography>
      </Box>
    ) : (
      itemsOrEmpty
    );

    const nonEmptyContent: JSX.Element =
      isAddOnAssociation && hasMultipleSources ? (
        <MultiSourceContent
          cartSourceItems={columnFilteredCartSourceItems}
          inventorySourceItems={columnFilteredInventorySourceItems}
          marketplaceSourceItems={columnFilteredMarketplaceSourceItems}
          headerName={headerName}
          isAssociating={cartStore.associationState.isInProgress}
          associatingItemId={cartStore.associatingItemId}
          onAssociate={handleAssociateTerminal}
          onItemAdded={handleItemAdded}
          categoryOptions={categoryOptions}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={handleCategoryFilterChange}
          actionOptions={actionOptions}
          actionFilter={actionFilter}
          onActionFilterChange={handleActionFilterChange}
        />
      ) : (
        <>
          <FilterControls
            searchTerm={searchTerm}
            sortOrder={sortOrder}
            itemsPerPage={itemsPerPage}
            filteredItemsLength={columnFilteredItems.length}
            isPermissionOverride={isPermissionOverride}
            isTerminalType={isTerminalType}
            onSearchChange={handleSearchTermChange}
            onSearchKeyDown={handleSearchKeyDown}
            onSearchAction={handleSearchAction}
            onSortChange={handleSortChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
          {searchContent}
        </>
      );

    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        maxWidth="md"
        fullWidth={true}
        className="recommended-addons-modal"
      >
        <DialogTitle className="recommended-addons-modal__header">
          {isTerminalType ? (
            <CheckCircleIcon className="recommended-addons-modal__success-icon" />
          ) : (
            <WarningIcon className="recommended-addons-modal__warning-icon" />
          )}
          <Box className="recommended-addons-modal__header-content">
            <Typography
              variant="h6"
              className="recommended-addons-modal__title"
            >
              {modalTitle}
            </Typography>
            {terminal && !isPermissionOverride && (
              <Typography
                variant="body2"
                className="recommended-addons-modal__subtitle"
              >
                {message}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={closeModal}
            className="recommended-addons-modal__close-btn"
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent className="recommended-addons-modal__content">
          <MandatoryAddOnsAlert mandatoryAddOns={mandatoryAddOns} />
          <Box className="recommended-addons-modal__content-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__section-title"
            >
              {sectionTitle}
            </Typography>
            {!isPermissionOverride && (
              <Typography
                variant="body2"
                className="recommended-addons-modal__section-description"
              >
                {isTerminalType
                  ? 'Enhance your terminal with these add-ons'
                  : 'You must order a terminal license with this add-on'}
              </Typography>
            )}
          </Box>

          {recommendedItems.length === 0 ? (
            <Box className="recommended-addons-modal__empty-state">
              <Typography variant="body1">
                {getEmptyStateMessage(isTerminalAdded)}
              </Typography>
            </Box>
          ) : (
            nonEmptyContent
          )}
        </DialogContent>

        <DialogActions className="recommended-addons-modal__footer">
          <Button
            variant="outlined"
            onClick={closeModal}
            className="recommended-addons-modal__close-button"
          >
            {isAddOnAssociation && !isPermissionOverride ? 'Cancel' : 'Close'}
          </Button>
          {onViewCart && (!isAddOnAssociation || isPermissionOverride) && (
            <Button
              variant="contained"
              endIcon={<ArrowRightIcon />}
              onClick={handleViewCart}
              className="recommended-addons-modal__view-cart-button"
            >
              View Cart
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  },
);
