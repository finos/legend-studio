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

import type { History } from 'history';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';

type Location = string;
type Address = string;

/**
 * This is an initial attempt to generalize the application navigation to other platforms
 *
 * NOTE: this might **NOT** be the right way to do this. Our intention here is to make
 * app navigator something generic enough so we are somewhat platform-agnostic
 * i.e. browser, electron, PC, UNIX, etc.
 *
 * We should design a more advanced concept `Location` to pass around.
 * Also, we should also generalize Router so it handles more than just
 * URLs. If we make `router` and `navigator` work together, we can potentially generalize
 * application navigation
 *
 * However, this depends on how and when we move to another platform, like `electron` for example
 * See https://github.com/finos/legend-studio/issues/718
 */
interface ApplicationNavigator {
  /**
   * Reload the application using the same address
   */
  reload(): void;

  /**
   * Navigate to the specified location
   *
   * NOTE: this will reload the application
   * so application states will not be preserved
   * after navigation
   */
  goToLocation(
    location: Location,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address
   */
  goToAddress(
    address: Address,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Visit the specified address in a new window
   */
  visitAddress(address: Address): void;

  /**
   * Update the current location
   *
   * NOTE: any navigation actions: reload, go to address, go to location, etc.
   * explicitly updates the current location, this action will just update the
   * location without doing any navigation
   */
  updateCurrentLocation(location: Location): void;
  getCurrentAddress(): Address;
  getCurrentLocation(): Location;
  generateAddress(location: Location): Address;

  /**
   * Block all kinds of navigation, including going to another location,
   * changing address, and native platform navigation (e.g. in web browser, we will
   * block back/forward buttons), etc.
   */
  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
  ): void;
  unblockNavigation(): void;
  get isNavigationBlocked(): boolean;
}

export class WebApplicationNavigator implements ApplicationNavigator {
  private readonly historyAPI: History;
  private _disableLocationUpdate = false;
  private _isNavigationBlocked = false;
  private _forceBypassNavigationBlocking = false;
  private _blockCheckers: (() => boolean)[] = [];
  private _beforeUnloadListener = (event: BeforeUnloadEvent): void => {
    if (this._forceBypassNavigationBlocking) {
      return;
    }
    if (this._blockCheckers.some((checker) => checker())) {
      // NOTE: there is no way to customize the alert message for now since Chrome removed support for it due to security concerns
      // See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#Browser_compatibility
      event.returnValue = '';
    }
  };

  onBlock?: ((onProceed: () => void) => void) | undefined;

  constructor(historyApiClient: History) {
    makeObservable<WebApplicationNavigator, '_isNavigationBlocked'>(this, {
      _isNavigationBlocked: observable,
      isNavigationBlocked: computed,
      blockNavigation: action,
      unblockNavigation: action,
    });

    this.historyAPI = historyApiClient;
  }

  private get window(): Window {
    return guaranteeNonNullable(
      window,
      `Window object is not available in non-web environment`,
    );
  }

  goToLocation(
    location: Location,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.href = this.generateAddress(location);
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  reload(options?: { ignoreBlocking?: boolean | undefined }): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.reload();
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  goToAddress(
    address: Address,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    if (options?.ignoreBlocking) {
      this._forceBypassNavigationBlocking = true;
    }
    const onProceed = (): void => {
      this._forceBypassNavigationBlocking = true; // make sure to not trigger `BeforeUnloadEvent`
      this.window.location.href = address;
    };
    if (
      !this._forceBypassNavigationBlocking &&
      this._blockCheckers.some((checker) => checker())
    ) {
      this.onBlock?.(onProceed);
    } else {
      onProceed();
    }
  }

  visitAddress(address: Address): void {
    this.window.open(address, '_blank');
  }

  updateCurrentLocation(location: Location): void {
    if (!this._disableLocationUpdate) {
      this.historyAPI.push(location);
    }
  }

  getCurrentAddress(): Address {
    return this.window.location.href;
  }

  getCurrentLocation(): Location {
    return this.historyAPI.location.pathname;
  }

  generateAddress(location: Location): string {
    return (
      this.window.location.origin +
      this.historyAPI.createHref({ pathname: location })
    );
  }

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
  ): void {
    this._isNavigationBlocked = true;
    this._disableLocationUpdate = true;
    this.onBlock = onBlock;

    // Here we attempt to cancel the effect of the back button
    // See https://medium.com/codex/angular-guards-disabling-browsers-back-button-for-specific-url-fdf05d9fe155#4f13
    // This makes the current location the last entry in the browser history and clears any forward history
    this.window.history.pushState(null, '', this.getCurrentAddress());
    // The popstate event is triggered every time the user clicks back/forward button, but the forward history
    // has been cleared, and now if we go back, we call `history.forward()`, which go 1 page forward,
    // but there's no page forward, so effectively, the user remains on the same page
    this.window.onpopstate = () => {
      window.history.forward();
    };

    // Block browser navigation: e.g. reload, setting `window.href` directly, etc.
    this._blockCheckers = blockCheckers;
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this.window.addEventListener('beforeunload', this._beforeUnloadListener);
  }

  unblockNavigation(): void {
    this._isNavigationBlocked = false;
    this._disableLocationUpdate = false;
    this.onBlock = undefined;
    this.window.onpopstate = null;
    this._blockCheckers = [];
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
  }

  get isNavigationBlocked(): boolean {
    return this._isNavigationBlocked;
  }
}
