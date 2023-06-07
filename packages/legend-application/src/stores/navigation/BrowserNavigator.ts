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
import {
  addQueryParametersToUrl,
  getQueryParameterValue,
  getQueryParameters,
  guaranteeNonNullable,
  sanitizeURL,
  stringifyQueryParams,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type NavigationAddress,
  type NavigationLocation,
  type ApplicationNavigator,
  type NavigationLocationParameterValue,
  type NavigationZone,
  NAVIGATION_ZONE_PREFIX,
} from './NavigationService.js';
import {
  Route,
  Switch,
  Redirect,
  matchPath,
  generatePath,
  useParams,
  useLocation,
} from 'react-router';

export { BrowserRouter } from 'react-router-dom';
export { Route, Switch, Redirect, useParams, matchPath, generatePath };
export const useNavigationZone = (): NavigationZone => {
  const location = useLocation() as { hash: string }; // TODO: this is a temporary hack until we upgrade react-router
  return location.hash.substring(NAVIGATION_ZONE_PREFIX.length);
};
/**
 * This clashes between react-router (older version) and React typings, so this is the workaround
 * We will remove this when we move forward with our react-router upgrade
 * See https://github.com/finos/legend-studio/issues/688
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TEMPORARY__ReactRouterComponentType = any;

/**
 * Prefix URL patterns coming from extensions with `/extensions/`
 * to avoid potential conflicts with main routes.
 */
export const generateExtensionUrlPattern = (pattern: string): string =>
  `/extensions/${pattern}`.replace(/^\/extensions\/\//, '/extensions/');

export class BrowserNavigator implements ApplicationNavigator {
  private readonly historyAPI: History;
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
  onNativePlatformNavigationBlock?: (() => void) | undefined;

  constructor(historyApiClient: History) {
    makeObservable<BrowserNavigator, '_isNavigationBlocked'>(this, {
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
    location: NavigationLocation,
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
    address: NavigationAddress,
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

  visitAddress(address: NavigationAddress): void {
    this.window.open(address, '_blank');
  }

  generateAddress(location: NavigationLocation): string {
    return (
      this.window.location.origin +
      this.historyAPI.createHref({ pathname: location })
    );
  }

  updateCurrentLocation(location: NavigationLocation): void {
    this.historyAPI.push(location);
  }

  updateCurrentZone(zone: NavigationZone): void {
    this.window.location.hash = NAVIGATION_ZONE_PREFIX + zone;
  }

  resetZone(): void {
    this.updateCurrentLocation(this.getCurrentLocation());
  }

  getCurrentBaseAddress(options?: {
    withAppRoot?: boolean | undefined;
  }): NavigationAddress {
    if (options?.withAppRoot) {
      return this.generateAddress('');
    }
    return this.window.location.origin;
  }

  getCurrentAddress(): NavigationAddress {
    return this.window.location.href;
  }

  getCurrentLocation(): NavigationLocation {
    return this.historyAPI.location.pathname;
  }

  getCurrentLocationParameters<
    T extends Record<string, NavigationLocationParameterValue>,
  >(): T {
    const result: Record<string, NavigationLocationParameterValue> = {};
    const parameters = getQueryParameters<
      Record<string, NavigationLocationParameterValue>
    >(sanitizeURL(this.getCurrentAddress()), true);
    Object.keys(parameters).forEach((key) => {
      result[key] = getQueryParameterValue(key, parameters);
    });
    return result as T;
  }

  getCurrentLocationParameterValue(
    key: string,
  ): NavigationLocationParameterValue {
    return this.getCurrentLocationParameters()[key];
  }

  getCurrentZone(): NavigationZone {
    return this.window.location.hash.substring(NAVIGATION_ZONE_PREFIX.length);
  }

  blockNavigation(
    blockCheckers: (() => boolean)[],
    onBlock?: ((onProceed: () => void) => void) | undefined,
    onNativePlatformNavigationBlock?: (() => void) | undefined,
  ): void {
    this._isNavigationBlocked = true;
    this.onBlock = onBlock;
    this.onNativePlatformNavigationBlock = onNativePlatformNavigationBlock;

    // Here we attempt to cancel the effect of the back button
    // See https://medium.com/codex/angular-guards-disabling-browsers-back-button-for-specific-url-fdf05d9fe155#4f13
    // This makes the current location the last entry in the browser history and clears any forward history
    this.window.history.pushState(null, '', this.getCurrentAddress());
    // The popstate event is triggered every time the user clicks back/forward button, but the forward history
    // has been cleared, and now if we go back, we call `history.forward()`, which go 1 page forward,
    // but there's no page forward, so effectively, the user remains on the same page
    this.window.onpopstate = () => {
      window.history.forward();
      this.onNativePlatformNavigationBlock?.();
    };

    // Block browser navigation: e.g. reload, setting `window.href` directly, etc.
    this._blockCheckers = blockCheckers;
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
    this.window.addEventListener('beforeunload', this._beforeUnloadListener);
  }

  unblockNavigation(): void {
    this._isNavigationBlocked = false;
    this.onBlock = undefined;
    this.window.onpopstate = null;
    this._blockCheckers = [];
    this.window.removeEventListener('beforeunload', this._beforeUnloadListener);
  }

  get isNavigationBlocked(): boolean {
    return this._isNavigationBlocked;
  }

  INTERNAL__internalizeTransientParameter(key: string): void {
    const currentZone = this.getCurrentZone();
    const parameters = this.getCurrentLocationParameters();
    delete parameters[key];

    this.updateCurrentLocation(
      addQueryParametersToUrl(
        this.getCurrentLocation(),
        stringifyQueryParams(parameters),
      ),
    );
    this.updateCurrentZone(currentZone);
  }
}
