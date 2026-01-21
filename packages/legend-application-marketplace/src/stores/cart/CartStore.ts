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

import { makeObservable, observable, action, flow, flowResult } from 'mobx';
import {
  LogEvent,
  type GeneratorFn,
  assertErrorThrown,
  ActionState,
} from '@finos/legend-shared';
import {
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
  user = '';
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
      businessReason: observable,
      open: observable,
      cartSummary: observable,
      setOpen: action,
      setUser: action,
      resetUser: action,
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

  setOpen(val: boolean): void {
    this.open = val;
  }

  setUser(val: string): void {
    this.user = val;
  }

  resetUser(): void {
    this.user = this.baseStore.applicationStore.identityService.currentUser;
  }

  setBusinessReason(val: string | undefined): void {
    this.businessReason = val;
  }

  isItemInCart(itemId: number): boolean {
    for (const vendorProfileId in this.items) {
      const cartItems = this.items[Number(vendorProfileId)];
      if (cartItems?.some((item) => item.id === itemId)) {
        return true;
      }
    }
    return false;
  }

  *addToCartWithAPI(cartItemData: CartItemRequest): GeneratorFn<{
    success: boolean;
    recommendations?: TerminalResult[];
    message: string;
  }> {
    const applicationStore = this.baseStore.applicationStore;
    const user = applicationStore.identityService.currentUser;

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

      this.cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          user,
        )) as CartSummary;

      yield flowResult(this.refresh());

      const responseMessage: string = response.message;
      if (!/^2\d\d$/.test(String(response.status_code))) {
        toastManager.warning(responseMessage);
      } else {
        toastManager.success(responseMessage);
      }

      const recommendations: TerminalResult[] =
        response.marketplace_addons ?? response.marketplace_terminals ?? [];

      // Set vendorProfileId and skipWorkflow on each recommendation
      const parentVendorId = response.vendor_profile_id;
      if (parentVendorId && recommendations.length > 0) {
        recommendations.forEach((item) => {
          // Only set vendorProfileId if not already set by backend
          if (!item.vendorProfileId) {
            item.vendorProfileId = parentVendorId;
          }
          // Set skipWorkflow to true if not explicitly set by backend
          // This allows add-ons to bypass workflow validation when added from modal
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
    };
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    try {
      this.refresh();
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
    const applicationStore = this.baseStore.applicationStore;
    this.user = applicationStore.identityService.currentUser;
    if (!this.user) {
      return;
    }

    try {
      this.items = (yield this.baseStore.marketplaceServerClient.getCart(
        this.user,
      )) as Record<number, CartItem[]>;

      this.cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          this.user,
        )) as CartSummary;
    } catch (error) {
      assertErrorThrown(error);
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        `Failed to refresh cart: ${error.message}`,
      );
    }
  }

  *getCartSummary(): GeneratorFn<void> {
    if (!this.user) {
      return;
    }
    try {
      const cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          this.user,
        )) as CartSummary;
      this.cartSummary = cartSummary;
    } catch (error) {
      assertErrorThrown(error);
      this.cartSummary = {
        total_items: 0,
        total_cost: 0,
        formatted_total_cost: '$0.00',
      };
      this.baseStore.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.IDENTITY_AUTO_FETCH__FAILURE),
        `Failed to get cart summary: ${error.message}`,
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
    if (!this.user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.submitState.inProgress();
    try {
      const orderData: OrderDetails = {
        ordered_by: this.baseStore.applicationStore.identityService.currentUser,
        kerberos: this.user,
        order_items: this.items,
        business_justification: this.businessReason,
      };

      yield this.baseStore.marketplaceServerClient.submitOrder(
        this.user,
        orderData,
      );

      this.getCartSummary();

      toastManager.notify('Order created successfully!', 'success');

      this.refresh();
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
    if (!this.user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.clearCart(this.user);
      this.refresh();
      this.getCartSummary();
      toastManager.success('Cart cleared successfully');
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to clear cart: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
    }
  }

  *deleteCartItem(cartId: number): GeneratorFn<void> {
    if (!this.user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.deleteCartItem(
        this.user,
        cartId,
      );

      this.getCartSummary();
      this.refresh();
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
