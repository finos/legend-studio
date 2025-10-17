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

import { makeObservable, observable, action, flow } from 'mobx';
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
    this.refresh();
  }

  setBusinessReason(val: string | undefined): void {
    this.businessReason = val;
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

      this.refresh();

      const responseMessage: string = response.message;
      if (!/^2\d\d$/.test(String(response.status_code))) {
        toastManager.warning(responseMessage);
      } else {
        toastManager.success(responseMessage);
      }

      const recommendations: TerminalResult[] =
        response.marketplace_addons ?? response.marketplace_terminals ?? [];

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
      vendorProfileId: provider.vendorProfileId ?? provider.id,
    };
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }
    this.initState.inProgress();
    try {
      yield* this.refresh();
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
    const user = applicationStore.identityService.currentUser;
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

  *getCartSummary(): GeneratorFn<void> {
    const applicationStore = this.baseStore.applicationStore;
    const user = applicationStore.identityService.currentUser;
    if (!user) {
      return;
    }
    try {
      const cartSummary =
        (yield this.baseStore.marketplaceServerClient.getCartSummary(
          user,
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
    const applicationStore = this.baseStore.applicationStore;
    const user = applicationStore.identityService.currentUser;

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
    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.submitState.inProgress();
    try {
      const orderData: OrderDetails = {
        ordered_by: user,
        kerberos: user,
        order_items: this.items,
        business_justification: this.businessReason,
      };

      yield this.baseStore.marketplaceServerClient.submitOrder(user, orderData);

      yield* this.getCartSummary();

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
    const applicationStore = this.baseStore.applicationStore;
    const user = applicationStore.identityService.currentUser;

    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.clearCart(user);
      this.refresh();
      yield* this.getCartSummary();
      toastManager.success('Cart cleared successfully');
      this.setOpen(false);
      this.loadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      const message = `Failed to clear cart: ${error.message}`;
      toastManager.error(message);
      this.loadingState.fail();
    }
  }

  *deleteCartItem(cartId: number): GeneratorFn<void> {
    const applicationStore = this.baseStore.applicationStore;
    const user = applicationStore.identityService.currentUser;

    if (!user) {
      toastManager.error('User not authenticated');
      return;
    }

    this.loadingState.inProgress();
    try {
      yield this.baseStore.marketplaceServerClient.deleteCartItem(user, cartId);

      yield* this.getCartSummary();
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
