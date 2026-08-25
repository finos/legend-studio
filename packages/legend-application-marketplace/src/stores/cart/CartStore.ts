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

import {
  makeObservable,
  observable,
  action,
  flow,
  flowResult,
  computed,
} from 'mobx';
import {
  LogEvent,
  type PlainObject,
  type GeneratorFn,
  assertErrorThrown,
  ActionState,
} from '@finos/legend-shared';
import {
  isVendorProfileCategory,
  type CartItem,
  type CartItemRequest,
  type CartItemResponse,
  type CartSummary,
  type OrderDetails,
  TerminalResult,
  type TraderProfile,
  type TraderProfileItem,
  RecommendationSource,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  APPLICATION_EVENT,
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { toastManager } from '../../components/Toast/CartToast.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

const boolToString = (val: boolean | undefined): 'true' | 'false' =>
  val ? 'true' : 'false';

enum BUSINESS_REASONS {
  NEW_HIRE = 'New Hire',
  NEW_ROLE = 'New Role',
  USER_MOVE = 'User Move',
  TRANSFER = 'Transfer',
  OTHER_REASON = 'Other Reason',
}

const PERMISSION_ID_CATEGORY = 'Permission ID';
const VENDOR_PROFILE_DISPLAY_CATEGORY = 'Vendor Profile';
const ALERT_MESSAGE_CLASS = 'legend-marketplace-cart-drawer__alert-message';
const CANCEL_ACTION = {
  label: 'Cancel',
  type: ActionAlertActionType.PROCEED,
  default: true,
};

export interface CartVendorGroup {
  vpId: number;
  parentItem: CartItem | undefined;
  displayParent: {
    providerName: string;
    productName: string;
    categoryLabel: string;
    monthlyPrice: number | undefined;
  };
  addons: CartItem[];
  groupItems: CartItem[];
  isSynthetic: boolean;
  addonTotalPrice: number;
  addonLabel: string;
}

export interface AddOnAssociationResult {
  success: boolean;
  message: string;
  recommendations?: TerminalResult[];
  totalCount?: number | null;
  shouldCloseModal: boolean;
}

interface AddOnCartRequestOptions {
  overridePermissionId?: number;
  overrideModel?: string | null;
}

export class CartStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  items: Record<number, CartItem[]> = {};
  targetUser: string | undefined = undefined;
  businessReason: string | undefined = undefined;
  readonly initState = ActionState.create();
  readonly loadingState = ActionState.create();
  readonly submitState = ActionState.create();
  readonly associationState = ActionState.create();
  associatingItemId: number | undefined = undefined;
  open = false;
  cartSummary: CartSummary = {
    total_items: 0,
    total_cost: 0,
    formatted_total_cost: '$0.00',
  };

  constructor(baseStore: LegendMarketplaceBaseStore) {
    makeObservable(this, {
      items: observable,
      targetUser: observable,
      businessReason: observable,
      associatingItemId: observable,
      open: observable,
      cartSummary: observable,
      cartUser: computed,
      cartItemIds: computed,
      vendorGroups: computed,
      vendorGroupIds: computed,
      setOpen: action,
      setTargetUser: flow,
      setBusinessReason: action,
      initialize: flow,
      submitOrder: flow,
      refresh: flow,
      clearCart: flow,
      deleteCartItem: flow,
      deleteCartItemsSequentially: flow,
      requestDeleteItemConfirmation: action,
      requestDeleteGroupConfirmation: action,
      requestClearCartConfirmation: action,
      addToCartWithAPI: flow,
      associateAddOnToTerminal: flow,
      addOrderProfileItemsToCart: flow,
    });
    this.baseStore = baseStore;
  }

  private get currentUser(): string {
    return this.baseStore.applicationStore.identityService.currentUser;
  }

  get cartUser(): string {
    return this.targetUser ?? this.currentUser;
  }

  get cartItemIds(): Set<number> {
    const ids = new Set<number>();
    for (const vendorProfileId in this.items) {
      if (Object.hasOwn(this.items, vendorProfileId)) {
        const cartItems = this.items[Number(vendorProfileId)];
        if (cartItems) {
          for (const item of cartItems) {
            ids.add(item.id);
          }
        }
      }
    }
    return ids;
  }

  isParentCartItem(item: CartItem): boolean {
    return isVendorProfileCategory(item.category);
  }

  getGroupAddOns(groupItems: CartItem[]): CartItem[] {
    const parent = groupItems.find((item) => this.isParentCartItem(item));
    return parent
      ? groupItems.filter((item) => !this.isParentCartItem(item))
      : groupItems;
  }

  get vendorGroups(): CartVendorGroup[] {
    const groups: CartVendorGroup[] = [];
    for (const vpIdStr of Object.keys(this.items)) {
      const vpId = Number(vpIdStr);
      const groupItems = this.items[vpId];
      if (!groupItems || groupItems.length === 0) {
        continue;
      }

      const realParent = groupItems.find((item) => this.isParentCartItem(item));
      const isSynthetic = !realParent;
      const groupFirstItem = groupItems[0];
      const hasPermissionAssociation = groupItems.some(
        (item) => item.permissionId !== undefined,
      );

      const addons = this.getGroupAddOns(groupItems);
      const addonTotalPrice = addons.reduce(
        (sum, addon) => sum + addon.price,
        0,
      );
      const addonLabel = `${addons.length} add-on${addons.length === 1 ? '' : 's'}`;
      const displayParent = {
        providerName:
          realParent?.providerName ?? groupFirstItem?.providerName ?? '',
        productName:
          realParent?.productName ?? groupFirstItem?.model ?? String(vpId),
        categoryLabel:
          realParent?.category ??
          (hasPermissionAssociation
            ? PERMISSION_ID_CATEGORY
            : VENDOR_PROFILE_DISPLAY_CATEGORY),
        monthlyPrice: realParent?.price,
      };

      groups.push({
        vpId,
        parentItem: realParent,
        displayParent,
        addons,
        groupItems,
        isSynthetic,
        addonTotalPrice,
        addonLabel,
      });
    }

    return groups;
  }

  get vendorGroupIds(): number[] {
    return this.vendorGroups.map((group) => group.vpId);
  }

  setOpen(val: boolean): void {
    this.open = val;
  }

  *setTargetUser(val: string | undefined): GeneratorFn<void> {
    this.loadingState.inProgress();
    this.targetUser = val;
    this.items = {};
    this.cartSummary = {
      total_items: 0,
      total_cost: 0,
      formatted_total_cost: '$0.00',
    };
    this.businessReason = undefined;
    try {
      yield flowResult(this.refresh());
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        `Failed to load cart for user: ${error.message}`,
      );
      this.loadingState.fail();
    }
  }

  setBusinessReason(val: string | undefined): void {
    this.businessReason = val;
  }

  isItemInCart(itemId: number): boolean {
    return this.cartItemIds.has(itemId);
  }

  /**
   * Returns the add-on items that depend on the given cart item.
   * When a Terminal is deleted, its associated add-ons (same vendor) must also be removed.
   */
  getDependentAddOns(cartId: number): CartItem[] {
    for (const vendorProfileId in this.items) {
      if (Object.hasOwn(this.items, vendorProfileId)) {
        const cartItems = this.items[Number(vendorProfileId)];
        if (cartItems) {
          const target = cartItems.find((item) => item.cartId === cartId);
          if (target && this.isParentCartItem(target)) {
            return cartItems.filter(
              (item) => item.cartId !== cartId && !this.isParentCartItem(item),
            );
          }
        }
      }
    }
    return [];
  }

  *addToCartWithAPI(
    cartItemData: CartItemRequest,
    suppressSuccessToast = false,
  ): GeneratorFn<{
    success: boolean;
    recommendations?: TerminalResult[];
    message: string;
    totalCount?: number | null;
  }> {
    const user = this.cartUser;

    if (!user) {
      const message = 'User not authenticated';
      toastManager.error(message);
      return { success: false, message };
    }

    this.loadingState.inProgress();
    try {
      const response = (yield this.baseStore.marketplaceServerClient.addToCart(
        user,
        cartItemData,
      )) as CartItemResponse;

      yield flowResult(this.refresh());

      const responseMessage: string = response.message;
      if (!/^2\d\d$/.test(String(response.status_code))) {
        toastManager.warning(responseMessage);
      } else if (!suppressSuccessToast) {
        toastManager.success(responseMessage);
      }

      const recommendationPayloads = (response.marketplace_addons ??
        response.marketplace_terminals ??
        []) as unknown as PlainObject<TerminalResult>[];
      const recommendations = recommendationPayloads.map((payload) =>
        TerminalResult.serialization.fromJson(payload),
      );

      const parentVendorId = response.vendor_profile_id;
      if (parentVendorId && recommendations.length > 0) {
        recommendations.forEach((item) => {
          if (!item.vendorProfileId) {
            item.vendorProfileId = parentVendorId;
          }
          item.skipWorkflow ??= true;
        });
      }

      this.loadingState.complete();
      return {
        success: true,
        recommendations,
        message: responseMessage,
        totalCount: response.total_count,
      };
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to add ${cartItemData.productName} to cart: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
      return { success: false, message };
    }
  }

  *associateAddOnToTerminal(
    selectedTerminal: TerminalResult,
    options?: AddOnCartRequestOptions,
  ): GeneratorFn<AddOnAssociationResult> {
    const { overridePermissionId } = options ?? {};

    this.associationState.inProgress();
    this.associatingItemId = selectedTerminal.id;
    try {
      const cartRequest = this.buildAddonCartRequest(selectedTerminal, options);

      const result = (yield flowResult(this.addToCartWithAPI(cartRequest))) as {
        success: boolean;
        recommendations?: TerminalResult[];
        message: string;
        totalCount?: number | null;
      };

      if (!result.success) {
        this.associationState.fail();
        return {
          success: false,
          message: result.message,
          ...(result.recommendations === undefined
            ? {}
            : { recommendations: result.recommendations }),
          ...(result.totalCount === undefined
            ? {}
            : { totalCount: result.totalCount }),
          shouldCloseModal: false,
        };
      }

      const hasRecommendations = Boolean(result.recommendations?.length);
      this.associationState.complete();
      return {
        success: true,
        message: result.message,
        ...(result.recommendations === undefined
          ? {}
          : { recommendations: result.recommendations }),
        ...(result.totalCount === undefined
          ? {}
          : { totalCount: result.totalCount }),
        shouldCloseModal:
          hasRecommendations || overridePermissionId === undefined,
      };
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to associate with ${selectedTerminal.productName}: ${error.message}`;
      toastManager.error(message);
      this.associationState.fail();
      return {
        success: false,
        message,
        shouldCloseModal: false,
      };
    } finally {
      this.associatingItemId = undefined;
    }
  }

  /**
   * Returns true if there is a cart entry matching both the given item id and
   * model.  This model-aware check prevents an add-on that was added for one
   * vendor-profile terminal from being incorrectly considered "in cart" for a
   * different terminal that shares the same add-on product id.
   */
  isAddOnInCartForModel(
    itemId: number,
    model: string | null | undefined,
  ): boolean {
    for (const vendorProfileId in this.items) {
      if (Object.hasOwn(this.items, vendorProfileId)) {
        const cartItems = this.items[Number(vendorProfileId)];
        if (
          cartItems?.some(
            (ci) => ci.id === itemId && (ci.model ?? null) === (model ?? null),
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Resolves the vendorProfileId for an item.  Uses the item's own
   * vendorProfileId if present; otherwise derives it from the parent terminal
   * for the item's model.
   */
  private resolveVendorProfileId(
    item: TraderProfileItem,
    modelToVendorProfileId: Map<string, number>,
  ): number | undefined {
    if (item.vendorProfileId !== undefined) {
      return item.vendorProfileId;
    }
    if (!item.isTerminal && item.model !== null && item.model !== undefined) {
      return modelToVendorProfileId.get(item.model);
    }
    return undefined;
  }

  /**
   * Resolves the effective permissionId for a non-terminal item.
   * Priority: item's own permissionId > owned terminal's permissionId for the
   * same model.
   */
  private resolvePermissionId(
    item: TraderProfileItem,
    ownedTerminalPermissions: Map<string, number>,
  ): number | undefined {
    if (item.isTerminal) {
      return undefined;
    }
    return item.permissionId ?? ownedTerminalPermissions.get(item.model ?? '');
  }

  /**
   * Builds the CartItemRequest payload for a single order-profile item.
   */
  private buildOrderProfileCartPayload(
    item: TraderProfileItem,
    ownedTerminalPermissions: Map<string, number>,
    modelToVendorProfileId: Map<string, number>,
  ): CartItemRequest {
    const effectivePermissionId = this.resolvePermissionId(
      item,
      ownedTerminalPermissions,
    );
    const vendorProfileId = this.resolveVendorProfileId(
      item,
      modelToVendorProfileId,
    );

    return {
      id: item.id,
      productName: item.productName,
      providerName: item.providerName,
      category: item.category,
      price: item.price,
      description: item.description ?? '',
      isOwned: boolToString(item.isOwned),
      ...(item.model === null || item.model === undefined
        ? {}
        : { model: item.model }),
      skipWorkflow: true,
      ...(item.isMandatory === undefined
        ? {}
        : { isMandatory: item.isMandatory }),
      ...(vendorProfileId === undefined ? {} : { vendorProfileId }),
      ...(effectivePermissionId === undefined
        ? {}
        : { permissionId: effectivePermissionId }),
    };
  }

  /**
   * Adds a list of order-profile items to the cart, skipping already-owned ones.
   * Accepts both terminal and add-on items; terminals are processed first so the
   * server-side cart can establish the terminal entry before its add-ons arrive.
   *
   * Every non-owned add-on is submitted with its actual item id and category.
   * The effective permissionId for an add-on is determined as follows:
   *   1. The item's own permissionId (the entitlement already belongs to a known
   *      permission).
   *   2. The parent owned terminal's permissionId when the add-on's model matches
   *      an owned terminal that carries a permissionId.
   * No permissionId-based deduplication is performed — the same product may
   * legitimately need to be added under several different terminal models.
   *
   * Every add-on also carries a vendorProfileId derived from its parent terminal
   * (owned or not).  This is required so the server can correctly group items
   * under the right vendor profile even when the parent terminal is already
   * subscribed.  The vendorProfileId is the terminal's catalog id (item.id),
   * independent of ownership status.
   */
  *addOrderProfileItemsToCart(
    items: TraderProfileItem[],
    suppressSuccessToast = false,
  ): GeneratorFn<void> {
    // Build maps from model → permissionId / terminal id for the terminals
    // in this order profile.
    // - modelToVendorProfileId: model → terminal.id, populated for ALL
    //   terminals (owned or not) so that every add-on carries vendorProfileId.
    //   vendorProfileId tells the server which catalog entry the add-on belongs
    //   to and is required regardless of whether the terminal is already owned.
    // - ownedTerminalPermissions: model → terminal.permissionId, populated
    //   only for owned terminals that carry a permissionId, so that add-ons
    //   whose parent is already subscribed carry permissionId in their payload.
    const ownedTerminalPermissions = new Map<string, number>();
    const modelToVendorProfileId = new Map<string, number>();
    for (const item of items) {
      if (item.isTerminal && item.model !== null && item.model !== undefined) {
        // Every terminal contributes its id as vendorProfileId for matching
        // add-ons so the server can group them under the right vendor profile.
        modelToVendorProfileId.set(item.model, item.id);
        // Owned terminals additionally supply their permissionId so add-ons
        // can reference the existing entitlement (permissionId propagation).
        if (item.isOwned && item.permissionId !== undefined) {
          ownedTerminalPermissions.set(item.model, item.permissionId);
        }
      }
    }

    // Process terminals before add-ons so the server-side cart can establish
    // the terminal entry before its associated add-ons are submitted.
    const orderedItems = [
      ...items.filter((i) => i.isTerminal),
      ...items.filter((i) => !i.isTerminal),
    ];

    for (const item of orderedItems) {
      if (item.isOwned) {
        continue;
      }
      // Skip items that are already present in the cart.
      const alreadyInCart = item.isTerminal
        ? this.isItemInCart(item.id)
        : this.isAddOnInCartForModel(item.id, item.model);
      if (alreadyInCart) {
        continue;
      }
      yield flowResult(
        this.addToCartWithAPI(
          this.buildOrderProfileCartPayload(
            item,
            ownedTerminalPermissions,
            modelToVendorProfileId,
          ),
          suppressSuccessToast,
        ),
      );
    }
  }

  /**
   * Returns true when all non-owned items of the profile are present in the
   * cart.  For multiselect profiles, at least one complete terminal bundle
   * (terminal + its associated add-ons) must be fully in the cart.
   *
   * Add-on items are checked with a model-aware cart lookup so that the same
   * product id appearing under two different vendor-profile models is not
   * considered "in cart" until it has been explicitly added for each model.
   */
  isOrderProfileInCart(profile: TraderProfile): boolean {
    const items = profile.items;

    const nonOwnedItems = items.filter((item) => !item.isOwned);
    if (nonOwnedItems.length === 0) {
      return false;
    }

    if (profile.multiselect) {
      const nonOwnedTerminals = nonOwnedItems.filter((i) => i.isTerminal);
      return nonOwnedTerminals.some((terminal) => {
        // Terminal is checked by its own id.
        if (!this.isItemInCart(terminal.id)) {
          return false;
        }
        // Gather all non-owned add-ons whose model matches this terminal.
        const bundleAddOns = nonOwnedItems.filter(
          (i) =>
            !i.isTerminal &&
            (terminal.model === null ||
              terminal.model === undefined ||
              i.model === terminal.model),
        );
        return bundleAddOns.every((a) =>
          this.isAddOnInCartForModel(a.id, a.model),
        );
      });
    }

    const nonOwnedTerminals = nonOwnedItems.filter((i) => i.isTerminal);
    const nonOwnedAddOns = nonOwnedItems.filter((i) => !i.isTerminal);

    return (
      nonOwnedTerminals.every((t) => this.isItemInCart(t.id)) &&
      nonOwnedAddOns.every((a) => this.isAddOnInCartForModel(a.id, a.model))
    );
  }

  providerToCartRequest(provider: TerminalResult): CartItemRequest {
    const isInventory = provider.source === RecommendationSource.INVENTORY;
    return {
      id: isInventory ? (provider.permissionId ?? provider.id) : provider.id,
      productName: provider.productName,
      providerName: provider.providerName,
      category: provider.category,
      price: provider.price,
      description: provider.description ?? '',
      isOwned: boolToString(provider.isOwned),
      model: provider.model ?? provider.productName,
      skipWorkflow: provider.skipWorkflow ?? false,
      ...(provider.vendorProfileId !== undefined && {
        vendorProfileId: provider.vendorProfileId,
      }),
      ...(provider.permissionId !== undefined && {
        permissionId: provider.permissionId,
      }),
      ...(provider.source !== undefined && {
        source: provider.source,
      }),
    };
  }

  buildAddonCartRequest(
    provider: TerminalResult,
    options?: AddOnCartRequestOptions,
  ): CartItemRequest {
    const cartItemRequest = this.providerToCartRequest(provider);
    const { overridePermissionId, overrideModel } = options ?? {};

    if (overridePermissionId !== undefined) {
      cartItemRequest.permissionId = overridePermissionId;
      cartItemRequest.skipWorkflow = true;
    }
    if (overrideModel !== undefined && overrideModel !== null) {
      cartItemRequest.model = overrideModel;
    }

    return cartItemRequest;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    try {
      yield flowResult(this.refresh());
      this.initState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.warn(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        'Cart initialization failed, using empty state',
      );
      this.initState.fail();
    }
  }

  *refresh(): GeneratorFn<void> {
    const user = this.cartUser;
    if (!user) {
      return;
    }

    try {
      this.items = (yield this.baseStore.marketplaceServerClient.getCart(
        user,
      )) as Record<number, CartItem[]>;

      const cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          user,
        )) as CartSummary;
      this.cartSummary = {
        ...cartSummary,
        formatted_total_cost: cartSummary.formatted_total_cost.replace(
          '$ ',
          '$',
        ),
      };
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        `Failed to refresh cart: ${error.message}`,
      );
    }
  }

  *submitOrder(): GeneratorFn<void> {
    if (!this.businessReason) {
      toastManager.warning(
        'Please select a business reason before submitting order',
      );
      return;
    }
    const businessReason = this.businessReason;
    if (this.cartSummary.total_items === 0) {
      toastManager.warning('Cart is empty - nothing to order');
      return;
    }
    const user = this.currentUser;
    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.submitState.inProgress();
    try {
      const orderData: OrderDetails = {
        ordered_by: user,
        kerberos: this.cartUser,
        order_items: this.items,
        business_justification: this.businessReason,
      };

      yield this.baseStore.marketplaceServerClient.submitOrder(user, orderData);

      LegendMarketplaceTelemetryHelper.logEvent_SubmitOrder(
        this.baseStore.applicationStore.telemetryService,
        this.cartSummary.total_items,
        this.cartSummary.total_cost,
        this.targetUser !== this.currentUser,
        businessReason,
      );

      toastManager.notify('Order created successfully!', 'success');

      yield flowResult(this.refresh());
      this.setBusinessReason(undefined);
      this.open = false;
      this.submitState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to submit order: ${error.message}`;
      toastManager.error(message);
      this.submitState.fail();
    }
  }

  *clearCart(): GeneratorFn<void> {
    const user = this.cartUser;
    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.clearCart(user);
      yield flowResult(this.refresh());
      toastManager.success('Cart cleared successfully');
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to clear cart: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
    }
  }

  *deleteCartItem(cartId: number, confirmDelete?: boolean): GeneratorFn<void> {
    const user = this.cartUser;
    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.deleteCartItem(
        user,
        cartId,
        confirmDelete,
      );

      yield flowResult(this.refresh());
      toastManager.success('Item removed successfully');
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to remove item: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
    }
  }

  *deleteCartItemsSequentially(
    cartIds: number[],
    successMessage = 'Items removed successfully',
  ): GeneratorFn<void> {
    const user = this.cartUser;
    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      for (const cartId of cartIds) {
        yield this.baseStore.marketplaceServerClient.deleteCartItem(
          user,
          cartId,
          undefined,
        );
      }

      yield flowResult(this.refresh());
      toastManager.success(successMessage);
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to remove items: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
    }
  }

  private requestCartActionAlert(params: {
    title: string;
    message: string;
    prompt: string;
    proceedLabel: string;
    handler: () => void;
  }): void {
    this.baseStore.applicationStore.alertService.setActionAlertInfo({
      title: params.title,
      message: params.message,
      messageClass: ALERT_MESSAGE_CLASS,
      prompt: params.prompt,
      type: ActionAlertType.CAUTION,
      actions: [
        {
          label: params.proceedLabel,
          type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          handler: params.handler,
        },
        CANCEL_ACTION,
      ],
    });
  }

  requestDeleteItemConfirmation(item: CartItem, vendorGroup: CartItem[]): void {
    const applicationStore = this.baseStore.applicationStore;
    const addons = this.getGroupAddOns(vendorGroup);

    if (this.isParentCartItem(item) && addons.length > 0) {
      this.requestCartActionAlert({
        title: 'Remove Vendor Profile?',
        message: `Remove "${item.productName}"?`,
        prompt: `Removing this vendor profile will also remove ${addons.length} associated add-on${addons.length === 1 ? '' : 's'}. This action cannot be undone. Do you want to continue?`,
        proceedLabel: 'Remove All',
        handler: (): void => {
          flowResult(this.deleteCartItem(item.cartId, true)).catch(
            applicationStore.alertUnhandledError,
          );
        },
      });
      return;
    }

    if (!this.isParentCartItem(item) && item.isMandatory) {
      const totalItems = vendorGroup.length;
      this.requestCartActionAlert({
        title: 'Remove Required Service?',
        message: `Remove "${item.productName}"?`,
        prompt: `This is a required service. Removing it will also remove the vendor profile and all ${totalItems - 1} associated item${totalItems - 1 === 1 ? '' : 's'}. Do you want to continue?`,
        proceedLabel: 'Remove All',
        handler: (): void => {
          flowResult(this.deleteCartItem(item.cartId, true)).catch(
            applicationStore.alertUnhandledError,
          );
        },
      });
      return;
    }

    this.requestCartActionAlert({
      title: 'Remove Item?',
      message: `Remove "${item.productName}"?`,
      prompt: `Are you sure you want to remove "${item.productName}" from your cart?`,
      proceedLabel: 'Remove',
      handler: (): void => {
        flowResult(this.deleteCartItem(item.cartId)).catch(
          applicationStore.alertUnhandledError,
        );
      },
    });
  }

  requestDeleteGroupConfirmation(vendorGroup: CartItem[]): void {
    const applicationStore = this.baseStore.applicationStore;
    const count = vendorGroup.length;
    const parentItem = vendorGroup.find((item) => this.isParentCartItem(item));
    const cartIds = vendorGroup.map((item) => item.cartId);

    this.requestCartActionAlert({
      title: 'Remove Items?',
      message: `Remove ${count} item${count === 1 ? '' : 's'}?`,
      prompt: `Are you sure you want to remove all ${count} item${count === 1 ? '' : 's'} from this group? This action cannot be undone.`,
      proceedLabel: 'Remove All',
      handler: (): void => {
        const deleteAction = parentItem
          ? this.deleteCartItem(parentItem.cartId, true)
          : this.deleteCartItemsSequentially(
              cartIds,
              'Items removed successfully',
            );
        flowResult(deleteAction).catch(applicationStore.alertUnhandledError);
      },
    });
  }

  requestClearCartConfirmation(): void {
    const applicationStore = this.baseStore.applicationStore;
    const itemCount = this.cartSummary.total_items;

    this.requestCartActionAlert({
      title: 'Clear Cart?',
      message: 'Clear all items?',
      prompt: `This will remove all ${itemCount} item${itemCount === 1 ? '' : 's'} from your cart. This action cannot be undone. Do you want to continue?`,
      proceedLabel: 'Clear All',
      handler: (): void => {
        flowResult(this.clearCart()).catch(
          applicationStore.alertUnhandledError,
        );
      },
    });
  }

  static readonly BUSINESS_REASONS = BUSINESS_REASONS;
}
