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
   * Navigate to the specified location
   */
  goToLocation(location: Location): void;

  /**
   * Navigate to the specified location and reload the application
   */
  reloadToLocation(
    location: Location,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void;

  /**
   * Reload the application using the same address
   */
  reload(): void;

  /**
   * Visit the specified address
   *
   * NOTE: unless specified, the visit will be done in a new window
   */
  visitAddress(
    address: Address,
    options?: {
      useSameWindow?: boolean | undefined;
    },
  ): void;

  getCurrentAddress(): Address;
  getCurrentLocation(): Location;
  generateAddress(location: Location): Address;

  /**
   * Disable platform native navigation feature
   *
   * e.g. in web browser, we will block back/forward buttons
   */
  blockPlatformNavigation(blockCheckers: (() => boolean)[]): void;
  unblockPlatformNavigation(): void;
  get isPlatformNavigationBlocked(): boolean;
}

export class WebApplicationNavigator implements ApplicationNavigator {
  private readonly historyAPI: History;
  private _isPlatformNavigationBlocked = false;
  private _forceBypassPlatformNavigationBlocking = false;
  private _blockCheckers: (() => boolean)[] = [];
  private _beforeUnloadListener = (event: BeforeUnloadEvent): void => {
    if (this._forceBypassPlatformNavigationBlocking) {
      return;
    }
    if (this._blockCheckers.some((checker) => checker())) {
      // NOTE: there is no way to customize the alert message for now since Chrome removed support for it due to security concerns
      // See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#Browser_compatibility
      event.returnValue = '';
    }
  };

  notifier?: ((message: string) => void) | undefined;

  constructor(historyApiClient: History) {
    makeObservable<WebApplicationNavigator, '_isPlatformNavigationBlocked'>(
      this,
      {
        _isPlatformNavigationBlocked: observable,
        isPlatformNavigationBlocked: computed,
        blockPlatformNavigation: action,
        unblockPlatformNavigation: action,
      },
    );

    this.historyAPI = historyApiClient;
  }

  private get window(): Window {
    return guaranteeNonNullable(
      window,
      `Window object is not available in non-web environment`,
    );
  }

  goToLocation(location: Location): void {
    this.historyAPI.push(location);
  }

  reloadToLocation(
    location: Location,
    options?: { ignoreBlocking?: boolean | undefined },
  ): void {
    if (options?.ignoreBlocking) {
      this._forceBypassPlatformNavigationBlocking = true;
    }
    // if (
    //   this._isPlatformNavigationBlocked &&
    //   !this._forceBypassPlatformNavigationBlocking
    // ) {
    //   this.notifier
    //   return;
    // }
    this.window.location.href = this.generateAddress(location);
  }

  reload(options?: { ignoreBlocking?: boolean | undefined }): void {
    if (options?.ignoreBlocking) {
      this._forceBypassPlatformNavigationBlocking = true;
    }
    this.window.location.reload();
  }

  visitAddress(
    address: Address,
    options?: {
      useSameWindow?: boolean | undefined;
    },
  ): void {
    if (options?.useSameWindow) {
      this.window.location.href = address;
    } else {
      this.window.open(address, '_blank');
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

  blockPlatformNavigation(blockCheckers: (() => boolean)[]): void {
    this._isPlatformNavigationBlocked = true;

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

  unblockPlatformNavigation(): void {
    this._isPlatformNavigationBlocked = false;
    this.window.onpopstate = null;
    this._blockCheckers = [];
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
  }

  get isPlatformNavigationBlocked(): boolean {
    return this._isPlatformNavigationBlocked;
  }
}
