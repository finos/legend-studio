/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ProductSubscription,
  Subscription,
  SubscriptionRequest,
} from '@finos/legend-server-marketplace';
import {
  DataGrid,
  type DataGridApi,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
} from '@finos/legend-lego/data-grid';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  clsx,
  TimesIcon,
  UserSearchInput,
} from '@finos/legend-art';
import {
  assertErrorThrown,
  debounce,
  type GeneratorFn,
  LegendUser,
} from '@finos/legend-shared';
import {
  useLegendMarketplaceSubscriptionsStore,
  withLegendMarketplaceSubscriptionsStore,
} from '../../application/providers/LegendMarketplaceSubscriptionsStoreProvider.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

const SEARCH_DEBOUNCE_MS = 300;
const ALL_FILTER_OPTION = '__ALL_FILTER_OPTION__';
const formatFilterOptionLabel = (option: string): string =>
  option === ALL_FILTER_OPTION ? 'All' : option;
const PERMISSION_ID_LABEL = 'Permission ID';

type SubscriptionGridRow = Subscription & {
  permissionGroupKey: string;
  permissionGroupLabel: string;
  isSelected: boolean;
};

type SubscriptionGridNode =
  DataGridCellRendererParams<SubscriptionGridRow>['node'];

// --------------------------------------------------------------------------
// Confirmation dialog shown before executing a batch cancellation
// --------------------------------------------------------------------------

const CancellationConfirmationDialog = (props: {
  open: boolean;
  selectedSubscriptions: Subscription[];
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}): React.ReactNode => {
  const { open, selectedSubscriptions, isLoading, onClose, onConfirm } = props;

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
      <DialogTitle className="legend-marketplace-subscriptions-content__cancel-confirmation-dialog-title">
        Confirm Cancellation
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body1"
          gutterBottom={true}
          className="legend-marketplace-subscriptions-content__cancel-confirmation-text"
        >
          The following {selectedSubscriptions.length} subscription(s) will be
          cancelled:
        </Typography>
        <ul className="legend-marketplace-subscriptions-content__cancel-confirmation-list">
          {selectedSubscriptions.map((sub) => (
            <li key={sub.id}>
              <strong>{sub.carrierVendor}</strong> &mdash; {sub.serviceName} (
              {sub.itemName})
            </li>
          ))}
        </ul>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isLoading}
          startIcon={
            isLoading ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --------------------------------------------------------------------------
// KPI summary bar — total count, total monthly cost, breakdown by item type
// --------------------------------------------------------------------------

const SubscriptionKpiBar = (props: {
  subscriptions: Subscription[];
  totalMonthlyCost: number;
  showAnnualCost: boolean;
  onCostToggle: (annual: boolean) => void;
}): React.ReactNode => {
  const { subscriptions, totalMonthlyCost, showAnnualCost, onCostToggle } =
    props;

  const displayedCost = showAnnualCost
    ? totalMonthlyCost * 12
    : totalMonthlyCost;

  const countByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    for (const sub of subscriptions) {
      typeMap.set(sub.itemName, (typeMap.get(sub.itemName) ?? 0) + 1);
    }
    return typeMap;
  }, [subscriptions]);

  return (
    <div className="legend-marketplace-subscriptions-kpi-bar">
      <div className="legend-marketplace-subscriptions-kpi-bar__card">
        <Typography
          variant="overline"
          className="legend-marketplace-subscriptions-kpi-bar__label"
        >
          Total Subscriptions
        </Typography>
        <Typography className="legend-marketplace-subscriptions-kpi-bar__value">
          {subscriptions.length}
        </Typography>
      </div>
      <div className="legend-marketplace-subscriptions-kpi-bar__card">
        <Typography
          variant="overline"
          className="legend-marketplace-subscriptions-kpi-bar__label"
        >
          Total Cost
        </Typography>
        <div className="legend-marketplace-subscriptions-kpi-bar__cost-row">
          <Typography className="legend-marketplace-subscriptions-kpi-bar__value">
            ${displayedCost.toLocaleString()}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive={true}
            value={showAnnualCost ? 'annual' : 'monthly'}
            onChange={(_event, newValue: string | null) => {
              if (newValue !== null) {
                onCostToggle(newValue === 'annual');
              }
            }}
            className="legend-marketplace-subscriptions-kpi-bar__cost-segment"
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="annual">Annual</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>
      <div className="legend-marketplace-subscriptions-kpi-bar__card legend-marketplace-subscriptions-kpi-bar__card--wide">
        <Typography
          variant="overline"
          className="legend-marketplace-subscriptions-kpi-bar__label"
        >
          Categories
        </Typography>
        <div className="legend-marketplace-subscriptions-kpi-bar__pills">
          {Array.from(countByType.entries()).map(([type, count]) => (
            <Chip
              key={type}
              size="small"
              label={`${type}: ${count}`}
              className="legend-marketplace-subscriptions-kpi-bar__pill"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Main subscriptions page
// --------------------------------------------------------------------------

export const LegendMarketplaceSubscriptions =
  withLegendMarketplaceSubscriptionsStore(
    observer(() => {
      const marketplaceStore = useLegendMarketplaceBaseStore();
      const subscriptionStore = useLegendMarketplaceSubscriptionsStore();

      const [userSearchEnabled, setUserSearchEnabled] = useState(false);
      const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
      // Raw value reflects what the user typed; activeSearchText is the debounced value
      // used for filtering so we don't re-filter on every keystroke.
      const [rawSearchText, setRawSearchText] = useState('');
      const [activeSearchText, setActiveSearchText] = useState('');
      const [carrierVendorFilter, setCarrierVendorFilter] =
        useState(ALL_FILTER_OPTION);
      const [itemTypeFilter, setItemTypeFilter] = useState(ALL_FILTER_OPTION);
      // Shared toggle — controls both the KPI cost card and the grid cost column.
      const [showAnnualCost, setShowAnnualCost] = useState(false);
      // true = all groups expanded (default), false = all collapsed, null = mixed
      const [allGroupsExpanded, setAllGroupsExpanded] = useState<
        boolean | null
      >(true);
      const gridApiRef = useRef<DataGridApi<SubscriptionGridRow> | null>(null);
      const hasLoggedPageViewRef = useRef(false);

      const initialUser =
        marketplaceStore.applicationStore.identityService.currentUser;
      const executeFlowSafely = useCallback(
        (flowFn: () => GeneratorFn<void>) => {
          flowResult(flowFn()).catch((error: unknown) => {
            assertErrorThrown(error);
            marketplaceStore.applicationStore.alertUnhandledError(error);
          });
        },
        [marketplaceStore.applicationStore],
      );

      const fetchSubscriptions = useCallback(
        (user: string): void => {
          executeFlowSafely(() => subscriptionStore.fetchSubscription(user));
        },
        [executeFlowSafely, subscriptionStore],
      );

      // Debounce text search to avoid filtering on every keystroke.
      const debouncedSetActiveSearch = useMemo(
        () =>
          debounce(
            (text: string) => setActiveSearchText(text),
            SEARCH_DEBOUNCE_MS,
          ),
        [],
      );

      useEffect(
        () => () => {
          debouncedSetActiveSearch.cancel();
        },
        [debouncedSetActiveSearch],
      );

      const handleSearchChange = useCallback(
        (text: string): void => {
          setRawSearchText(text);
          debouncedSetActiveSearch(text);
        },
        [debouncedSetActiveSearch],
      );

      const handleClearSearch = useCallback((): void => {
        setRawSearchText('');
        debouncedSetActiveSearch.cancel();
        setActiveSearchText('');
      }, [debouncedSetActiveSearch]);

      const resetSearchAndFilters = useCallback((): void => {
        setRawSearchText('');
        debouncedSetActiveSearch.cancel();
        setActiveSearchText('');
        setCarrierVendorFilter(ALL_FILTER_OPTION);
        setItemTypeFilter(ALL_FILTER_OPTION);
      }, [debouncedSetActiveSearch]);

      const handleExpandCollapseAll = useCallback((): void => {
        const api = gridApiRef.current;
        if (!api) {
          return;
        }
        const shouldExpand = allGroupsExpanded !== true;
        if (shouldExpand) {
          api.expandAll();
          setAllGroupsExpanded(true);
        } else {
          api.collapseAll();
          setAllGroupsExpanded(false);
        }
      }, [allGroupsExpanded]);

      // Keyboard shortcuts: Ctrl+Shift+E = expand all, Ctrl+Shift+C = collapse all
      useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
          if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
            e.preventDefault();
            gridApiRef.current?.expandAll();
            setAllGroupsExpanded(true);
          } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
            e.preventDefault();
            gridApiRef.current?.collapseAll();
            setAllGroupsExpanded(false);
          }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
      }, []);

      const handleCancelSubscriptionClick = useCallback((): void => {
        setIsConfirmDialogOpen(true);
      }, []);

      const handleConfirmCancellation = useCallback((): void => {
        const orderItems: Record<number, ProductSubscription[]> = {};
        subscriptionStore.selectedSubscriptions.forEach((s) => {
          const item: ProductSubscription = {
            providerName: s.carrierVendor,
            productName: s.serviceName,
            category: s.itemName,
            price: s.price,
            servicepriceId: s.servicepriceId ?? 0,
            model: s.model,
          };
          if (s.permId in orderItems) {
            orderItems[s.permId]?.push(item);
          } else {
            orderItems[s.permId] = [item];
          }
        });

        const cancellationRequest: SubscriptionRequest = {
          ordered_by: initialUser,
          kerberos: subscriptionStore.selectedUser.id,
          order_items: orderItems,
        };
        executeFlowSafely(() =>
          subscriptionStore.cancelSubscription(cancellationRequest),
        );
        setIsConfirmDialogOpen(false);
      }, [executeFlowSafely, subscriptionStore, initialUser]);

      useEffect(() => {
        executeFlowSafely(() => subscriptionStore.refresh());
      }, [executeFlowSafely, subscriptionStore]);

      useEffect(() => {
        if (hasLoggedPageViewRef.current) {
          return;
        }
        const selectedUserId = subscriptionStore.selectedUser.id;
        const currentUserId =
          marketplaceStore.applicationStore.identityService.currentUser;
        const isTargetUser = selectedUserId
          ? selectedUserId !== currentUserId
          : false;
        LegendMarketplaceTelemetryHelper.logEvent_ViewSubscriptionsPage(
          marketplaceStore.applicationStore.telemetryService,
          isTargetUser,
        );
        hasLoggedPageViewRef.current = true;
      }, [marketplaceStore, subscriptionStore.selectedUser.id]);

      // Unique dropdown options derived from all feeds (unfiltered) so selections
      // are always available regardless of the current active filters.
      const carrierVendorOptions = useMemo(
        () => [
          ALL_FILTER_OPTION,
          ...Array.from(
            new Set(
              subscriptionStore.subscriptionFeeds.map((s) => s.carrierVendor),
            ),
          ).sort((a, b) => a.localeCompare(b)),
        ],
        [subscriptionStore.subscriptionFeeds],
      );

      const itemTypeOptions = useMemo(
        () => [
          ALL_FILTER_OPTION,
          ...Array.from(
            new Set(subscriptionStore.subscriptionFeeds.map((s) => s.itemName)),
          ).sort((a, b) => a.localeCompare(b)),
        ],
        [subscriptionStore.subscriptionFeeds],
      );

      // True when at least one subscription has a non-empty cost code; used to
      // hide the Cost Code column when no data populates it.
      const hasCostCodeData = useMemo(
        () => subscriptionStore.subscriptionFeeds.some((s) => !!s.costCode),
        [subscriptionStore.subscriptionFeeds],
      );

      // Filtered and pre-sorted data passed to the grid.
      // Sort order: Carrier Vendor → Product → Service (ascending).
      // AG Grid's built-in column sort controls any subsequent user-driven re-sorts.
      const filteredSubscriptions = useMemo(() => {
        const normalizedSearch = activeSearchText.trim().toLowerCase();

        // Assigns a sort priority to a row when a search is active:
        // 0 = serviceName match (highest), 1 = carrierVendor, 2 = sourceVendor.
        const matchScore = (sub: Subscription): number => {
          if (sub.serviceName.toLowerCase().includes(normalizedSearch)) {
            return 0;
          }
          if (sub.carrierVendor.toLowerCase().includes(normalizedSearch)) {
            return 1;
          }
          return 2;
        };

        return [...subscriptionStore.subscriptionFeeds]
          .filter((sub) => {
            if (
              carrierVendorFilter !== ALL_FILTER_OPTION &&
              sub.carrierVendor !== carrierVendorFilter
            ) {
              return false;
            }
            if (
              itemTypeFilter !== ALL_FILTER_OPTION &&
              sub.itemName !== itemTypeFilter
            ) {
              return false;
            }
            if (!normalizedSearch) {
              return true;
            }
            return (
              sub.serviceName.toLowerCase().includes(normalizedSearch) ||
              sub.carrierVendor.toLowerCase().includes(normalizedSearch) ||
              sub.sourceVendor.toLowerCase().includes(normalizedSearch)
            );
          })
          .sort((a, b) => {
            // When a search is active, rows with a higher-priority match
            // (serviceName > carrierVendor > sourceVendor) float to the top.
            if (normalizedSearch) {
              const scoreDiff = matchScore(a) - matchScore(b);
              if (scoreDiff !== 0) {
                return scoreDiff;
              }
            }
            // Standard grouping sort: vendor → permId → Permission ID first → service.
            const vendorCmp = a.carrierVendor.localeCompare(b.carrierVendor);
            if (vendorCmp !== 0) {
              return vendorCmp;
            }
            const permIdCmp = a.permId - b.permId;
            if (permIdCmp !== 0) {
              return permIdCmp;
            }
            const aIsPermId = a.itemName === PERMISSION_ID_LABEL;
            const bIsPermId = b.itemName === PERMISSION_ID_LABEL;
            if (aIsPermId !== bIsPermId) {
              return aIsPermId ? -1 : 1;
            }
            return a.serviceName.localeCompare(b.serviceName);
          });
      }, [
        subscriptionStore.subscriptionFeeds,
        activeSearchText,
        carrierVendorFilter,
        itemTypeFilter,
      ]);

      const permissionGroupLabelByVendorAndPermId = useMemo(() => {
        const labelsByKey = new Map<string, string>();

        for (const sub of subscriptionStore.subscriptionFeeds) {
          const key = `${sub.carrierVendor}::${sub.permId}`;
          const isPermissionIdRow = sub.itemName === PERMISSION_ID_LABEL;
          const current = labelsByKey.get(key);
          const preferredLabel = (sub.model || sub.serviceName || '').trim();

          if (!current && preferredLabel) {
            labelsByKey.set(key, preferredLabel);
          }
          if (isPermissionIdRow && preferredLabel) {
            labelsByKey.set(key, preferredLabel);
          }
        }

        return labelsByKey;
      }, [subscriptionStore.subscriptionFeeds]);

      const selectedSubscriptionIds = useMemo(
        () => new Set(subscriptionStore.selectedSubscriptions.map((s) => s.id)),
        [subscriptionStore.selectedSubscriptions],
      );

      const groupedSubscriptions = useMemo<SubscriptionGridRow[]>(() => {
        return filteredSubscriptions.map((sub) => {
          const key = `${sub.carrierVendor}::${sub.permId}`;
          const permissionGroupLabel =
            permissionGroupLabelByVendorAndPermId.get(key) ??
            `${PERMISSION_ID_LABEL} ${sub.permId}`;
          return {
            ...sub,
            permissionGroupKey: `${sub.permId}::${permissionGroupLabel}`,
            permissionGroupLabel,
            isSelected: selectedSubscriptionIds.has(sub.id),
          };
        });
      }, [
        filteredSubscriptions,
        permissionGroupLabelByVendorAndPermId,
        selectedSubscriptionIds,
      ]);

      const formatCurrency = useCallback((amount: number): string => {
        return `$${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }, []);

      const getDisplayedCost = useCallback(
        (annualAmount: number): number =>
          showAnnualCost ? annualAmount : annualAmount / 12,
        [showAnnualCost],
      );

      const getGroupDisplayedCost = useCallback(
        (node: SubscriptionGridNode): number => {
          const totalAnnualAmount = (node.allLeafChildren ?? []).reduce(
            (sum, childNode) => sum + Number(childNode.data?.annualAmount ?? 0),
            0,
          );
          return getDisplayedCost(totalAnnualAmount);
        },
        [getDisplayedCost],
      );

      const shouldSuppressPermissionSubtotal = useCallback(
        (node: SubscriptionGridNode): boolean => {
          if (!node.group || node.level !== 1) {
            return false;
          }
          const leafCount = node.allLeafChildren?.length ?? 0;
          const vendorGroupNode = node.parent;
          if (!vendorGroupNode) {
            return false;
          }
          const permissionGroupCount = (
            vendorGroupNode.childrenAfterGroup ?? []
          ).filter((childNode) => childNode.group === true).length;
          return permissionGroupCount === 1 && leafCount === 1;
        },
        [],
      );

      const renderGroupLabel = useCallback(
        (params: DataGridCellRendererParams<SubscriptionGridRow>) => {
          const node = params.node;
          if (!node.group) {
            return '';
          }
          const itemCount = node.allLeafChildren?.length ?? 0;
          if (node.level === 0) {
            return `${String(node.key)} (${itemCount})`;
          }
          const permissionGroupLabel =
            node.allLeafChildren?.[0]?.data?.permissionGroupLabel ??
            String(node.key);
          const itemLabel = itemCount === 1 ? 'item' : 'items';
          return `${permissionGroupLabel} (${itemCount} ${itemLabel})`;
        },
        [],
      );

      const autoGroupColumnDef = useMemo(
        () => ({
          minWidth: 330,
          headerName: '',
          suppressHeaderMenuButton: true,
          cellRendererParams: {
            suppressCount: true,
            innerRenderer: renderGroupLabel,
          },
        }),
        [renderGroupLabel],
      );

      const handleSubscriptionCheckboxChange = useCallback(
        (subscription: Subscription | null | undefined, checked: boolean) => {
          if (!subscription) {
            return;
          }

          const associatedAddons =
            subscription.itemName === PERMISSION_ID_LABEL
              ? filteredSubscriptions.filter(
                  (sub) =>
                    sub.permId === subscription.permId &&
                    sub.itemName !== PERMISSION_ID_LABEL,
                )
              : [];

          if (checked) {
            subscriptionStore.addSelectedSubscriptions(subscription);
            associatedAddons.forEach((addon) => {
              subscriptionStore.addSelectedSubscriptions(addon);
            });
          } else {
            subscriptionStore.removeSelectedSubscription(subscription);
            associatedAddons.forEach((addon) => {
              subscriptionStore.removeSelectedSubscription(addon);
            });
          }
        },
        [subscriptionStore, filteredSubscriptions],
      );

      const columnDefs: DataGridColumnDefinition<SubscriptionGridRow>[] =
        useMemo(
          () => [
            {
              headerName: 'Carrier Vendor',
              field: 'carrierVendor',
              rowGroup: true,
              hide: true,
              suppressHeaderMenuButton: true,
            },
            {
              headerName: 'Permission ID Group',
              field: 'permissionGroupKey',
              rowGroup: true,
              hide: true,
              suppressHeaderMenuButton: true,
            },
            {
              minWidth: 150,
              headerName: 'Product',
              field: 'model',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'model',
              cellRenderer: (
                params: DataGridCellRendererParams<SubscriptionGridRow>,
              ) => {
                if (params.node.group) {
                  return null;
                }
                const isAddon = params.data?.itemName !== PERMISSION_ID_LABEL;
                return (
                  <div
                    className={clsx(
                      'legend-marketplace-subscriptions-content__product-cell',
                      {
                        'legend-marketplace-subscriptions-content__product-cell--addon':
                          isAddon,
                      },
                    )}
                  >
                    {isAddon && (
                      <div className="legend-marketplace-subscriptions-content__row-accent" />
                    )}
                    <span>{params.data?.model}</span>
                  </div>
                );
              },
            },
            {
              minWidth: 120,
              headerName: 'Source Vendor',
              field: 'sourceVendor',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'sourceVendor',
            },
            {
              minWidth: 130,
              headerName: 'Item Type',
              field: 'itemName',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'itemName',
              cellRenderer: (
                params: DataGridCellRendererParams<SubscriptionGridRow>,
              ) => {
                if (params.node.group) {
                  return null;
                }
                return (
                  <div className="legend-marketplace-subscriptions-content__category-cell">
                    <Chip
                      label={params.data?.itemName ?? ''}
                      size="small"
                      className={clsx({
                        'legend-marketplace-subscriptions-content__category-chip--permission-id':
                          params.data?.itemName === PERMISSION_ID_LABEL,
                        'legend-marketplace-subscriptions-content__category-chip--addon':
                          params.data?.itemName !== PERMISSION_ID_LABEL,
                      })}
                    />
                  </div>
                );
              },
            },
            {
              minWidth: 180,
              headerName: 'Service',
              field: 'serviceName',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'serviceName',
            },
            {
              minWidth: 130,
              headerName: showAnnualCost
                ? 'Annual Cost (USD)'
                : 'Monthly Cost (USD)',
              field: 'annualAmount',
              headerClass:
                'legend-marketplace-subscriptions-content__col-header--right',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'annualAmount',
              valueGetter: (params) => {
                const node = params.node;
                if (!node) {
                  return 0;
                }
                if (node.group) {
                  return getGroupDisplayedCost(node);
                }
                return getDisplayedCost(Number(params.data?.annualAmount ?? 0));
              },
              cellRenderer: (
                params: DataGridCellRendererParams<SubscriptionGridRow>,
              ) => {
                const node = params.node;
                const displayValue = Number(params.value ?? 0);
                if (!Number.isFinite(displayValue)) {
                  return null;
                }

                if (node.group) {
                  if (
                    node.level === 1 &&
                    shouldSuppressPermissionSubtotal(node)
                  ) {
                    return null;
                  }
                  const groupClassName =
                    node.level === 0
                      ? 'legend-marketplace-subscriptions-content__cost-value legend-marketplace-subscriptions-content__cost-value--vendor'
                      : 'legend-marketplace-subscriptions-content__cost-value legend-marketplace-subscriptions-content__cost-value--permission';
                  return (
                    <span className={groupClassName}>
                      {formatCurrency(displayValue)}
                    </span>
                  );
                }

                return (
                  <span className="legend-marketplace-subscriptions-content__cost-value legend-marketplace-subscriptions-content__cost-value--item">
                    {formatCurrency(displayValue)}
                  </span>
                );
              },
            },
            {
              minWidth: 100,
              headerName: 'Cost Code',
              field: 'costCode',
              sortable: true,
              suppressHeaderMenuButton: true,
              flex: 1,
              tooltipField: 'costCode',
              hide: !hasCostCodeData,
            },
            {
              minWidth: 140,
              headerName: 'Cancel Subscription',
              headerClass:
                'legend-marketplace-subscriptions-content__col-header--right',
              cellClass:
                'legend-marketplace-subscriptions-content__col-cell--right',
              suppressHeaderMenuButton: true,
              flex: 1,
              cellRenderer: (
                params: DataGridCellRendererParams<SubscriptionGridRow>,
              ) => {
                const rowData = params.data;
                if (params.node.group || !rowData) {
                  return null;
                }
                return (
                  <div className="legend-marketplace-subscriptions-content__cancel-checkbox-cell">
                    <Checkbox
                      size="small"
                      checked={rowData.isSelected}
                      aria-label={`Select ${rowData.serviceName} for cancellation`}
                      onChange={(e) => {
                        handleSubscriptionCheckboxChange(
                          rowData,
                          e.target.checked,
                        );
                      }}
                    />
                  </div>
                );
              },
            },
          ],
          [
            hasCostCodeData,
            showAnnualCost,
            handleSubscriptionCheckboxChange,
            formatCurrency,
            getDisplayedCost,
            getGroupDisplayedCost,
            shouldSuppressPermissionSubtotal,
          ],
        );

      const hasSelections = subscriptionStore.selectedSubscriptions.length > 0;
      const isCancelInProgress =
        subscriptionStore.cancelSubscriptionState.isInProgress;

      return (
        <LegendMarketplacePage className="legend-marketplace-subscriptions">
          <div className="legend-marketplace-subscriptions-content">
            {/* Header: title + subtitle on the left, action buttons on the right */}
            <div className="legend-marketplace-subscriptions-content__search-section">
              <div className="legend-marketplace-subscriptions-content__header-text">
                <Typography className="legend-marketplace-subscriptions-content__title">
                  Subscriptions
                </Typography>
                <Typography className="legend-marketplace-subscriptions-content__subtitle">
                  Manage your active Market Data subscriptions.
                </Typography>
              </div>
              <div className="legend-marketplace-subscriptions-content__header-actions">
                {userSearchEnabled ? (
                  <div className="legend-marketplace-subscriptions-content__user-search-row">
                    <UserSearchInput
                      className="legend-marketplace-subscriptions__user-input"
                      userValue={subscriptionStore.selectedUser}
                      setUserValue={(_user: LegendUser): void => {
                        resetSearchAndFilters();
                        if (_user.id) {
                          subscriptionStore.setSelectedUser(_user);
                          fetchSubscriptions(_user.id);
                        } else {
                          subscriptionStore.resetSelectedUser();
                          fetchSubscriptions(initialUser);
                        }
                      }}
                      userSearchService={marketplaceStore.userSearchService}
                      label="Search user"
                      required={true}
                      variant="outlined"
                      fullWidth={true}
                    />
                    <IconButton
                      size="small"
                      aria-label="Clear target user"
                      onClick={() => {
                        setUserSearchEnabled(false);
                        resetSearchAndFilters();
                        const currentUser = new LegendUser();
                        currentUser.id = initialUser;
                        subscriptionStore.setSelectedUser(currentUser);
                        fetchSubscriptions(initialUser);
                      }}
                      className="legend-marketplace-subscriptions-content__user-search-clear-btn"
                    >
                      <TimesIcon />
                    </IconButton>
                  </div>
                ) : (
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setUserSearchEnabled(!userSearchEnabled)}
                  >
                    Change User
                  </Button>
                )}
                {/* Wrap in a <span> so the Tooltip still fires when the button is disabled */}
                <Tooltip
                  title={
                    hasSelections
                      ? ''
                      : 'Select at least one subscription to cancel.'
                  }
                  arrow={true}
                >
                  <span>
                    <Button
                      disabled={!hasSelections || isCancelInProgress}
                      aria-disabled={!hasSelections || isCancelInProgress}
                      onClick={handleCancelSubscriptionClick}
                      variant="outlined"
                      color="error"
                      startIcon={
                        isCancelInProgress ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : null
                      }
                      className="legend-marketplace-subscriptions-content__cancel-button"
                    >
                      {isCancelInProgress
                        ? 'Cancelling...'
                        : 'Cancel Subscription'}
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>

            {/* KPI bar — hidden while data is loading */}
            {!subscriptionStore.fetchSubscriptionState.isInProgress && (
              <SubscriptionKpiBar
                subscriptions={subscriptionStore.subscriptionFeeds}
                totalMonthlyCost={subscriptionStore.totalCost}
                showAnnualCost={showAnnualCost}
                onCostToggle={setShowAnnualCost}
              />
            )}

            {/* Search + filter toolbar */}
            {!subscriptionStore.fetchSubscriptionState.isInProgress && (
              <div className="legend-marketplace-subscriptions-content__toolbar">
                <TextField
                  className="legend-marketplace-subscriptions-content__search-input"
                  label="Search subscriptions"
                  variant="outlined"
                  size="small"
                  value={rawSearchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  slotProps={{
                    input: {
                      endAdornment: rawSearchText ? (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label="Clear search subscriptions text"
                            onClick={handleClearSearch}
                            className="legend-marketplace-subscriptions-content__search-clear-btn"
                          >
                            <TimesIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                />
                <FormControl
                  size="small"
                  className="legend-marketplace-subscriptions-content__filter-select"
                >
                  <InputLabel id="subscription-carrier-vendor-filter-label">
                    Carrier Vendor
                  </InputLabel>
                  <Select
                    labelId="subscription-carrier-vendor-filter-label"
                    value={carrierVendorFilter}
                    label="Carrier Vendor"
                    onChange={(e) => setCarrierVendorFilter(e.target.value)}
                  >
                    {carrierVendorOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {formatFilterOptionLabel(opt)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  className="legend-marketplace-subscriptions-content__filter-select"
                >
                  <InputLabel id="subscription-item-type-filter-label">
                    Item Type
                  </InputLabel>
                  <Select
                    labelId="subscription-item-type-filter-label"
                    value={itemTypeFilter}
                    label="Item Type"
                    onChange={(e) => setItemTypeFilter(e.target.value)}
                  >
                    {itemTypeOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {formatFilterOptionLabel(opt)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}

            {subscriptionStore.fetchSubscriptionState.isInProgress ? (
              <CircularProgress size={25} />
            ) : (
              <>
                {/* Expand / Collapse all control bar */}
                <div
                  className="legend-marketplace-subscriptions-content__grid-controls"
                  aria-live="polite"
                >
                  <Tooltip
                    title={
                      allGroupsExpanded === true
                        ? 'Collapse all groups (Ctrl+Shift+C)'
                        : 'Expand all groups (Ctrl+Shift+E)'
                    }
                    placement="top"
                    arrow={true}
                  >
                    <Button
                      size="small"
                      variant="text"
                      onClick={handleExpandCollapseAll}
                      className="legend-marketplace-subscriptions-content__expand-collapse-btn"
                      aria-label={
                        allGroupsExpanded === true
                          ? 'Collapse all subscription groups'
                          : 'Expand all subscription groups'
                      }
                    >
                      {allGroupsExpanded === true ? (
                        <>
                          <ChevronUpIcon /> Collapse All
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon /> Expand All
                        </>
                      )}
                    </Button>
                  </Tooltip>
                </div>
                <div className="legend-marketplace-subscriptions-content__subscription-grid ag-theme-balham">
                  <DataGrid
                    rowData={groupedSubscriptions}
                    columnDefs={columnDefs}
                    autoGroupColumnDef={autoGroupColumnDef}
                    rowHeight={48}
                    getRowId={(params) => params.data.id}
                    groupDisplayType="singleColumn"
                    groupDefaultExpanded={-1}
                    rowGroupPanelShow="never"
                    getRowClass={(params) => {
                      if (params.node.group !== true) {
                        return 'legend-marketplace-subscriptions-content__row--item';
                      }
                      return params.node.level === 0
                        ? 'legend-marketplace-subscriptions-content__row--group-vendor'
                        : 'legend-marketplace-subscriptions-content__row--group-permission';
                    }}
                    onGridReady={(params) => {
                      gridApiRef.current = params.api;
                    }}
                    onRowGroupOpened={() => {
                      const api = gridApiRef.current;
                      if (!api) {
                        return;
                      }
                      const groupNodes = api
                        .getRenderedNodes()
                        .filter((node) => node.group === true);
                      const hasExpanded = groupNodes.some(
                        (node) => node.expanded,
                      );
                      const hasCollapsed = groupNodes.some(
                        (node) => !node.expanded,
                      );
                      if (hasExpanded && hasCollapsed) {
                        setAllGroupsExpanded(null);
                      } else if (hasExpanded) {
                        setAllGroupsExpanded(true);
                      } else {
                        setAllGroupsExpanded(false);
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <CancellationConfirmationDialog
            open={isConfirmDialogOpen}
            selectedSubscriptions={subscriptionStore.selectedSubscriptions}
            isLoading={isCancelInProgress}
            onClose={() => setIsConfirmDialogOpen(false)}
            onConfirm={handleConfirmCancellation}
          />
        </LegendMarketplacePage>
      );
    }),
  );
