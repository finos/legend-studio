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
import { useCallback, useMemo, useRef, useState } from 'react';
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
  type TerminalResult,
} from '@finos/legend-server-marketplace';
import { RecommendedItemsCard } from './RecommendedItemsCard.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { flowResult } from 'mobx';
import { toastManager } from '../Toast/CartToast.js';

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
  ) => void;
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
    } = props;

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;
    const currentUser = applicationStore.identityService.currentUser;

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder | undefined>();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [terminalSearchResults, setTerminalSearchResults] = useState<
      TerminalResult[] | undefined
    >(undefined);
    const [isSearching, setIsSearching] = useState(false);
    const [isAssociating, setIsAssociating] = useState(false);
    const [associatingItemId, setAssociatingItemId] = useState<
      number | undefined
    >(undefined);

    const isTerminalAdded =
      terminal && terminal.terminalItemType === TerminalItemType.TERMINAL;
    const isAddOnAssociation = !isTerminalAdded;
    const headerName = isTerminalAdded ? 'Add-On Name' : 'Terminal Name';

    const hasMultipleSources = useMemo(() => {
      const hasCartItems = recommendedItems.some(
        (item) => item.source === RecommendationSource.CART,
      );
      const hasMarketplaceItems = recommendedItems.some(
        (item) =>
          item.source === RecommendationSource.MARKETPLACE ||
          item.source === RecommendationSource.INVENTORY,
      );
      return hasCartItems && hasMarketplaceItems;
    }, [recommendedItems]);

    const cartSourceItems = useMemo(
      () =>
        recommendedItems.filter(
          (item) => item.source === RecommendationSource.CART,
        ),
      [recommendedItems],
    );
    const marketplaceSourceItems = useMemo(
      () =>
        recommendedItems.filter(
          (item) =>
            item.source === RecommendationSource.MARKETPLACE ||
            item.source === RecommendationSource.INVENTORY,
        ),
      [recommendedItems],
    );

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
          const response =
            await legendMarketplaceBaseStore.marketplaceServerClient.searchVendorAddons(
              currentUser,
              terminal.providerName,
              {
                // SERVER_SEARCH_PAGE_SIZE is set high enough to cover all expected results and paginate client-side.
                page: 1,
                page_size: SERVER_SEARCH_PAGE_SIZE,
                search: query,
                ...(sort ? { sort_by_price: sort } : {}),
              },
              signal,
            );
          if (!signal?.aborted) {
            setTerminalSearchResults(
              response.marketplace_addons as TerminalResult[],
            );
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
        currentUser,
        legendMarketplaceBaseStore.marketplaceServerClient,
        applicationStore.logService,
      ],
    );

    const abortControllerRef = useRef<AbortController | null>(null);

    const triggerSearch = useCallback(
      (query: string, sort?: SortOrder) => {
        abortControllerRef.current?.abort();

        if (!isTerminalAdded || !query.trim()) {
          setTerminalSearchResults(undefined);
          setIsSearching(false);
          return;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        // eslint-disable-next-line no-void
        void fetchVendorAddons(query.trim(), sort, controller.signal);
      },
      [isTerminalAdded, fetchVendorAddons],
    );

    const handleSearchAction = useCallback(() => {
      setCurrentPage(1);
      triggerSearch(searchTerm, sortOrder);
    }, [searchTerm, sortOrder, triggerSearch]);

    const filteredAndSortedItems = useMemo(() => {
      let items: TerminalResult[];
      if (isTerminalAdded && searchTerm.trim() && terminalSearchResults) {
        items = [...terminalSearchResults];
      } else {
        items = [...recommendedItems];
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          items = items.filter(
            (item) =>
              item.productName.toLowerCase().includes(search) ||
              item.providerName.toLowerCase().includes(search),
          );
        }
      }

      if (
        sortOrder &&
        !(isTerminalAdded && searchTerm.trim() && terminalSearchResults)
      ) {
        items.sort((a, b) =>
          sortOrder === SortOrder.ASC ? a.price - b.price : b.price - a.price,
        );
      }

      return items;
    }, [
      recommendedItems,
      searchTerm,
      sortOrder,
      isTerminalAdded,
      terminalSearchResults,
    ]);

    const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
    const mandatoryAddOn: string = useMemo<string>(() => {
      const mandatory = filteredAndSortedItems.find((i) => i.isMandatory);
      if (mandatory?.productName) {
        return `${mandatory.productName} Added To Cart `;
      }
      return '';
    }, [filteredAndSortedItems]);
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
      setTerminalSearchResults(undefined);
      setIsSearching(false);
      setIsAssociating(false);
      setAssociatingItemId(undefined);
      abortControllerRef.current?.abort();
    }, [setShowModal]);

    const handleAssociateTerminal = useCallback(
      (selectedTerminal: TerminalResult) => {
        const associate = async (): Promise<void> => {
          setIsAssociating(true);
          setAssociatingItemId(selectedTerminal.id);
          try {
            const cartRequest =
              legendMarketplaceBaseStore.cartStore.providerToCartRequest(
                selectedTerminal,
              );
            const result = await flowResult(
              legendMarketplaceBaseStore.cartStore.addToCartWithAPI(
                cartRequest,
              ),
            );

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
              );
            } else {
              closeModal();
            }
          } catch (error) {
            assertErrorThrown(error);
            toastManager.error(
              `Failed to associate with ${selectedTerminal.productName}: ${error.message}`,
            );
          } finally {
            setIsAssociating(false);
            setAssociatingItemId(undefined);
          }
        };
        // eslint-disable-next-line no-void
        void associate();
      },
      [legendMarketplaceBaseStore.cartStore, onTerminalSelected, closeModal],
    );

    const handleViewCart = () => {
      onViewCart?.();
      closeModal();
    };

    const handleSortChange = (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      const newSortOrder = value ? (value as SortOrder) : undefined;
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

    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        maxWidth="md"
        fullWidth={true}
        className="recommended-addons-modal"
      >
        <DialogTitle className="recommended-addons-modal__header">
          {terminal?.terminalItemType === TerminalItemType.TERMINAL ? (
            <CheckCircleIcon className="recommended-addons-modal__success-icon" />
          ) : (
            <WarningIcon className="recommended-addons-modal__warning-icon" />
          )}
          <Box className="recommended-addons-modal__header-content">
            <Typography
              variant="h6"
              className="recommended-addons-modal__title"
            >
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? 'Item Added Successfully'
                : 'Unable to Add Item'}
            </Typography>
            {terminal && (
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
          {mandatoryAddOn && (
            <Box className="recommended-addons-modal__alert">
              <CheckCircleIcon />
              <Typography>
                <strong>Mandatory Add-On Included:</strong> {mandatoryAddOn}
              </Typography>
            </Box>
          )}
          <Box className="recommended-addons-modal__content-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__section-title"
            >
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? `Recommended Add-Ons for ${terminal.providerName}`
                : terminal
                  ? `Recommended Terminals for ${terminal.providerName}`
                  : ''}
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__section-description"
            >
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? 'Enhance your terminal with these add-ons'
                : 'You must order a terminal license with this add-on'}
            </Typography>
          </Box>

          {recommendedItems.length === 0 ? (
            <Box className="recommended-addons-modal__empty-state">
              <Typography variant="body1">
                {isTerminalAdded
                  ? 'No recommended add-ons available for this terminal.'
                  : 'No recommended terminals available for this add-on.'}
              </Typography>
            </Box>
          ) : isAddOnAssociation && hasMultipleSources ? (
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
                        onSelect={handleAssociateTerminal}
                        isSelecting={isAssociating}
                        selectedItemId={associatingItemId}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {cartSourceItems.length > 0 &&
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
                      Explore other available terminal options from the
                      marketplace
                    </Typography>
                  </Box>
                  <Box className="recommended-addons-modal__list">
                    <ListHeader headerName={headerName} />
                    {marketplaceSourceItems.map((item) => (
                      <RecommendedItemsCard
                        key={item.id}
                        recommendedItem={item}
                        onSelect={handleAssociateTerminal}
                        isSelecting={isAssociating}
                        selectedItemId={associatingItemId}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <>
              <Box className="recommended-addons-modal__filter-controls">
                <TextField
                  size="medium"
                  placeholder={
                    terminal?.terminalItemType === TerminalItemType.TERMINAL
                      ? 'Search by Add-On name...'
                      : 'Search by Terminal name...'
                  }
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                    if (!e.target.value.trim()) {
                      setTerminalSearchResults(undefined);
                      setIsSearching(false);
                      abortControllerRef.current?.abort();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchAction();
                    }
                  }}
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
                    <InputLabel
                      id="items-per-page-label"
                      sx={{ fontSize: '1rem' }}
                    >
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

              {isSearching ? (
                <Box
                  className="recommended-addons-modal__empty-state"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  <Typography variant="body1">Searching...</Typography>
                </Box>
              ) : filteredAndSortedItems.length === 0 ? (
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
                      of {filteredAndSortedItems.length} items
                    </Typography>
                  </Box>
                  <Box className="recommended-addons-modal__list">
                    <ListHeader headerName={headerName} />
                    {paginatedItems
                      .filter((item) => !item.isMandatory)
                      .map((item) => (
                        <RecommendedItemsCard
                          key={item.id}
                          recommendedItem={item}
                          {...(isAddOnAssociation && {
                            onSelect: handleAssociateTerminal,
                            isSelecting: isAssociating,
                            selectedItemId: associatingItemId,
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
              )}
            </>
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
