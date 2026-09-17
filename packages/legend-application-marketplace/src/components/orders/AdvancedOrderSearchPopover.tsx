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

import { type JSX, type SyntheticEvent, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Popover,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { LegendUser, type UserSearchService } from '@finos/legend-shared';
import { UserSearchInput } from '@finos/legend-art';
import { OrderSearchStatus } from '@finos/legend-server-marketplace';
import {
  getOrderSearchStatusLabel,
  parseLastDaysInput,
  ORDER_SEARCH_DEFAULT_LAST_DAYS,
  ORDER_SEARCH_MAX_LAST_DAYS,
  ORDER_SEARCH_MIN_LAST_DAYS,
} from '../../stores/orders/OrderHelpers.js';
import type { OrderSearchFormValues } from '../../stores/orders/OrderStore.js';

const OPEN_STATUS_OPTIONS = [
  OrderSearchStatus.PENDING_APPROVAL,
  OrderSearchStatus.PENDING_FULFILLMENT,
];

const CLOSED_STATUS_OPTIONS = [
  OrderSearchStatus.CANCELLED,
  OrderSearchStatus.COMPLETED,
  OrderSearchStatus.REJECTED,
];

enum SearchMode {
  ORDER_ID = 'ORDER_ID',
  OTHER_FILTERS = 'OTHER_FILTERS',
}

interface AdvancedOrderSearchPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSearch: (filters: OrderSearchFormValues) => void;
  onClear: () => void;
  isSearching: boolean;
  hasActiveSearch: boolean;
  userSearchService: UserSearchService | undefined;
}

/**
 * Popover form (anchored to the search bar's "Advanced Search" tune icon)
 * used to search across the entire orders dataset via `POST /workflow/search/orders`,
 * rather than the current user's own open/closed orders.
 */
export const AdvancedOrderSearchPopover = (
  props: AdvancedOrderSearchPopoverProps,
): JSX.Element => {
  const {
    open,
    anchorEl,
    onClose,
    onSearch,
    onClear,
    isSearching,
    hasActiveSearch,
    userSearchService,
  } = props;

  const [orderId, setOrderId] = useState('');
  const [orderedBy, setOrderedBy] = useState<LegendUser>(new LegendUser());
  const [orderedFor, setOrderedFor] = useState<LegendUser>(new LegendUser());
  const [status, setStatus] = useState<OrderSearchStatus>(
    OrderSearchStatus.ALL,
  );
  const [lastDaysInput, setLastDaysInput] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>(SearchMode.ORDER_ID);

  // The two tabs are mutually exclusive search modes: only the fields on the
  // active tab are used when searching, regardless of what was previously
  // entered on the other tab.
  const isOrderIdMode = searchMode === SearchMode.ORDER_ID;

  const canSearch = isOrderIdMode
    ? Boolean(orderId.trim())
    : Boolean(orderedBy.id.trim()) || Boolean(orderedFor.id.trim());
  const lastDays = parseLastDaysInput(lastDaysInput);
  const isLastDaysInvalid =
    lastDaysInput.trim() !== '' && lastDays === undefined;

  const handleSearchModeChange = (
    _event: SyntheticEvent,
    value: SearchMode,
  ): void => {
    setSearchMode(value);
  };

  const handleStatusChange = (
    event: SelectChangeEvent<OrderSearchStatus>,
  ): void => {
    setStatus(event.target.value);
  };

  const handleSearch = (): void => {
    if (!canSearch || isSearching) {
      return;
    }
    if (isOrderIdMode) {
      onSearch({
        orderId: orderId.trim(),
        orderedBy: undefined,
        orderedFor: undefined,
        status: OrderSearchStatus.ALL,
        lastDays: undefined,
      });
      return;
    }
    onSearch({
      orderId: undefined,
      orderedBy,
      orderedFor,
      status,
      lastDays,
    });
  };

  const handleClear = (): void => {
    setOrderId('');
    setOrderedBy(new LegendUser());
    setOrderedFor(new LegendUser());
    setStatus(OrderSearchStatus.ALL);
    setLastDaysInput('');
    setSearchMode(SearchMode.ORDER_ID);
    if (hasActiveSearch) {
      onClear();
    }
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      className="advanced-order-search-popover"
    >
      <Box className="advanced-order-search-popover__content">
        <Typography
          variant="subtitle1"
          className="advanced-order-search-popover__title"
        >
          Advanced Search
        </Typography>

        <Tabs
          value={searchMode}
          onChange={handleSearchModeChange}
          variant="fullWidth"
          className="advanced-order-search-popover__tabs"
          aria-label="search mode"
        >
          <Tab label="Order ID" value={SearchMode.ORDER_ID} />
          <Tab label="Other Filters" value={SearchMode.OTHER_FILTERS} />
        </Tabs>

        {isOrderIdMode ? (
          <TextField
            className="advanced-order-search-popover__field"
            label="Order ID"
            placeholder="e.g. LM-12345"
            size="small"
            fullWidth={true}
            variant="outlined"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        ) : (
          <>
            <Typography
              variant="caption"
              className="advanced-order-search-popover__required-hint"
            >
              Required: Fill at least one
            </Typography>

            <Box className="advanced-order-search-popover__filter-group">
              <UserSearchInput
                className="advanced-order-search-popover__field"
                label="Ordered For"
                placeholder="Search kerberos or name"
                userValue={orderedFor}
                setUserValue={setOrderedFor}
                userSearchService={userSearchService}
                variant="outlined"
                size="small"
                fullWidth={true}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <UserSearchInput
                className="advanced-order-search-popover__field"
                label="Ordered By"
                placeholder="Search kerberos or name"
                userValue={orderedBy}
                setUserValue={setOrderedBy}
                userSearchService={userSearchService}
                variant="outlined"
                size="small"
                fullWidth={true}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <Divider
              aria-hidden={true}
              className="advanced-order-search-popover__section-divider"
            />

            <FormControl
              className="advanced-order-search-popover__field"
              size="small"
              fullWidth={true}
            >
              <InputLabel id="advanced-order-search-status-label">
                Status (Optional)
              </InputLabel>
              <Select
                labelId="advanced-order-search-status-label"
                label="Status (Optional)"
                size="small"
                fullWidth={true}
                value={status}
                onChange={handleStatusChange}
                MenuProps={{
                  className: 'advanced-order-search-popover__status-menu',
                }}
              >
                <MenuItem value={OrderSearchStatus.ALL}>All</MenuItem>
                <ListSubheader>Open</ListSubheader>
                {OPEN_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {getOrderSearchStatusLabel(option)}
                  </MenuItem>
                ))}
                <ListSubheader>Closed</ListSubheader>
                {CLOSED_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {getOrderSearchStatusLabel(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              className="advanced-order-search-popover__field"
              label="Show Last (Optional)"
              placeholder="(Days)"
              size="small"
              fullWidth={true}
              variant="outlined"
              value={lastDaysInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (/^\d*$/.test(nextValue)) {
                  setLastDaysInput(nextValue);
                }
              }}
              error={isLastDaysInvalid}
              helperText={
                isLastDaysInvalid
                  ? `Enter a value between ${ORDER_SEARCH_MIN_LAST_DAYS} and ${ORDER_SEARCH_MAX_LAST_DAYS}`
                  : `Default ${ORDER_SEARCH_DEFAULT_LAST_DAYS}`
              }
              slotProps={{
                htmlInput: { inputMode: 'numeric' },
              }}
            />
          </>
        )}

        <Box className="advanced-order-search-popover__actions">
          <Button
            variant="outlined"
            size="medium"
            onClick={handleClear}
            className="advanced-order-search-popover__clear-button"
          >
            Clear
          </Button>
          <Button
            variant="contained"
            size="medium"
            onClick={handleSearch}
            disabled={!canSearch || isSearching}
            className="advanced-order-search-popover__search-button"
          >
            Search
          </Button>
        </Box>
      </Box>
    </Popover>
  );
};
