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
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
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
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  assertErrorThrown,
  LogEvent,
  type PlainObject,
} from '@finos/legend-shared';
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

const ListHeader = (props: { headerName: string }) => (
  <Box className="recommended-addons-modal__list-header">
    <Typography
      variant="subtitle2"
      className="recommended-addons-modal__header-name"
    >
      {props.headerName}
    </Typography>
    <Typography
      variant="subtitle2"
      className="recommended-addons-modal__header-provider"
    >
      Provider
    </Typography>
    <Typography
      variant="subtitle2"
      className="recommended-addons-modal__header-price"
    >
      Price (monthly)
    </Typography>
    <Typography
      variant="subtitle2"
      className="recommended-addons-modal__header-action"
    >
      Action
    </Typography>
  </Box>
);

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
          item.providerName.toLowerCase().includes(search),
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
  if (isPermissionOverride) {
    return `Add-Ons available for ${terminal?.productName ?? ''}`;
  }
  if (isTerminalType) {
    return `Available Add-Ons for ${terminal?.productName ?? ''}`;
  }
  if (terminal) {
    return `Available Terminals for ${terminal.productName}`;
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
  const { marketplaceServerClient, applicationStore } =
    legendMarketplaceBaseStore;

  const [terminalSearchResults, setTerminalSearchResults] = useState<
    TerminalResult[] | undefined
  >(undefined);
  const [searchTotalCount, setSearchTotalCount] = useState<number | undefined>(
    undefined,
  );
  const [isSearching, setIsSearching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVendorAddons = useCallback(
    async (
      query: string,
      sort?: SortOrder,
      signal?: AbortSignal,
    ): Promise<void> => {
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
              TerminalResult.serialization.fromJson(
                item as unknown as PlainObject<TerminalResult>,
              ),
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

// ─── Multi-source terminal association content ───────────────────────────────
// Extracted to its own component to keep RecommendedAddOnsModal's cognitive
// complexity within the allowed threshold (SonarQube S3776).

interface MultiSourceContentProps {
  cartSourceItems: TerminalResult[];
  inventorySourceItems: TerminalResult[];
  marketplaceSourceItems: TerminalResult[];
  headerName: string;
  isAssociating: boolean;
  associatingItemId: number | undefined;
  onAssociate: (item: TerminalResult) => void;
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
  } = props;
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
            <ListHeader headerName={headerName} />
            {cartSourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
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
          marketplaceSourceItems.length > 0) && <Divider sx={{ my: 2 }} />}

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
            <ListHeader headerName={headerName} />
            {inventorySourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
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
        marketplaceSourceItems.length > 0 && <Divider sx={{ my: 2 }} />}

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
            <ListHeader headerName={headerName} />
            {marketplaceSourceItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
                onSelect={onAssociate}
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
          <Box
            component="ul"
            sx={{ margin: '0.4rem 0 0', paddingLeft: '2rem' }}
          >
            {mandatoryAddOns.map((name) => (
              <Typography
                component="li"
                variant="body2"
                key={name}
                sx={{ lineHeight: 1.6 }}
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

    const isTerminalAdded =
      terminal?.terminalItemType === TerminalItemType.TERMINAL;
    const isAddOnAssociation = !isTerminalAdded;
    const headerName = isTerminalAdded ? 'Add-On Name' : 'Terminal Name';

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

    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
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
      return filteredAndSortedItems.slice(startIndex, endIndex);
    }, [filteredAndSortedItems, currentPage, itemsPerPage]);

    const closeModal = useCallback(() => {
      setShowModal(false);
      setSearchTerm('');
      setSortOrder(undefined);
      setCurrentPage(1);
      resetSearch();
    }, [setShowModal, resetSearch]);

    const handleAssociateTerminal = useCallback(
      (selectedTerminal: TerminalResult): void => {
        flowResult(
          cartStore.associateAddOnToTerminal(selectedTerminal, {
            ...(overridePermissionId === undefined
              ? {}
              : { overridePermissionId }),
            ...(overrideModel === undefined ? {} : { overrideModel }),
          }),
        )
          .then((result) => {
            if (!result.success) {
              return;
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
              return;
            }
            if (result.shouldCloseModal) {
              closeModal();
            }
          })
          .catch(applicationStore.alertUnhandledError);
      },
      [
        applicationStore.alertUnhandledError,
        cartStore,
        onTerminalSelected,
        closeModal,
        overridePermissionId,
        overrideModel,
      ],
    );

    const handleSearchTermChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
        if (!e.target.value.trim()) {
          resetSearch();
        }
      },
      [resetSearch],
    );

    const handleSearchKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
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

    const handlePageChange = (
      _event: React.ChangeEvent<unknown>,
      page: number,
    ) => {
      setCurrentPage(page);
    };

    const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
      setItemsPerPage(Number(event.target.value));
      setCurrentPage(1);
    };

    if (!showModal) {
      return null;
    }

    const isPermissionOverride = overridePermissionId !== undefined;
    const isTerminalType =
      terminal?.terminalItemType === TerminalItemType.TERMINAL;

    const modalTitle = getModalTitle(isPermissionOverride, isTerminalType);
    const sectionTitle = getSectionTitle(
      isPermissionOverride,
      isTerminalType,
      terminal,
    );

    // Pre-compute JSX branches to avoid nested ternary expressions (S3358).
    const itemsOrEmpty: JSX.Element =
      filteredAndSortedItems.length === 0 ? (
        <Box className="recommended-addons-modal__empty-state">
          <Typography variant="body1">
            No items match your search criteria.
          </Typography>
        </Box>
      ) : (
        <>
          <Box className="recommended-addons-modal__list-info">
            <Typography
              variant="body2"
              sx={{
                fontSize: '1.4rem',
                color: 'var(--color-dark-grey-300)',
              }}
            >
              Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedItems.length,
              )}{' '}
              of{' '}
              {(terminalSearchResults ? searchTotalCount : initialTotalCount) ??
                filteredAndSortedItems.length}{' '}
              items
            </Typography>
          </Box>
          <Box className="recommended-addons-modal__list">
            <ListHeader headerName={headerName} />
            {paginatedItems.map((item) => (
              <RecommendedItemsCard
                key={item.id}
                recommendedItem={item}
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
            ))}
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
      <Box
        className="recommended-addons-modal__empty-state"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body1">Searching...</Typography>
      </Box>
    ) : (
      itemsOrEmpty
    );

    const nonEmptyContent: JSX.Element =
      isAddOnAssociation && hasMultipleSources ? (
        <MultiSourceContent
          cartSourceItems={cartSourceItems}
          inventorySourceItems={inventorySourceItems}
          marketplaceSourceItems={marketplaceSourceItems}
          headerName={headerName}
          isAssociating={cartStore.associationState.isInProgress}
          associatingItemId={cartStore.associatingItemId}
          onAssociate={handleAssociateTerminal}
        />
      ) : (
        <>
          <Box className="recommended-addons-modal__filter-controls">
            <TextField
              size="medium"
              placeholder={
                isPermissionOverride || isTerminalType
                  ? 'Search by Add-On name...'
                  : 'Search by Terminal name...'
              }
              value={searchTerm}
              onChange={handleSearchTermChange}
              onKeyDown={handleSearchKeyDown}
              className="recommended-addons-modal__search-field"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleSearchAction}
                        size="small"
                        edge="end"
                      >
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
              sx={{ minWidth: 180 }}
            >
              <InputLabel
                id="recommended-addons-sort-label"
                sx={{ fontSize: '1rem' }}
              >
                Sort by Price
              </InputLabel>
              <Select
                labelId="recommended-addons-sort-label"
                value={sortOrder ?? ''}
                label="Sort by Price"
                onChange={handleSortChange}
                sx={{ fontSize: '1rem' }}
              >
                <MenuItem value="" sx={{ fontSize: '1rem' }}>
                  <em>None</em>
                </MenuItem>
                <MenuItem value={SortOrder.ASC} sx={{ fontSize: '1rem' }}>
                  <Box display="flex" alignItems="center">
                    <ArrowUpIcon fontSize="small" />
                    <Typography sx={{ ml: 0.5, fontSize: '1rem' }}>
                      Low to High
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value={SortOrder.DESC} sx={{ fontSize: '1rem' }}>
                  <Box display="flex" alignItems="center">
                    <ArrowDownIcon fontSize="small" />
                    <Typography sx={{ ml: 0.5, fontSize: '1rem' }}>
                      High to Low
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            {filteredAndSortedItems.length > MAX_DISPLAY_ITEMS_COUNT && (
              <FormControl
                size="medium"
                className="recommended-addons-modal__items-per-page-select"
                sx={{ minWidth: 120 }}
              >
                <InputLabel id="items-per-page-label" sx={{ fontSize: '1rem' }}>
                  Items per page
                </InputLabel>
                <Select
                  labelId="items-per-page-label"
                  value={itemsPerPage}
                  label="Items per page"
                  onChange={handleItemsPerPageChange}
                  sx={{ fontSize: '1rem' }}
                >
                  {ITEMS_PER_PAGE_LIST.map((items) => (
                    <MenuItem
                      key={items}
                      value={items}
                      sx={{ fontSize: '1rem' }}
                    >
                      {items}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
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
            {isAddOnAssociation ? 'Cancel' : 'Close'}
          </Button>
          {onViewCart && !isAddOnAssociation && (
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
