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
} from '@finos/legend-server-marketplace';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { toastManager } from '../../components/Toast/CartToast.js';

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
      if (Object.prototype.hasOwnProperty.call(this.items, vendorProfileId)) {
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
      if (Object.prototype.hasOwnProperty.call(this.items, vendorProfileId)) {
        const cartItems = this.items[Number(vendorProfileId)];
        if (cartItems) {
          const target = cartItems.find((item) => item.cartId === cartId);
          if (target && target.category === TerminalItemType.TERMINAL) {
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

  *addToCartWithAPI(cartItemData: CartItemRequest): GeneratorFn<{
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
      } else {
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
          if (item.skipWorkflow === undefined) {
            item.skipWorkflow = true;
          }
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

  providerToCartRequest(provider: TerminalResult): CartItemRequest {
    return {
      id: provider.id,
      productName: provider.productName,
      providerName: provider.providerName,
      category: provider.category,
      price: provider.price,
      description: provider.description,
      isOwned: provider.isOwned ? 'true' : 'false',
      model: provider.model ?? provider.productName,
      skipWorkflow: provider.skipWorkflow ?? false,
      ...(provider.vendorProfileId !== undefined && {
        vendorProfileId: provider.vendorProfileId,
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
