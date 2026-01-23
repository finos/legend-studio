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
import { useMemo, useState } from 'react';
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
  type TerminalResult,
} from '@finos/legend-server-marketplace';
import { RecommendedItemsCard } from './RecommendedItemsCard.js';

interface RecommendedAddOnsModalProps {
  terminal: TerminalResult | null;
  recommendedItems: TerminalResult[];
  message: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onViewCart?: () => void;
}

const MAX_DISPLAY_ITEMS_COUNT = 10;
const ITEMS_PER_PAGE_LIST = [10, 15, 25, 50];

export const RecommendedAddOnsModal = observer(
  (props: RecommendedAddOnsModalProps) => {
    const {
      terminal,
      recommendedItems,
      message,
      showModal,
      setShowModal,
      onViewCart,
    } = props;

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const isTerminalAdded =
      terminal && terminal.terminalItemType === TerminalItemType.TERMINAL;
    const headerName = isTerminalAdded ? 'Add-On Name' : 'Terminal Name';

    const filteredAndSortedItems = useMemo(() => {
      let items = [...recommendedItems];

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        items = items.filter(
          (item) =>
            item.productName.toLowerCase().includes(search) ||
            item.providerName.toLowerCase().includes(search),
        );
      }

      if (sortOrder) {
        items.sort((a, b) =>
          sortOrder === 'asc' ? a.price - b.price : b.price - a.price,
        );
      }

      return items;
    }, [recommendedItems, searchTerm, sortOrder]);

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

    const closeModal = () => {
      setShowModal(false);
      setSearchTerm('');
      setSortOrder('');
      setCurrentPage(1);
    };

    const handleViewCart = () => {
      onViewCart?.();
      closeModal();
    };

    const handleSortChange = (
      event: SelectChangeEvent<'asc' | 'desc' | ''>,
    ) => {
      setSortOrder(event.target.value);
      setCurrentPage(1);
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
                {terminal?.terminalItemType === TerminalItemType.TERMINAL
                  ? 'No recommended add-ons available for this terminal.'
                  : 'No recommended terminals available for this add-on.'}
              </Typography>
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
                  }}
                  className="recommended-addons-modal__search-field"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <SearchIcon />
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
                    value={sortOrder}
                    label="Sort by Price"
                    onChange={handleSortChange}
                    sx={{ fontSize: '1rem' }}
                  >
                    <MenuItem value="" sx={{ fontSize: '1rem' }}>
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="asc" sx={{ fontSize: '1rem' }}>
                      <Box display="flex" alignItems="center">
                        <ArrowUpIcon fontSize="small" />
                        <Typography sx={{ ml: 0.5, fontSize: '1rem' }}>
                          Low to High
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="desc" sx={{ fontSize: '1rem' }}>
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

              {filteredAndSortedItems.length === 0 ? (
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
                    <Box className="recommended-addons-modal__list-header">
                      <Typography
                        variant="subtitle2"
                        className="recommended-addons-modal__header-name"
                      >
                        {headerName}
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
                    {paginatedItems
                      .filter((item) => !item.isMandatory)
                      .map((item) => (
                        <RecommendedItemsCard
                          key={item.id}
                          recommendedItem={item}
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
            Close
          </Button>
          {onViewCart && (
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
