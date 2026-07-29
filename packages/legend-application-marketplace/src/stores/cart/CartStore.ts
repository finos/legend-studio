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
  type GeneratorFn,
  assertErrorThrown,
  ActionState,
} from '@finos/legend-shared';
import {
  TerminalItemType,
  type CartItem,
  type CartItemRequest,
  type CartItemResponse,
  type CartSummary,
  type OrderDetails,
  type TerminalResult,
  type TraderProfile,
  type TraderProfileItem,
  RecommendationSource,
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { toastManager } from '../../components/Toast/CartToast.js';

const boolToString = (val: boolean | undefined): 'true' | 'false' =>
  val ? 'true' : 'false';

enum BUSINESS_REASONS {
  NEW_HIRE = 'New Hire',
  NEW_ROLE = 'New Role',
  USER_MOVE = 'User Move',
  TRANSFER = 'Transfer',
  OTHER_REASON = 'Other Reason',
}

export class CartStore {
  readonly baseStore: LegendMarketplaceBaseStore;

  items: Record<number, CartItem[]> = {};
  targetUser: string | undefined = undefined;
  businessReason: string | undefined = undefined;
  readonly initState = ActionState.create();
  readonly loadingState = ActionState.create();
  readonly submitState = ActionState.create();
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
      open: observable,
      cartSummary: observable,
      cartUser: computed,
      cartItemIds: computed,
      setOpen: action,
      setTargetUser: flow,
      setBusinessReason: action,
      initialize: flow,
      submitOrder: flow,
      refresh: flow,
      clearCart: flow,
      deleteCartItem: flow,
      addToCartWithAPI: flow,
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
          if (target?.category === TerminalItemType.TERMINAL) {
            return cartItems.filter(
              (item) =>
                item.cartId !== cartId &&
                item.category === TerminalItemType.ADD_ON,
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

      const recommendations: TerminalResult[] =
        response.marketplace_addons ?? response.marketplace_terminals ?? [];

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

      this.cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          user,
        )) as CartSummary;
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

  static readonly BUSINESS_REASONS = BUSINESS_REASONS;
}
